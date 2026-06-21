package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainDetail;
import com.codelabchaos.terrascape.terrain.TerrainMesh;
import com.codelabchaos.terrascape.terrain.TerrainSnapshot;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.codelabchaos.terrascape.web.Json.escapeJson;
import static com.codelabchaos.terrascape.web.Json.findInt;

// Generated-terrain result envelopes and on-disk metadata for /api/terrain.
// Grouped as package-private top-level types so the web package references them unqualified.

record TerrainResult(byte[] glb, int columns, int vertices, int triangles, int details, String detailKeys, String source) {
    static TerrainResult generated(TerrainSnapshot snapshot, TerrainMesh mesh, byte[] glb) {
        int details = mesh.detail().vertexCount() == 0 ? 0 : snapshot.details().length;
        return new TerrainResult(
                glb,
                snapshot.nonEmptyColumns(),
                mesh.vertexCount(),
                mesh.triangleCount(),
                details,
                detailKeySummary(snapshot.details()),
                "generated");
    }

    TerrainResult withSource(@Nonnull String source) {
        return new TerrainResult(glb, columns, vertices, triangles, details, detailKeys, source);
    }

    String metadataJson(@Nonnull String formatVersion) {
        return "{\"format\":\"" + escapeJson(formatVersion) + "\""
                + ",\"columns\":" + columns
                + ",\"vertices\":" + vertices
                + ",\"triangles\":" + triangles
                + ",\"details\":" + details
                + ",\"detailKeys\":\"" + escapeJson(detailKeys) + "\""
                + "}";
    }

    private static String detailKeySummary(@Nonnull TerrainDetail[] details) {
        Map<String, Long> counts = Arrays.stream(details)
                .map(TerrainDetail::blockKey)
                .filter(key -> key != null && !key.isBlank())
                .collect(Collectors.groupingBy(
                        TerrainResult::compactDetailKey,
                        LinkedHashMap::new,
                        Collectors.counting()));
        if (counts.isEmpty()) {
            return "";
        }
        String summary = counts.entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(24)
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("|"));
        return summary.length() <= 1600 ? summary : summary.substring(0, 1600);
    }

    private static String compactDetailKey(@Nonnull String blockKey) {
        String key = blockKey
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replace('|', '/')
                .replace('=', ':')
                .trim();
        int slash = key.lastIndexOf('/');
        if (slash >= 0 && slash < key.length() - 1) {
            key = key.substring(slash + 1);
        }
        return key.length() <= 80 ? key : key.substring(0, 80);
    }
}

record BatchTerrainResult(int chunkX, int chunkZ, TerrainResult terrain, String error) {
}

record TerrainBatchSummary(
        int ok,
        int errors,
        int generated,
        int disk,
        int memory,
        long bytes,
        long columns,
        long vertices,
        long triangles,
        long details) {
}

record TerrainMetadata(int columns, int vertices, int triangles, int details, String detailKeys) {
    private static final Pattern COLUMNS_PATTERN = Pattern.compile("\"columns\"\\s*:\\s*(-?\\d+)");
    private static final Pattern VERTICES_PATTERN = Pattern.compile("\"vertices\"\\s*:\\s*(-?\\d+)");
    private static final Pattern TRIANGLES_PATTERN = Pattern.compile("\"triangles\"\\s*:\\s*(-?\\d+)");
    private static final Pattern DETAILS_META_PATTERN = Pattern.compile("\"details\"\\s*:\\s*(-?\\d+)");
    private static final Pattern DETAIL_KEYS_PATTERN = Pattern.compile("\"detailKeys\"\\s*:\\s*\"([^\"]*)\"");

    static TerrainMetadata parse(@Nonnull String json) {
        return new TerrainMetadata(
                findInt(COLUMNS_PATTERN, json, "columns"),
                findInt(VERTICES_PATTERN, json, "vertices"),
                findInt(TRIANGLES_PATTERN, json, "triangles"),
                findInt(DETAILS_META_PATTERN, json, "details"),
                unescapeMetadataString(findOptionalString(DETAIL_KEYS_PATTERN, json)));
    }

    private static String findOptionalString(@Nonnull Pattern pattern, @Nonnull String body) {
        Matcher matcher = pattern.matcher(body);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static String unescapeMetadataString(@Nullable String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\\"", "\"").replace("\\\\", "\\");
    }
}

record DiskStats(long files, long bytes) {
    static DiskStats empty() {
        return new DiskStats(0, 0);
    }
}
