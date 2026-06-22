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
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;

import static com.codelabchaos.terrascape.web.QueryParams.safeName;

/**
 * Two-tier cache for generated terrain GLBs: a size/byte-bounded in-memory LRU backed by an
 * on-disk store under the terrain cache folder. Owns the cache hit counters so callers just ask
 * for a result and check for null.
 */
final class MeshCache {
    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;

    private final Object lock = new Object();
    private final LinkedHashMap<String, TerrainResult> memory = new LinkedHashMap<>(32, 0.75f, true);
    private long memoryBytes;
    private final AtomicLong memoryHitCount = new AtomicLong();
    private final AtomicLong diskHitCount = new AtomicLong();

    MeshCache(@Nonnull TerrascapeConfig config, @Nonnull TerrascapePlugin plugin) {
        this.config = config;
        this.plugin = plugin;
    }

    Path glbPath(@Nonnull TerrainRequest request) {
        String safeWorld = safeName(request.worldName());
        return config.folders().terrainCacheDir()
                .resolve(config.mesh().terrainFormatVersion())
                .resolve(safeWorld)
                .resolve(request.cacheLayer())
                .resolve(request.chunkX() + "_" + request.chunkZ() + ".glb");
    }

    Path metadataPath(@Nonnull TerrainRequest request) {
        return Path.of(glbPath(request).toString() + ".json");
    }

    @Nullable
    TerrainResult readMemory(@Nonnull String key) {
        synchronized (lock) {
            TerrainResult result = memory.get(key);
            if (result != null) {
                memoryHitCount.incrementAndGet();
            }
            return result;
        }
    }

    void putMemory(@Nonnull String key, @Nonnull TerrainResult result) {
        synchronized (lock) {
            TerrainResult previous = memory.put(key, result.withSource("memory"));
            if (previous != null) {
                memoryBytes -= previous.glb().length;
            }
            memoryBytes += result.glb().length;
            evict();
        }
    }

    private void evict() {
        while ((memory.size() > config.cache().memoryTerrainEntries()
                || memoryBytes > config.cache().memoryTerrainBytes())
                && !memory.isEmpty()) {
            Map.Entry<String, TerrainResult> eldest = memory.entrySet().iterator().next();
            memoryBytes -= eldest.getValue().glb().length;
            memory.remove(eldest.getKey());
        }
    }

    int memorySize() {
        synchronized (lock) {
            return memory.size();
        }
    }

    long memoryBytes() {
        synchronized (lock) {
            return memoryBytes;
        }
    }

    long memoryHits() {
        return memoryHitCount.get();
    }

    long diskHits() {
        return diskHitCount.get();
    }

    @Nullable
    TerrainResult readDisk(@Nonnull TerrainRequest request) {
        Path glbPath = glbPath(request);
        Path metadataPath = metadataPath(request);
        if (!Files.isRegularFile(glbPath) || !Files.isRegularFile(metadataPath)) {
            return null;
        }

        try {
            byte[] glb = Files.readAllBytes(glbPath);
            TerrainMetadata metadata = TerrainMetadata.parse(Files.readString(metadataPath));
            diskHitCount.incrementAndGet();
            return new TerrainResult(glb, metadata.columns(), metadata.vertices(), metadata.triangles(),
                    metadata.details(), metadata.detailKeys(), "disk");
        } catch (Exception e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid terrain cache entry " + glbPath + ": " + e.getMessage());
            return null;
        }
    }

    void writeDisk(@Nonnull TerrainRequest request, @Nonnull TerrainResult result) {
        Path glbPath = glbPath(request);
        Path metadataPath = metadataPath(request);
        try {
            Files.createDirectories(glbPath.getParent());
            Files.write(glbPath, result.glb());
            Files.writeString(metadataPath, result.metadataJson(config.mesh().terrainFormatVersion()));
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write terrain cache entry " + glbPath);
        }
    }

    TerrascapeWebServer.MemoryCacheStats clear() {
        synchronized (lock) {
            TerrascapeWebServer.MemoryCacheStats stats =
                    new TerrascapeWebServer.MemoryCacheStats(memory.size(), memoryBytes);
            memory.clear();
            memoryBytes = 0;
            return stats;
        }
    }

    DiskStats scanDisk() {
        Path root = config.folders().terrainCacheDir().toAbsolutePath().normalize();
        if (!Files.exists(root)) {
            return DiskStats.empty();
        }

        long files = 0;
        long bytes = 0;
        try (var paths = Files.walk(root)) {
            for (Path path : paths.toList()) {
                if (Files.isRegularFile(path) && path.getFileName().toString().endsWith(".glb")) {
                    files++;
                    bytes += Files.size(path);
                }
            }
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Failed to scan terrain disk cache: " + e.getMessage());
        }
        return new DiskStats(files, bytes);
    }
}
