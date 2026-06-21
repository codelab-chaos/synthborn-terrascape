package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class MapTileCacheTest {
    @TempDir
    Path tempDir;

    private TerrascapeConfig config(int entries) {
        Properties props = new Properties();
        props.setProperty("cache.memoryMapTileEntries", String.valueOf(entries));
        return TerrascapeConfig.fromProperties(tempDir.resolve("terrascape.properties"), tempDir, props);
    }

    private static BufferedImage tile() {
        return new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
    }

    @Test
    void keyIncludesTileSize() {
        MapTileCache cache = new MapTileCache(config(1024), null);
        assertEquals("world:" + config(1024).mapView().tileSize() + ":3:-4", cache.key("world", 3, -4));
    }

    @Test
    void memoryPutGetAndEntryEviction() {
        MapTileCache cache = new MapTileCache(config(2), null);
        cache.putMemory("a", tile());
        cache.putMemory("b", tile());
        cache.putMemory("c", tile()); // evict eldest "a"
        assertNull(cache.readMemory("a"));
        assertNotNull(cache.readMemory("c"));
    }

    @Test
    void clearReturnsEvictedCount() {
        MapTileCache cache = new MapTileCache(config(1024), null);
        cache.putMemory("a", tile());
        cache.putMemory("b", tile());
        assertEquals(2, cache.clear());
        assertNull(cache.readMemory("a"));
    }

    @Test
    void imageDiskRoundTripOnHit() {
        // readDisk finds the file at the primary path and never consults the legacy (plugin) path.
        MapTileCache cache = new MapTileCache(config(1024), null);
        cache.writeDisk("world", 1, 1, tile());
        BufferedImage read = cache.readDisk("world", 1, 1);
        assertNotNull(read);
        assertEquals(2, read.getWidth());
        assertEquals(2, read.getHeight());
    }
}
