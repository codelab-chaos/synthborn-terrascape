package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.codelabchaos.terrascape.terrain.TerrainSampler.VisualDetailMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

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
}
