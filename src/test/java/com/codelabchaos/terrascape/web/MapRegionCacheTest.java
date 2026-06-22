package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
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

    @Test
    void reputtingSameKeyAdjustsByteAccountingAndKeepsLatest() {
        // Re-putting the same key takes the previous != null branch (memoryBytes -= previous.length)
        // and the new value wins; a single small byte budget must not evict the lone live entry.
        Properties props = new Properties();
        props.setProperty("cache.memoryMapRegionEntries", "16");
        props.setProperty("cache.memoryMapRegionBytes", "100");
        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve("terrascape.properties"), tempDir, props);
        MapRegionCache cache = new MapRegionCache(config, null);

        cache.putMemory("k", new byte[]{1, 2, 3, 4});
        cache.putMemory("k", new byte[]{9, 9}); // replaces; previous length subtracted
        assertArrayEquals(new byte[]{9, 9}, cache.readMemory("k"));
    }

    @Test
    void byteBudgetEvictsEldestEntries() {
        // Drive evict() via the byte budget (not the entry count): 3x 40-byte entries exceed the
        // 100-byte cap, so the eldest is removed and memoryBytes is decremented by its length.
        Properties props = new Properties();
        props.setProperty("cache.memoryMapRegionEntries", "100");
        props.setProperty("cache.memoryMapRegionBytes", "100");
        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve("terrascape.properties"), tempDir, props);
        MapRegionCache cache = new MapRegionCache(config, null);

        cache.putMemory("a", new byte[40]);
        cache.putMemory("b", new byte[40]);
        cache.putMemory("c", new byte[40]); // 120 > 100 -> evict eldest "a"
        assertNull(cache.readMemory("a"));
        assertNotNull(cache.readMemory("b"));
        assertNotNull(cache.readMemory("c"));
    }

    // Note: the readDisk IOException catch (plugin logging on a corrupt entry) requires a path that
    // passes Files.isRegularFile yet fails Files.readAllBytes. A directory fails isRegularFile (so
    // readDisk returns null before the read), and no portable way exists to make a regular file
    // unreadable here, so that catch is left uncovered rather than faked.

    @Test
    void writeDiskFailureReachesPluginLogger() throws IOException {
        // Force createDirectories/write to fail by occupying a parent path segment with a file, so
        // the WARNING branch (plugin.getLogger()) is taken. Logger is null -> documented boundary.
        MapRegionCache cache = new MapRegionCache(config(16), null);
        MapRegionRequest request = new MapRegionRequest("world", 1, 2, 3);
        Path output = cache.outputPath(request);
        // Create a regular file where the output's parent directory needs to be.
        Files.createDirectories(output.getParent().getParent());
        Files.write(output.getParent(), new byte[]{0}); // parent is now a file -> createDirectories fails
        assertThrows(NullPointerException.class, () -> cache.writeDisk(request, new byte[]{1, 2}));
    }
}
