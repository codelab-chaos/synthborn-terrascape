package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainSampler.VisualDetailMode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebRequestsTest {

    private static TerrainRequest request(boolean details, boolean cosmetics, boolean cosmeticsOnly, VisualDetailMode mode) {
        return new TerrainRequest("world one", -2, 7, details, cosmetics, cosmeticsOnly, mode);
    }

    @Test
    void terrainRequestKeyIncludesEveryDiscriminator() {
        assertEquals("world one:-2:7:true:false:false:all",
                request(true, false, false, VisualDetailMode.ALL).key());
    }

    @Test
    void terrainRequestHasCosmeticDetails() {
        assertFalse(request(true, false, false, VisualDetailMode.BASIC).hasCosmeticDetails());
        assertTrue(request(true, true, false, VisualDetailMode.BASIC).hasCosmeticDetails());
        assertTrue(request(false, false, true, VisualDetailMode.BASIC).hasCosmeticDetails());
    }

    @Test
    void terrainRequestCacheLayerReflectsMode() {
        assertEquals("surface", request(false, false, false, VisualDetailMode.BASIC).cacheLayer());
        assertEquals("surface-details", request(true, false, false, VisualDetailMode.BASIC).cacheLayer());
        assertEquals("surface-details-cosmetics-all", request(true, true, false, VisualDetailMode.ALL).cacheLayer());
        assertEquals("surface-cosmetics-only-structures", request(false, false, true, VisualDetailMode.STRUCTURES).cacheLayer());
    }

    @Test
    void mapRegionRequestKeyIncludesTileSize() {
        assertEquals("world:32:1:2:5", new MapRegionRequest("world", 1, 2, 5).key(32));
    }

    @Test
    void mapRegionResultWithSourceReplacesSourceOnly() {
        byte[] bytes = {1, 2, 3};
        MapRegionResult result = new MapRegionResult(bytes, "memory").withSource("disk");
        assertEquals("disk", result.source());
        assertEquals(bytes, result.bytes());
    }

    @Test
    void terrainMapTileRequestKey() {
        assertEquals("world:3:-4", new TerrainMapTileRequest("world", 3, -4).key());
    }

    @Test
    void batchTerrainRequestDetectsMapAsset() {
        assertTrue(new BatchTerrainRequest("w", List.of(new ChunkCoord(0, 0)), "MAP").mapAsset());
        assertFalse(new BatchTerrainRequest("w", List.of(), "glb").mapAsset());
    }

    @Test
    void mapRegionGenerationExposesBytesAndCompletion() {
        byte[] bytes = {7, 8};
        MapRegionGeneration gen = new MapRegionGeneration(bytes, true);
        assertEquals(bytes, gen.bytes());
        assertTrue(gen.complete());
        assertFalse(new MapRegionGeneration(new byte[0], false).complete());
    }

    @Test
    void mapTileTerrainResultExposesPngAndSource() {
        byte[] png = {1};
        MapTileTerrainResult result = new MapTileTerrainResult(png, "disk");
        assertEquals(png, result.png());
        assertEquals("disk", result.source());
    }

    @Test
    void batchMapTileResultCarriesTileOrError() {
        MapTileTerrainResult tile = new MapTileTerrainResult(new byte[]{1}, "memory");
        BatchMapTileResult ok = new BatchMapTileResult(2, 3, tile, null);
        assertEquals(2, ok.chunkX());
        assertEquals(3, ok.chunkZ());
        assertEquals(tile, ok.tile());

        BatchMapTileResult failed = new BatchMapTileResult(4, 5, null, "boom");
        assertEquals("boom", failed.error());
    }
}
