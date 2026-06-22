package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Memory LRU plus the on-disk terrain map-tile store. The legacy (plugin data dir) path and the
 * write-failure WARNING logs dereference {@code plugin}; with a null plugin they are runtime
 * concerns, so disk tests keep the primary terrain file present so the legacy branch is never
 * reached. One test asserts that boundary explicitly.
 */
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

    @Test
    void writeDiskCreatesFileUnderTerrainCacheDir() throws IOException {
        // writeDisk builds the primary terrain path from config (no plugin) and creates parents.
        TerrascapeConfig config = config(1024);
        MapTileCache cache = new MapTileCache(config, null);
        cache.writeDisk("over world", 5, -7, tile());

        Path expected = config.folders().terrainCacheDir()
                .resolve(config.mesh().terrainFormatVersion())
                .resolve(QueryParams.safeName("over world"))
                .resolve("map")
                .resolve("5_-7.png");
        assertTrue(Files.isRegularFile(expected));
        assertTrue(Files.size(expected) > 0);
    }

    @Test
    void terrainDiskWritePlacesFileDeterministically() throws IOException {
        TerrascapeConfig config = config(1024);
        MapTileCache cache = new MapTileCache(config, null);
        TerrainMapTileRequest request = new TerrainMapTileRequest("nether", -1, -2);
        byte[] png = {1, 2, 3, 4};
        cache.writeTerrainDisk(request, png);

        Path expected = config.folders().terrainCacheDir()
                .resolve(config.mesh().terrainFormatVersion())
                .resolve(QueryParams.safeName("nether"))
                .resolve("map")
                .resolve("-1_-2.png");
        assertArrayEquals(png, Files.readAllBytes(expected));
    }

    @Test
    void readDiskMissReachesLegacyPluginPath() {
        // With the primary terrain tile absent, readDisk falls back to legacyMapTileOutputPath,
        // which dereferences plugin.terrascapeDir(). A real plugin is engine-bound and cannot be
        // constructed in a unit test, so this fallback is a runtime concern; we assert the boundary.
        MapTileCache cache = new MapTileCache(config(1024), null);
        assertThrows(NullPointerException.class, () -> cache.readDisk("missing", 9, 9));
    }

    @Test
    void readTerrainDiskReachesLegacyPluginPath() {
        // readTerrainDisk builds its candidate list eagerly as List.of(primary, legacy); the legacy
        // entry dereferences plugin.terrascapeDir() while the list is constructed, so this NPEs
        // regardless of whether a primary file exists. A real plugin is engine-bound (see
        // AssetLocatorTest), so readTerrainDisk is a runtime concern; we assert the boundary.
        MapTileCache cache = new MapTileCache(config(1024), null);
        assertThrows(NullPointerException.class,
                () -> cache.readTerrainDisk(new TerrainMapTileRequest("missing", 4, 4)));
    }
}
