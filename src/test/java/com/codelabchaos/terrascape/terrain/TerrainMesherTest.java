package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainMesherTest {

    private static final int SIZE = TerrainSnapshot.CHUNK_SIZE;

    private static TerrainColumn[] emptyColumns() {
        return new TerrainColumn[SIZE * SIZE];
    }

    private static void put(TerrainColumn[] columns, TerrainColumn column) {
        columns[column.localZ() * SIZE + column.localX()] = column;
    }

    private static TerrainSnapshot snapshot(TerrainColumn[] columns, TerrainDetail[] details) {
        return new TerrainSnapshot("world", 0, 0, columns, details, 0, 0, 64);
    }

    @Test
    void emptySnapshotProducesEmptyMesh() {
        TerrainMesh mesh = TerrainMesher.mesh(snapshot(emptyColumns(), new TerrainDetail[0]));
        assertTrue(mesh.opaque().empty());
        assertTrue(mesh.water().empty());
        assertTrue(mesh.detail().empty());
        assertFalse(mesh.hasWater());
        assertFalse(mesh.hasDetail());
    }

    @Test
    void solidColumnMeshesIntoOpaqueGeometry() {
        TerrainColumn[] columns = emptyColumns();
        put(columns, new TerrainColumn(10, 10, 64, 12, 0, "stone", 0x808080, false));

        TerrainMesh mesh = TerrainMesher.mesh(snapshot(columns, new TerrainDetail[0]));
        assertFalse(mesh.opaque().empty());
        assertTrue(mesh.triangleCount() > 0);
        assertTrue(mesh.water().empty());
    }

    @Test
    void fluidColumnMeshesIntoWaterGeometry() {
        TerrainColumn[] columns = emptyColumns();
        put(columns, new TerrainColumn(10, 10, 62, 0, 7, "water", 0x3060c0, true));

        TerrainMesh mesh = TerrainMesher.mesh(snapshot(columns, new TerrainDetail[0]));
        assertTrue(mesh.hasWater());
        assertTrue(mesh.opaque().empty());
    }

    @Test
    void detailsAreOmittedWhenDetailDisabled() {
        TerrainColumn[] columns = emptyColumns();
        TerrainDetail[] details = { new TerrainDetail(10, 10, 65, TerrainDetail.Kind.COSMETIC_VOXEL, 0x40c040) };

        TerrainMesh withDetail = TerrainMesher.mesh(snapshot(columns, details), true);
        TerrainMesh withoutDetail = TerrainMesher.mesh(snapshot(columns, details), false);

        assertTrue(withDetail.hasDetail());
        assertFalse(withoutDetail.hasDetail());
    }

    @Test
    void cosmeticMeshBuildsOnlyDetailGeometry() {
        TerrainColumn[] columns = emptyColumns();
        put(columns, new TerrainColumn(10, 10, 64, 12, 0, "stone", 0x808080, false)); // ignored by cosmeticMesh
        TerrainDetail[] details = { new TerrainDetail(10, 10, 65, TerrainDetail.Kind.COSMETIC_VOXEL, 0x40c040) };

        TerrainMesh mesh = TerrainMesher.cosmeticMesh(snapshot(columns, details));
        assertTrue(mesh.hasDetail());
        assertTrue(mesh.opaque().empty());
        assertTrue(mesh.water().empty());
    }
}
