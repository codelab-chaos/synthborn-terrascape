package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainSampler.VisualDetailMode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestParsersTest {

    @Test
    void parseTerrainRequestDecodesPathAndQuery() {
        TerrainRequest r = RequestParsers.parseTerrainRequest(
                "/api/terrain/default%20world/3/-4.glb", "cosmetics=only&visualDetail=all", true);
        assertEquals("default world", r.worldName());
        assertEquals(3, r.chunkX());
        assertEquals(-4, r.chunkZ());
        assertTrue(r.includeDetails());
        assertTrue(r.cosmeticsOnly());
        assertTrue(r.includeCosmetics());
        assertEquals(VisualDetailMode.ALL, r.visualDetailMode());
    }

    @Test
    void parseTerrainRequestWithoutDetailsIgnoresCosmetics() {
        TerrainRequest r = RequestParsers.parseTerrainRequest("/api/terrain/w/0/0.glb", "cosmetics=1", false);
        assertEquals(false, r.includeCosmetics());
        assertEquals(false, r.cosmeticsOnly());
    }

    @Test
    void parseTerrainRequestRejectsBadPaths() {
        assertNull(RequestParsers.parseTerrainRequest("/other", null, true));
        assertNull(RequestParsers.parseTerrainRequest("/api/terrain/w/0/0.png", null, true)); // not .glb
        assertNull(RequestParsers.parseTerrainRequest("/api/terrain/w/x/0.glb", null, true)); // non-int
    }

    @Test
    void parseTerrainMapTileRequest() {
        TerrainMapTileRequest r = RequestParsers.parseTerrainMapTileRequest("/api/terrain/w/3/-4.map.png");
        assertEquals("w", r.worldName());
        assertEquals(3, r.chunkX());
        assertEquals(-4, r.chunkZ());
        assertNull(RequestParsers.parseTerrainMapTileRequest("/api/terrain/w/3/-4.glb"));
    }

    @Test
    void parseMapRegionRequestClampsRadius() {
        MapRegionRequest r = RequestParsers.parseMapRegionRequest("/api/mapregion/world/1/2/999.png", 50);
        assertEquals("world", r.worldName());
        assertEquals(1, r.centerX());
        assertEquals(2, r.centerZ());
        assertEquals(50, r.radius()); // clamped to maxRegionRadius
        assertNull(RequestParsers.parseMapRegionRequest("/api/mapregion/world/1/2.png", 50)); // too few parts
    }

    @Test
    void parseBatchTerrainRequestParsesChunksAndAsset() {
        BatchTerrainRequest r = RequestParsers.parseBatchTerrainRequest(
                "{\"world\":\"w\",\"chunks\":[{\"chunkX\":1,\"chunkZ\":2},{\"chunkX\":-3,\"chunkZ\":4}],\"asset\":\"mesh\"}", 16);
        assertEquals("w", r.worldName());
        assertEquals(2, r.chunks().size());
        assertEquals(1, r.chunks().get(0).chunkX());
        assertEquals("mesh", r.asset());
    }

    @Test
    void parseTerrainRequestCosmeticsFlagWithoutOnly() {
        // includeDetails true + cosmetics=1 (not "only") -> includeCosmetics true via the queryFlag arm (line 67),
        // cosmeticsOnly stays false.
        TerrainRequest r = RequestParsers.parseTerrainRequest("/api/terrain/w/0/0.glb", "cosmetics=1", true);
        assertTrue(r.includeCosmetics());
        assertEquals(false, r.cosmeticsOnly());
    }

    @Test
    void parseTerrainMapTileRequestRejectsBadPaths() {
        assertNull(RequestParsers.parseTerrainMapTileRequest("/other/w/0/0.map.png")); // wrong prefix (line 36)
        assertNull(RequestParsers.parseTerrainMapTileRequest("/api/terrain/w/0/0/extra.map.png")); // too many parts
        assertNull(RequestParsers.parseTerrainMapTileRequest("/api/terrain/w/x/0.map.png")); // non-int chunkX (line 45)
        assertNull(RequestParsers.parseTerrainMapTileRequest("/api/terrain/w/0/y.map.png")); // non-int chunkZ (line 45)
    }

    @Test
    void parseMapRegionRequestRejectsBadPaths() {
        assertNull(RequestParsers.parseMapRegionRequest("/api/mapregion/world/1/2/3.glb", 50)); // not .png (line 76)
        assertNull(RequestParsers.parseMapRegionRequest("/other/world/1/2/3.png", 50)); // wrong prefix (line 76)
        assertNull(RequestParsers.parseMapRegionRequest("/api/mapregion/world/x/2/3.png", 50)); // non-int center (line 86)
        assertNull(RequestParsers.parseMapRegionRequest("/api/mapregion/world/1/2/z.png", 50)); // non-int radius (line 86)
    }

    @Test
    void parseBatchTerrainRequestSkipsNonChunkObjects() {
        // The leading {"world":...} object matches the {..} pattern but lacks chunkX/chunkZ -> skipped (line 102),
        // and the real chunk object is still parsed.
        BatchTerrainRequest r = RequestParsers.parseBatchTerrainRequest(
                "{\"world\":\"w\",\"chunks\":[{\"chunkX\":5,\"chunkZ\":6}],\"asset\":\"map\"}", 16);
        assertEquals("w", r.worldName());
        assertEquals(1, r.chunks().size());
        assertEquals(5, r.chunks().get(0).chunkX());
        assertEquals(6, r.chunks().get(0).chunkZ());
        assertEquals("map", r.asset());
    }

    @Test
    void parseBatchTerrainRequestValidates() {
        assertThrows(IllegalArgumentException.class,
                () -> RequestParsers.parseBatchTerrainRequest("{\"chunks\":[{\"chunkX\":1,\"chunkZ\":2}],\"asset\":\"mesh\"}", 16)); // no world
        assertThrows(IllegalArgumentException.class,
                () -> RequestParsers.parseBatchTerrainRequest("{\"world\":\"w\",\"asset\":\"mesh\"}", 16)); // no chunks
        assertThrows(IllegalArgumentException.class,
                () -> RequestParsers.parseBatchTerrainRequest("{\"world\":\"w\",\"chunks\":[{\"chunkX\":1,\"chunkZ\":2}],\"asset\":\"bad\"}", 16)); // bad asset
        assertThrows(IllegalArgumentException.class,
                () -> RequestParsers.parseBatchTerrainRequest("{\"world\":\"w\",\"chunks\":[{\"chunkX\":1,\"chunkZ\":2},{\"chunkX\":3,\"chunkZ\":4}],\"asset\":\"mesh\"}", 1)); // too large
    }
}
