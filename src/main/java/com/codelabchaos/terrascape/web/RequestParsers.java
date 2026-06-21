package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainSampler;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.codelabchaos.terrascape.web.Json.findInt;
import static com.codelabchaos.terrascape.web.Json.findString;
import static com.codelabchaos.terrascape.web.QueryParams.decode;
import static com.codelabchaos.terrascape.web.QueryParams.queryFlag;
import static com.codelabchaos.terrascape.web.QueryParams.queryParam;

/**
 * Pure parsing of request URLs and JSON bodies into the {@link WebRequests} DTOs. No world, entity,
 * or config state — radius clamping is passed in so the whole class is unit-testable.
 */
final class RequestParsers {
    private static final Pattern WORLD_PATTERN = Pattern.compile("\"world\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern CHUNK_OBJECT_PATTERN = Pattern.compile("\\{[^{}]*}");
    private static final Pattern CHUNK_X_PATTERN = Pattern.compile("\"chunkX\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_Z_PATTERN = Pattern.compile("\"chunkZ\"\\s*:\\s*(-?\\d+)");
    private static final Pattern ASSET_PATTERN = Pattern.compile("\"asset\"\\s*:\\s*\"([^\"]+)\"");

    private RequestParsers() {
    }

    @Nullable
    static TerrainMapTileRequest parseTerrainMapTileRequest(@Nonnull String path) {
        String prefix = "/api/terrain/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String[] parts = path.substring(prefix.length()).split("/");
        if (parts.length != 3 || !parts[2].endsWith(".map.png")) {
            return null;
        }
        Integer chunkX = parseInt(parts[1]);
        Integer chunkZ = parseInt(parts[2].substring(0, parts[2].length() - ".map.png".length()));
        if (chunkX == null || chunkZ == null) {
            return null;
        }
        return new TerrainMapTileRequest(decode(parts[0]), chunkX, chunkZ);
    }

    @Nullable
    static TerrainRequest parseTerrainRequest(@Nonnull String path, @Nullable String rawQuery, boolean includeDetails) {
        String prefix = "/api/terrain/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String[] parts = path.substring(prefix.length()).split("/");
        if (parts.length != 3 || !parts[2].endsWith(".glb")) {
            return null;
        }
        Integer chunkX = parseInt(parts[1]);
        Integer chunkZ = parseInt(parts[2].substring(0, parts[2].length() - 4));
        if (chunkX == null || chunkZ == null) {
            return null;
        }
        String cosmeticsParam = queryParam(rawQuery, "cosmetics");
        boolean cosmeticsOnly = includeDetails && "only".equalsIgnoreCase(cosmeticsParam);
        boolean includeCosmetics = includeDetails && (cosmeticsOnly || queryFlag(rawQuery, "cosmetics"));
        TerrainSampler.VisualDetailMode visualDetailMode = TerrainSampler.VisualDetailMode.fromQuery(queryParam(rawQuery, "visualDetail"));
        return new TerrainRequest(decode(parts[0]), chunkX, chunkZ, includeDetails, includeCosmetics, cosmeticsOnly, visualDetailMode);
    }

    @Nullable
    static MapRegionRequest parseMapRegionRequest(@Nonnull String path, int maxRegionRadius) {
        String prefix = "/api/mapregion/";
        if (!path.startsWith(prefix) || !path.endsWith(".png")) {
            return null;
        }
        String[] parts = path.substring(prefix.length(), path.length() - ".png".length()).split("/");
        if (parts.length != 4) {
            return null;
        }
        Integer centerX = parseInt(parts[1]);
        Integer centerZ = parseInt(parts[2]);
        Integer radius = parseInt(parts[3]);
        if (centerX == null || centerZ == null || radius == null) {
            return null;
        }
        return new MapRegionRequest(
                decode(parts[0]),
                centerX,
                centerZ,
                Math.max(0, Math.min(maxRegionRadius, radius)));
    }

    static BatchTerrainRequest parseBatchTerrainRequest(@Nonnull String body, int maxBatchChunks) {
        String worldName = findString(WORLD_PATTERN, body, "world");
        List<ChunkCoord> chunks = new ArrayList<>();
        Matcher matcher = CHUNK_OBJECT_PATTERN.matcher(body);
        while (matcher.find()) {
            String object = matcher.group();
            if (!CHUNK_X_PATTERN.matcher(object).find() || !CHUNK_Z_PATTERN.matcher(object).find()) {
                continue;
            }
            if (chunks.size() >= maxBatchChunks) {
                throw new IllegalArgumentException("batch_too_large_max_" + maxBatchChunks);
            }
            chunks.add(new ChunkCoord(
                    findInt(CHUNK_X_PATTERN, object, "chunkX"),
                    findInt(CHUNK_Z_PATTERN, object, "chunkZ")));
        }
        if (chunks.isEmpty()) {
            throw new IllegalArgumentException("chunks_required");
        }
        String asset = findString(ASSET_PATTERN, body, "asset");
        if (asset == null || asset.isBlank()) {
            throw new IllegalArgumentException("asset_required");
        }
        if (!"mesh".equalsIgnoreCase(asset) && !"map".equalsIgnoreCase(asset)) {
            throw new IllegalArgumentException("asset_must_be_mesh_or_map");
        }
        return new BatchTerrainRequest(worldName, chunks, asset);
    }

    @Nullable
    private static Integer parseInt(@Nonnull String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
