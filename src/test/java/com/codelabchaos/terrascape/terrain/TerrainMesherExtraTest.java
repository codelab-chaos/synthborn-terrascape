package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainMesherExtraTest {

    private static final int SIZE = TerrainSnapshot.CHUNK_SIZE;

    private static TerrainColumn[] emptyColumns() {
        return new TerrainColumn[SIZE * SIZE];
    }

    private static void put(TerrainColumn[] columns, int x, int z, int y, int rgb) {
        columns[z * SIZE + x] = new TerrainColumn(x, z, y, 1, 0, "stone", rgb, false);
    }

    private static TerrainSnapshot snapshot(TerrainColumn[] columns, TerrainDetail[] details, int minY, int maxY) {
        int nonEmpty = 0;
        for (TerrainColumn column : columns) {
            if (column != null && !column.empty()) {
                nonEmpty++;
            }
        }
        return new TerrainSnapshot("world", 0, 0, columns, details, nonEmpty, minY, maxY);
    }

    @Test
    void nullAndEmptyColumnsAreSkipped() {
        TerrainColumn[] columns = emptyColumns();
        // A null column (index 0 left null) and an explicitly empty column.
        columns[1] = new TerrainColumn(1, 0, -1, 0, 0, "air", 0, false); // empty(): blockId 0
        put(columns, 5, 5, 3, 0x808080);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[0], 0, 8);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        // Only the single solid column contributes geometry; top quad always present.
        assertTrue(mesh.opaque().vertexCount() >= 4);
        assertFalse(mesh.hasWater());
    }

    @Test
    void waterColumnsGoToWaterPart() {
        TerrainColumn[] columns = emptyColumns();
        columns[3 * SIZE + 3] = new TerrainColumn(3, 3, 2, 1, 9, "water", 0x3050ff, true);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[0], 0, 8);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        assertTrue(mesh.hasWater());
    }

    @Test
    void neighborHeightsDriveSideFacesAndTriangulation() {
        // A central tall column surrounded by shorter / taller / equal neighbors exercises
        // addSideIfLower branches: neighbor null (edge), neighbor lower (emit side),
        // neighbor equal/higher (early return), and occlusion/lift helpers.
        TerrainColumn[] columns = emptyColumns();
        int cx = 10;
        int cz = 10;
        put(columns, cx, cz, 6, 0xA0A0A0);
        put(columns, cx - 1, cz, 2, 0x808080); // lower -> side face on -X
        put(columns, cx + 1, cz, 6, 0x808080); // equal -> no face on +X
        put(columns, cx, cz - 1, 9, 0x808080); // higher -> no face on -Z, drives occlusion
        // +Z neighbor left null -> treated as below floor -> side face emitted.
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[0], 0, 12);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        assertTrue(mesh.opaque().triangleCount() > 0);
        // The colors array must be 3 floats per vertex.
        assertEquals(mesh.opaque().vertexCount() * 3, mesh.opaque().colors().length);
        assertEquals(mesh.opaque().vertexCount() * 3, mesh.opaque().positions().length);
    }

    @Test
    void blackColorExercisesLowSrgbBranch() {
        // rgb == 0 yields linear color values in the <= 0.04045 branch of srgbToLinear.
        TerrainColumn[] columns = emptyColumns();
        put(columns, 7, 7, 3, 0x000000);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[0], 0, 8);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        for (float c : mesh.opaque().colors()) {
            assertTrue(c >= 0.0f && c <= 1.0f);
        }
    }

    @Test
    void detailsExcludedKindsAreFilteredOut() {
        // cosmeticMesh only includes COSMETIC_* and FOLIAGE_SMALL; a CANOPY_VOXEL is excluded
        // (covers includesKind returning false).
        TerrainColumn[] columns = emptyColumns();
        TerrainDetail canopy = new TerrainDetail(4, 4, 5, TerrainDetail.Kind.CANOPY_VOXEL, 0x40A040);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[]{canopy}, 0, 8);

        TerrainMesh mesh = TerrainMesher.cosmeticMesh(snapshot);
        assertFalse(mesh.hasDetail());
    }

    @Test
    void adjacentDetailsHideSharedFaces() {
        // Two stacked cosmetic voxels: the shared face between them is culled, but exposed faces remain.
        TerrainColumn[] columns = emptyColumns();
        TerrainDetail lower = new TerrainDetail(8, 8, 5, TerrainDetail.Kind.COSMETIC_VOXEL, 0x806040, TerrainDetail.Shape.FULL);
        TerrainDetail upper = new TerrainDetail(8, 8, 6, TerrainDetail.Kind.COSMETIC_VOXEL, 0x806040, TerrainDetail.Shape.FULL);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[]{lower, upper}, 0, 12);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        assertTrue(mesh.hasDetail());
        // Two isolated cubes would be 2*6 faces = 48 verts; sharing one face removes 2 faces = 8 verts.
        assertEquals(40, mesh.detail().vertexCount());
    }

    @Test
    void detailNextToTerrainColumnIsOccluded() {
        // A detail whose neighbor cell is occupied by solid terrain exercises solidDetailOrColumnAt
        // and solidColumnAt with a real column (column != null, height >= y).
        TerrainColumn[] columns = emptyColumns();
        put(columns, 12, 12, 10, 0x808080); // tall column overlapping detail's neighbor sample
        put(columns, 13, 12, 10, 0x808080);
        TerrainDetail detail = new TerrainDetail(12, 12, 5, TerrainDetail.Kind.COSMETIC_VOXEL, 0x40A040, TerrainDetail.Shape.FULL);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[]{detail}, 0, 16);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        assertTrue(mesh.hasDetail());
        assertTrue(mesh.opaque().vertexCount() > 0);
    }

    @Test
    void orientedThinPanelDetailProducesGeometry() {
        // A thin-panel cosmetic detail with rotation exercises DetailBoundsOriented through the mesher.
        TerrainColumn[] columns = emptyColumns();
        TerrainDetail panel = new TerrainDetail(
                15, 15, 4, TerrainDetail.Kind.COSMETIC_THIN, 0xC0C0C0, TerrainDetail.Shape.THIN_PANEL, 1);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[]{panel}, 0, 8);

        TerrainMesh mesh = TerrainMesher.cosmeticMesh(snapshot);
        assertTrue(mesh.hasDetail());
        assertEquals(24, mesh.detail().vertexCount()); // isolated box: 6 faces * 4 verts
    }

    @Test
    void meshWithoutDetailDropsDetailLayer() {
        TerrainColumn[] columns = emptyColumns();
        put(columns, 2, 2, 3, 0x808080);
        TerrainDetail foliage = new TerrainDetail(2, 2, 5, TerrainDetail.Kind.FOLIAGE_SMALL, 0x40A040);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[]{foliage}, 0, 8);

        TerrainMesh withDetail = TerrainMesher.mesh(snapshot, true);
        TerrainMesh noDetail = TerrainMesher.mesh(snapshot, false);
        assertTrue(withDetail.hasDetail());
        assertFalse(noDetail.hasDetail());
    }

    @Test
    void steepDropExercisesLedgeLift() {
        // A column far above its neighbors triggers liftFor's non-zero branch (y - neighborY large).
        TerrainColumn[] columns = emptyColumns();
        List<int[]> placed = new ArrayList<>();
        put(columns, 20, 20, 20, 0xB0B0B0);
        placed.add(new int[]{20, 20});
        // neighbors very low -> big delta.
        put(columns, 19, 20, 1, 0x808080);
        put(columns, 20, 19, 1, 0x808080);
        TerrainSnapshot snapshot = snapshot(columns, new TerrainDetail[0], 0, 24);

        TerrainMesh mesh = TerrainMesher.mesh(snapshot);
        assertFalse(placed.isEmpty());
        assertTrue(mesh.opaque().vertexCount() > 0);
    }
}
