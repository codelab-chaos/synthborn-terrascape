package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainMeshTest {

    private static TerrainMesh.TerrainPart part(String name, int vertices, int triangles) {
        return new TerrainMesh.TerrainPart(name, new float[0], new float[0], new int[0], vertices, triangles);
    }

    @Test
    void partEmptyReflectsVertexCount() {
        assertTrue(part("p", 0, 0).empty());
        assertFalse(part("p", 3, 1).empty());
    }

    @Test
    void countsAreSummedAcrossParts() {
        TerrainMesh mesh = new TerrainMesh(part("opaque", 10, 4), part("water", 6, 2), part("detail", 3, 1));
        assertEquals(19, mesh.vertexCount());
        assertEquals(7, mesh.triangleCount());
    }

    @Test
    void hasWaterAndHasDetailTrackTheirParts() {
        TerrainMesh full = new TerrainMesh(part("opaque", 10, 4), part("water", 6, 2), part("detail", 3, 1));
        assertTrue(full.hasWater());
        assertTrue(full.hasDetail());

        TerrainMesh bare = new TerrainMesh(part("opaque", 10, 4), part("water", 0, 0), part("detail", 0, 0));
        assertFalse(bare.hasWater());
        assertFalse(bare.hasDetail());
    }

    @Test
    void emptyMeshReportsZeroes() {
        TerrainMesh empty = new TerrainMesh(part("opaque", 0, 0), part("water", 0, 0), part("detail", 0, 0));
        assertEquals(0, empty.vertexCount());
        assertEquals(0, empty.triangleCount());
        assertFalse(empty.hasWater());
        assertFalse(empty.hasDetail());
    }
}
