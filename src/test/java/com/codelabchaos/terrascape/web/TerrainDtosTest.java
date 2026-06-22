package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainColumn;
import com.codelabchaos.terrascape.terrain.TerrainDetail;
import com.codelabchaos.terrascape.terrain.TerrainMesh;
import com.codelabchaos.terrascape.terrain.TerrainSnapshot;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainDtosTest {

    private static TerrainMesh.TerrainPart part(int vertices, int triangles) {
        return new TerrainMesh.TerrainPart("p", new float[0], new float[0], new int[0], vertices, triangles);
    }

    @Test
    void metadataJsonRoundTripsThroughParse() {
        TerrainResult result = new TerrainResult(new byte[0], 5, 10, 4, 2, "oak_plank=3|stone=2", "generated");
        TerrainMetadata parsed = TerrainMetadata.parse(result.metadataJson("v26"));
        assertEquals(5, parsed.columns());
        assertEquals(10, parsed.vertices());
        assertEquals(4, parsed.triangles());
        assertEquals(2, parsed.details());
        assertEquals("oak_plank=3|stone=2", parsed.detailKeys());
    }

    @Test
    void parseRequiresFields() {
        assertThrows(IllegalArgumentException.class, () -> TerrainMetadata.parse("{}"));
    }

    @Test
    void withSourceReplacesOnlySource() {
        byte[] glb = {9, 9};
        TerrainResult result = new TerrainResult(glb, 1, 2, 3, 0, "", "disk").withSource("memory");
        assertEquals("memory", result.source());
        assertEquals(glb, result.glb());
        assertEquals(2, result.vertices());
    }

    @Test
    void generatedDerivesCountsFromSnapshotAndMesh() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        TerrainDetail[] details = {
                new TerrainDetail(0, 0, 64, TerrainDetail.Kind.COSMETIC_VOXEL, 0, TerrainDetail.Shape.FULL, 0, "oak_plank"),
        };
        TerrainSnapshot snapshot = new TerrainSnapshot("w", 0, 0, columns, details, 7, 0, 64);

        TerrainMesh withDetail = new TerrainMesh(part(12, 4), part(0, 0), part(6, 2));
        TerrainResult result = TerrainResult.generated(snapshot, withDetail, new byte[]{1});
        assertEquals(7, result.columns());
        assertEquals(18, result.vertices());
        assertEquals(6, result.triangles());
        assertEquals(1, result.details()); // detail part non-empty → snapshot.details().length
        assertEquals("generated", result.source());

        TerrainMesh noDetail = new TerrainMesh(part(12, 4), part(0, 0), part(0, 0));
        assertEquals(0, TerrainResult.generated(snapshot, noDetail, new byte[0]).details());
    }

    @Test
    void diskStatsEmpty() {
        assertEquals(0, DiskStats.empty().files());
        assertEquals(0, DiskStats.empty().bytes());
    }

    @Test
    void terrainBatchSummaryAggregatesBySourceAndErrors() {
        TerrainResult gen = new TerrainResult(new byte[10], 1, 2, 3, 0, "", "generated");
        TerrainResult disk = new TerrainResult(new byte[20], 4, 5, 6, 1, "", "disk");
        var results = java.util.List.of(
                new BatchTerrainResult(0, 0, gen, null),
                new BatchTerrainResult(1, 0, disk, null),
                new BatchTerrainResult(2, 0, null, "boom"));

        TerrainBatchSummary summary = TerrainBatchSummary.summarize(results);
        assertEquals(2, summary.ok());
        assertEquals(1, summary.errors());
        assertEquals(1, summary.generated());
        assertEquals(1, summary.disk());
        assertEquals(0, summary.memory());
        assertEquals(30, summary.bytes());
        assertEquals(5, summary.columns());
        assertEquals(7, summary.vertices());
    }

    @Test
    void terrainBatchSummaryCountsMemoryAndUnknownSources() {
        // Cover the "memory" switch arm plus a result whose error is set (so it counts as an error
        // even though terrain is non-null) and an unrecognized source (default arm).
        TerrainResult mem = new TerrainResult(new byte[5], 1, 1, 1, 1, "", "memory");
        TerrainResult other = new TerrainResult(new byte[5], 1, 1, 1, 1, "", "weird");
        var results = java.util.List.of(
                new BatchTerrainResult(0, 0, mem, null),
                new BatchTerrainResult(1, 0, other, null),
                new BatchTerrainResult(2, 0, mem, "explained-error")); // terrain present but error set -> error
        TerrainBatchSummary summary = TerrainBatchSummary.summarize(results);
        assertEquals(2, summary.ok());
        assertEquals(1, summary.errors());
        assertEquals(1, summary.memory());
        assertEquals(0, summary.generated());
        assertEquals(0, summary.disk());
    }

    @Test
    void detailKeySummaryIgnoresBlankAndNullKeysAndCompactsPaths() {
        // Mix of null/blank keys (filtered out, line 53) and a slash-prefixed key whose last segment
        // is kept (compactDetailKey lines 78-79). All-blank -> "" (line 59) is covered separately.
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        TerrainDetail[] details = {
                detail(""),
                detail(null),
                detail("hytale:blocks/oak_plank"), // -> compacted to "oak_plank"
                detail("hytale:blocks/oak_plank"),
                detail("stone"),
        };
        TerrainSnapshot snapshot = new TerrainSnapshot("w", 0, 0, columns, details, 1, 0, 64);
        TerrainResult result = TerrainResult.generated(snapshot, new TerrainMesh(part(3, 1), part(0, 0), part(3, 1)), new byte[]{1});
        // detailKeys is derived from the populated, slash-compacted keys; oak_plank appears twice.
        String keys = result.detailKeys();
        assertTrue(keys.contains("oak_plank=2"));
        assertTrue(keys.contains("stone=1"));
        assertFalse(keys.contains("blocks/")); // path prefix stripped by compactDetailKey
    }

    @Test
    void detailKeySummaryIsEmptyWhenAllKeysBlank() {
        // Every key blank/null -> counts map empty -> summary "" (line 59).
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        TerrainDetail[] details = {detail(""), detail(null), detail("   ")};
        TerrainSnapshot snapshot = new TerrainSnapshot("w", 0, 0, columns, details, 1, 0, 64);
        TerrainResult result = TerrainResult.generated(snapshot, new TerrainMesh(part(3, 1), part(0, 0), part(3, 1)), new byte[]{1});
        assertEquals("", result.detailKeys());
    }

    @Test
    void detailKeySummaryTruncatesLongKeyAndOverallLength() {
        // A single key longer than 80 chars is truncated to 80 (compactDetailKey line 81); many
        // distinct long keys push the joined summary past the 1600-char cap (line 67).
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        TerrainDetail[] details = new TerrainDetail[30];
        for (int i = 0; i < details.length; i++) {
            details[i] = detail("k" + i + "_" + "x".repeat(120)); // each well over 80 chars
        }
        TerrainSnapshot snapshot = new TerrainSnapshot("w", 0, 0, columns, details, 1, 0, 64);
        TerrainResult result = TerrainResult.generated(snapshot, new TerrainMesh(part(3, 1), part(0, 0), part(3, 1)), new byte[]{1});
        String keys = result.detailKeys();
        // Summary is capped at 1600 chars total.
        assertTrue(keys.length() <= 1600);
        assertTrue(keys.length() > 0);
        // Each fully-emitted key segment is truncated to at most 80 chars before the "=count". The
        // final segment may be cut mid-token by the 1600-char cap, so only check complete ones.
        for (String segment : keys.split("\\|")) {
            int eq = segment.lastIndexOf('=');
            if (eq < 0) {
                continue; // trailing segment truncated by the length cap before its '='
            }
            String keyPart = segment.substring(0, eq);
            assertTrue(keyPart.length() <= 80, () -> "key too long: " + keyPart);
        }
    }

    @Test
    void metadataParseDefaultsDetailKeysToEmptyWhenAbsent() {
        // metadataJson without a detailKeys field: findOptionalString returns "" (line 154 false arm).
        TerrainMetadata parsed = TerrainMetadata.parse(
                "{\"columns\":1,\"vertices\":2,\"triangles\":3,\"details\":0}");
        assertEquals("", parsed.detailKeys());
    }

    @Test
    void metadataParseUnescapesQuotesAndBackslashes() {
        // unescapeMetadataString handles \" and \\ sequences in the detailKeys value.
        TerrainMetadata parsed = TerrainMetadata.parse(
                "{\"columns\":1,\"vertices\":2,\"triangles\":3,\"details\":1,\"detailKeys\":\"a\\\\b=1\"}");
        assertEquals("a\\b=1", parsed.detailKeys());
    }

    private static TerrainDetail detail(String blockKey) {
        return new TerrainDetail(0, 0, 64, TerrainDetail.Kind.COSMETIC_VOXEL, 0, TerrainDetail.Shape.FULL, 0, blockKey);
    }
}
