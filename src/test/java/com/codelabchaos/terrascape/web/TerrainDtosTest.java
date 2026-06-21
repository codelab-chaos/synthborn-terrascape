package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.terrain.TerrainColumn;
import com.codelabchaos.terrascape.terrain.TerrainDetail;
import com.codelabchaos.terrascape.terrain.TerrainMesh;
import com.codelabchaos.terrascape.terrain.TerrainSnapshot;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
}
