package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TerrainDetailTest {

    @Test
    void fiveArgConstructorPicksDefaultShapePerKind() {
        assertEquals(TerrainDetail.Shape.POST,
                new TerrainDetail(0, 0, 0, TerrainDetail.Kind.COSMETIC_THIN, 0).shape());
        assertEquals(TerrainDetail.Shape.LIGHT,
                new TerrainDetail(0, 0, 0, TerrainDetail.Kind.COSMETIC_LIGHT, 0).shape());
        assertEquals(TerrainDetail.Shape.SMALL_FOLIAGE,
                new TerrainDetail(0, 0, 0, TerrainDetail.Kind.FOLIAGE_SMALL, 0).shape());
    }

    @Test
    void fiveArgConstructorDefaultsOtherKindsToFull() {
        assertEquals(TerrainDetail.Shape.FULL,
                new TerrainDetail(0, 0, 0, TerrainDetail.Kind.CANOPY_VOXEL, 0).shape());
        assertEquals(TerrainDetail.Shape.FULL,
                new TerrainDetail(0, 0, 0, TerrainDetail.Kind.COSMETIC_VOXEL, 0).shape());
    }

    @Test
    void fiveArgConstructorDefaultsRotationAndBlockKey() {
        TerrainDetail d = new TerrainDetail(5, 6, 7, TerrainDetail.Kind.CANOPY_VOXEL, 0xABCDEF);
        assertEquals(0, d.rotationIndex());
        assertEquals("", d.blockKey());
        assertEquals(5, d.localX());
        assertEquals(6, d.localZ());
        assertEquals(7, d.y());
        assertEquals(0xABCDEF, d.rgb());
    }

    @Test
    void sixArgConstructorKeepsExplicitShapeAndDefaultsRest() {
        TerrainDetail d = new TerrainDetail(0, 0, 0, TerrainDetail.Kind.COSMETIC_VOXEL, 0, TerrainDetail.Shape.RAIL);
        assertEquals(TerrainDetail.Shape.RAIL, d.shape());
        assertEquals(0, d.rotationIndex());
        assertEquals("", d.blockKey());
    }

    @Test
    void sevenArgConstructorKeepsShapeAndRotation() {
        TerrainDetail d = new TerrainDetail(0, 0, 0, TerrainDetail.Kind.COSMETIC_VOXEL, 0, TerrainDetail.Shape.WIDE_PANEL, 3);
        assertEquals(TerrainDetail.Shape.WIDE_PANEL, d.shape());
        assertEquals(3, d.rotationIndex());
        assertEquals("", d.blockKey());
    }

    @Test
    void canonicalConstructorKeepsAllComponents() {
        TerrainDetail d = new TerrainDetail(1, 2, 3, TerrainDetail.Kind.FOLIAGE_SMALL, 0x010203,
                TerrainDetail.Shape.HANGING_STRIP, 2, "leaves");
        assertEquals(TerrainDetail.Shape.HANGING_STRIP, d.shape());
        assertEquals(2, d.rotationIndex());
        assertEquals("leaves", d.blockKey());
    }
}
