package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.config.TerrascapeConfig;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.logging.Level;

import static com.codelabchaos.terrascape.web.QueryParams.safeName;

/**
 * Per-chunk map-tile cache: an entry-bounded in-memory LRU of decoded {@link BufferedImage}s plus
 * an on-disk PNG store (with a legacy path fallback for tiles written by older versions).
 */
final class MapTileCache {
    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;

    private final Object lock = new Object();
    private final LinkedHashMap<String, BufferedImage> memory = new LinkedHashMap<>(1024, 0.75f, true);

    MapTileCache(@Nonnull TerrascapeConfig config, @Nonnull TerrascapePlugin plugin) {
        this.config = config;
        this.plugin = plugin;
    }

    String key(@Nonnull String worldName, int chunkX, int chunkZ) {
        return worldName + ":" + config.mapView().tileSize() + ":" + chunkX + ":" + chunkZ;
    }

    @Nullable
    BufferedImage readMemory(@Nonnull String key) {
        synchronized (lock) {
            return memory.get(key);
        }
    }

    void putMemory(@Nonnull String key, @Nonnull BufferedImage tile) {
        synchronized (lock) {
            memory.put(key, tile);
            while (memory.size() > config.cache().memoryMapTileEntries() && !memory.isEmpty()) {
                String eldest = memory.keySet().iterator().next();
                memory.remove(eldest);
            }
        }
    }

    int clear() {
        synchronized (lock) {
            int entries = memory.size();
            memory.clear();
            return entries;
        }
    }

    private Path terrainMapTilePath(@Nonnull String worldName, int chunkX, int chunkZ) {
        return config.folders().terrainCacheDir()
                .resolve(config.mesh().terrainFormatVersion())
                .resolve(safeName(worldName))
                .resolve("map")
                .resolve(chunkX + "_" + chunkZ + ".png");
    }

    private Path legacyMapTileOutputPath(@Nonnull String worldName, int chunkX, int chunkZ) {
        return plugin.terrascapeDir()
                .resolve("map-tile")
                .resolve("tile-" + config.mapView().tileSize())
                .resolve(safeName(worldName))
                .resolve(chunkX + "_" + chunkZ + ".png");
    }

    @Nullable
    byte[] readTerrainDisk(@Nonnull TerrainMapTileRequest request) {
        for (Path path : List.of(
                terrainMapTilePath(request.worldName(), request.chunkX(), request.chunkZ()),
                legacyMapTileOutputPath(request.worldName(), request.chunkX(), request.chunkZ()))) {
            if (!Files.isRegularFile(path)) {
                continue;
            }
            try {
                return Files.readAllBytes(path);
            } catch (IOException e) {
                plugin.getLogger().at(Level.FINE).log("Ignoring invalid terrain map-tile cache entry " + path + ": " + e.getMessage());
            }
        }
        return null;
    }

    void writeTerrainDisk(@Nonnull TerrainMapTileRequest request, byte[] png) {
        Path path = terrainMapTilePath(request.worldName(), request.chunkX(), request.chunkZ());
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, png);
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write terrain map-tile cache entry " + path);
        }
    }

    @Nullable
    BufferedImage readDisk(@Nonnull String worldName, int chunkX, int chunkZ) {
        Path path = terrainMapTilePath(worldName, chunkX, chunkZ);
        if (!Files.isRegularFile(path)) {
            path = legacyMapTileOutputPath(worldName, chunkX, chunkZ);
        }
        if (!Files.isRegularFile(path)) {
            return null;
        }
        try {
            return ImageIO.read(path.toFile());
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid map-tile cache entry " + path + ": " + e.getMessage());
            return null;
        }
    }

    void writeDisk(@Nonnull String worldName, int chunkX, int chunkZ, @Nonnull BufferedImage tile) {
        Path path = terrainMapTilePath(worldName, chunkX, chunkZ);
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, MapTilePngEncoder.encode(tile));
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write map-tile cache entry " + path);
        }
    }
}
