package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class MapRegionCacheTest {
    @TempDir
    Path tempDir;

    private TerrascapeConfig config(int entries) {
        Properties props = new Properties();
        props.setProperty("cache.memoryMapRegionEntries", String.valueOf(entries));
        return TerrascapeConfig.fromProperties(tempDir.resolve("terrascape.properties"), tempDir, props);
    }

    @Test
    void memoryPutGetAndEntryEviction() {
        MapRegionCache cache = new MapRegionCache(config(2), null);
        cache.putMemory("a", new byte[]{1});
        cache.putMemory("b", new byte[]{2});
        cache.putMemory("c", new byte[]{3}); // evict eldest "a"
        assertNull(cache.readMemory("a"));
        assertNotNull(cache.readMemory("b"));
        assertNotNull(cache.readMemory("c"));
    }

    @Test
    void diskRoundTrip() {
        MapRegionCache cache = new MapRegionCache(config(16), null);
        MapRegionRequest request = new MapRegionRequest("world", 1, 2, 3);
        byte[] png = {8, 6, 7, 5, 3, 0, 9};
        cache.writeDisk(request, png);

        byte[] read = cache.readDisk(request);
        assertArrayEquals(png, read);
    }

    @Test
    void readDiskMissReturnsNull() {
        MapRegionCache cache = new MapRegionCache(config(16), null);
        assertNull(cache.readDisk(new MapRegionRequest("world", 9, 9, 9)));
    }

    @Test
    void outputPathIsDeterministic() {
        MapRegionCache cache = new MapRegionCache(config(16), null);
        MapRegionRequest request = new MapRegionRequest("world", 1, 2, 3);
        assertEquals(cache.outputPath(request), cache.outputPath(request));
    }
}
