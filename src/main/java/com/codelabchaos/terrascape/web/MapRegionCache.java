package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.config.TerrascapeConfig;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;

import static com.codelabchaos.terrascape.web.QueryParams.safeName;

/**
 * Size/byte-bounded in-memory LRU plus on-disk store for stitched map-region PNGs, keyed by
 * world + tile size + center + radius.
 */
final class MapRegionCache {
    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;

    private final Object lock = new Object();
    private final LinkedHashMap<String, byte[]> memory = new LinkedHashMap<>(16, 0.75f, true);
    private long memoryBytes;

    MapRegionCache(@Nonnull TerrascapeConfig config, @Nonnull TerrascapePlugin plugin) {
        this.config = config;
        this.plugin = plugin;
    }

    Path outputPath(@Nonnull MapRegionRequest request) {
        return config.folders().mapRegionCacheDir()
                .resolve("tile-" + config.mapView().tileSize())
                .resolve(safeName(request.worldName()))
                .resolve("r" + request.radius())
                .resolve(request.centerX() + "_" + request.centerZ() + ".png");
    }

    @Nullable
    byte[] readMemory(@Nonnull String key) {
        synchronized (lock) {
            return memory.get(key);
        }
    }

    void putMemory(@Nonnull String key, byte[] bytes) {
        synchronized (lock) {
            byte[] previous = memory.put(key, bytes);
            if (previous != null) {
                memoryBytes -= previous.length;
            }
            memoryBytes += bytes.length;
            evict();
        }
    }

    private void evict() {
        while ((memory.size() > config.cache().memoryMapRegionEntries()
                || memoryBytes > config.cache().memoryMapRegionBytes())
                && !memory.isEmpty()) {
            Map.Entry<String, byte[]> eldest = memory.entrySet().iterator().next();
            memoryBytes -= eldest.getValue().length;
            memory.remove(eldest.getKey());
        }
    }

    @Nullable
    byte[] readDisk(@Nonnull MapRegionRequest request) {
        Path path = outputPath(request);
        if (!Files.isRegularFile(path)) {
            return null;
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid map-region cache entry " + path + ": " + e.getMessage());
            return null;
        }
    }

    void writeDisk(@Nonnull MapRegionRequest request, byte[] bytes) {
        Path path = outputPath(request);
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, bytes);
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write map-region cache entry " + path);
        }
    }
}
