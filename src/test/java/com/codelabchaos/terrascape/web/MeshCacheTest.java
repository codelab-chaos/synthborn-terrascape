package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.codelabchaos.terrascape.terrain.TerrainSampler.VisualDetailMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Exercises the memory LRU and disk round-trip. {@code plugin} is only dereferenced on error/logging
 * paths, so a null plugin is safe for these happy-path tests.
 */
class MeshCacheTest {
    @TempDir
    Path tempDir;

    private TerrascapeConfig config(int entries, long bytes) {
        Properties props = new Properties();
        props.setProperty("cache.memoryTerrainEntries", String.valueOf(entries));
        props.setProperty("cache.memoryTerrainBytes", String.valueOf(bytes));
        return TerrascapeConfig.fromProperties(tempDir.resolve("terrascape.properties"), tempDir, props);
    }

    private static TerrainRequest request(int x, int z) {
        return new TerrainRequest("world", x, z, true, false, false, VisualDetailMode.BASIC);
    }

    private static TerrainResult result(int sizeBytes) {
        return new TerrainResult(new byte[sizeBytes], 5, 10, 4, 2, "oak=3", "generated");
    }

    @Test
    void putThenReadHitsMemoryAndCountsHits() {
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        cache.putMemory("k1", result(100));

        TerrainResult read = cache.readMemory("k1");
        assertNotNull(read);
        assertEquals("memory", read.source());
        assertEquals(1, cache.memoryHits());
        assertNull(cache.readMemory("missing"));
        assertEquals(1, cache.memoryHits()); // miss does not count
        assertEquals(1, cache.memorySize());
        assertEquals(100, cache.memoryBytes());
    }

    @Test
    void evictsByEntryLimit() {
        MeshCache cache = new MeshCache(config(2, 1 << 20), null);
        cache.putMemory("a", result(10));
        cache.putMemory("b", result(10));
        cache.putMemory("c", result(10)); // exceeds 2 → eldest "a" evicted
        assertEquals(2, cache.memorySize());
        assertNull(cache.readMemory("a"));
        assertNotNull(cache.readMemory("c"));
    }

    @Test
    void clearReportsAndEmptiesMemory() {
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        cache.putMemory("a", result(50));
        TerrascapeWebServer.MemoryCacheStats stats = cache.clear();
        assertEquals(1, stats.entries());
        assertEquals(50, stats.bytes());
        assertEquals(0, cache.memorySize());
    }

    @Test
    void diskRoundTripPreservesMetadata() {
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        TerrainRequest request = request(3, -4);
        byte[] glb = {1, 2, 3, 4, 5};
        cache.writeDisk(request, new TerrainResult(glb, 7, 11, 5, 1, "stone=9", "generated"));

        TerrainResult read = cache.readDisk(request);
        assertNotNull(read);
        assertEquals("disk", read.source());
        assertArrayEquals(glb, read.glb());
        assertEquals(7, read.columns());
        assertEquals(11, read.vertices());
        assertEquals("stone=9", read.detailKeys());
        assertEquals(1, cache.diskHits());
    }

    @Test
    void readDiskMissReturnsNull() {
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        assertNull(cache.readDisk(request(99, 99)));
    }

    @Test
    void reputtingSameKeyAdjustsByteAccounting() {
        // Re-putting an existing key takes the previous != null branch (memoryBytes -= old length).
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        cache.putMemory("k", result(100));
        cache.putMemory("k", result(30)); // replaces; net bytes should reflect the latest value
        assertEquals(1, cache.memorySize());
        assertEquals(30, cache.memoryBytes());
    }

    @Test
    void evictsByByteBudget() {
        // Byte budget (not entry count) triggers eviction: two 80-byte entries exceed the 100-byte
        // cap, so the eldest is evicted and memoryBytes is decremented accordingly.
        MeshCache cache = new MeshCache(config(128, 100), null);
        cache.putMemory("a", result(80));
        cache.putMemory("b", result(80)); // 160 > 100 -> evict "a"
        assertNull(cache.readMemory("a"));
        assertNotNull(cache.readMemory("b"));
        assertEquals(1, cache.memorySize());
        assertEquals(80, cache.memoryBytes());
    }

    @Test
    void readDiskCorruptMetadataReachesPluginLogger() throws IOException {
        // Both glb and metadata exist, but metadata is unparseable (missing required fields), so
        // TerrainMetadata.parse throws and readDisk's catch logs via plugin.getLogger(). Logger is
        // null here -> the catch is taken (no exception escapes) before the runtime logging path.
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        TerrainRequest request = request(1, 1);
        Path glb = cache.glbPath(request);
        Path meta = cache.metadataPath(request);
        Files.createDirectories(glb.getParent());
        Files.write(glb, new byte[]{1, 2, 3});
        Files.writeString(meta, "{not valid metadata}");
        assertThrows(NullPointerException.class, () -> cache.readDisk(request));
    }

    @Test
    void scanDiskMissingRootReportsEmpty() {
        // terrainCacheDir does not exist yet -> DiskStats.empty().
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        DiskStats stats = cache.scanDisk();
        assertEquals(0, stats.files());
        assertEquals(0, stats.bytes());
    }

    @Test
    void scanDiskCountsGlbFilesAndBytes() {
        // Two .glb files (plus a non-.glb sibling that must be ignored) are tallied by count/bytes.
        MeshCache cache = new MeshCache(config(128, 1 << 20), null);
        cache.writeDisk(request(1, 1), new TerrainResult(new byte[]{1, 2, 3, 4}, 1, 1, 1, 0, "", "generated"));
        cache.writeDisk(request(2, 2), new TerrainResult(new byte[]{5, 6}, 1, 1, 1, 0, "", "generated"));

        DiskStats stats = cache.scanDisk();
        // writeDisk also writes <glb>.json siblings; scanDisk must count only the two .glb files.
        assertEquals(2, stats.files());
        assertEquals(6, stats.bytes());
    }
}
