package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainSampler;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.List;

// Parsed request inputs and lightweight result envelopes for the terrain and map-tile endpoints.
// Pure data + key derivation — no entity, world, or I/O state. Grouped as package-private
// top-level records so the web package references them unqualified.

record TerrainRequest(
        String worldName,
        int chunkX,
        int chunkZ,
        boolean includeDetails,
        boolean includeCosmetics,
        boolean cosmeticsOnly,
        TerrainSampler.VisualDetailMode visualDetailMode
) {
    String key() {
        return worldName + ":" + chunkX + ":" + chunkZ + ":" + includeDetails + ":" + includeCosmetics + ":" + cosmeticsOnly + ":" + visualDetailMode.queryValue();
    }

    boolean hasCosmeticDetails() {
        return includeCosmetics || cosmeticsOnly;
    }

    String cacheLayer() {
        if (cosmeticsOnly) {
            return "surface-cosmetics-only-" + visualDetailMode.queryValue();
        }
        if (includeDetails) {
            return includeCosmetics ? "surface-details-cosmetics-" + visualDetailMode.queryValue() : "surface-details";
        }
        return "surface";
    }
}

record MapRegionRequest(String worldName, int centerX, int centerZ, int radius) {
    String key(int tileSize) {
        return worldName + ":" + tileSize + ":" + centerX + ":" + centerZ + ":" + radius;
    }
}

record MapRegionResult(byte[] bytes, String source) {
    MapRegionResult withSource(@Nonnull String source) {
        return new MapRegionResult(bytes, source);
    }
}

record MapRegionGeneration(byte[] bytes, boolean complete) {
}

record TerrainMapTileRequest(String worldName, int chunkX, int chunkZ) {
    String key() {
        return worldName + ":" + chunkX + ":" + chunkZ;
    }
}

record MapTileTerrainResult(byte[] png, String source) {
}

record BatchMapTileResult(int chunkX, int chunkZ, @Nullable MapTileTerrainResult tile, @Nullable String error) {
}

record BatchTerrainRequest(String worldName, List<ChunkCoord> chunks, String asset) {
    boolean mapAsset() {
        return "map".equalsIgnoreCase(asset);
    }
}

record ChunkCoord(int chunkX, int chunkZ) {
}
