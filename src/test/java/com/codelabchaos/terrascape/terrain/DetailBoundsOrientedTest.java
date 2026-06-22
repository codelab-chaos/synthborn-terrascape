package com.codelabchaos.terrascape.terrain;

import com.codelabchaos.terrascape.terrain.DetailBoundsOriented.DetailBounds;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DetailBoundsOrientedTest {

    private static final float EPS = 1e-6f;

    private static void assertBounds(DetailBounds b, float minX, float minY, float minZ, float maxX, float maxY, float maxZ) {
        assertEquals(minX, b.minX(), EPS);
        assertEquals(minY, b.minY(), EPS);
        assertEquals(minZ, b.minZ(), EPS);
        assertEquals(maxX, b.maxX(), EPS);
        assertEquals(maxY, b.maxY(), EPS);
        assertEquals(maxZ, b.maxZ(), EPS);
    }

    // These shapes return fixed bounds regardless of rotation, so they are stable to assert exactly.

    @Test
    void fullShapeFillsTheVoxel() {
        assertBounds(DetailBoundsOriented.bounds(TerrainDetail.Shape.FULL, 0), 0f, 0f, 0f, 1f, 1f, 1f);
    }

    @Test
    void topSlabSitsOnTopHalf() {
        assertBounds(DetailBoundsOriented.bounds(TerrainDetail.Shape.TOP_SLAB, 0), 0f, 0.64f, 0f, 1f, 1f, 1f);
    }

    @Test
    void lightIsACenteredFloatingBox() {
        assertBounds(DetailBoundsOriented.bounds(TerrainDetail.Shape.LIGHT, 0), 0.26f, 0.08f, 0.26f, 0.74f, 0.88f, 0.74f);
    }

    @Test
    void smallFoliageIsACenteredBox() {
        assertBounds(DetailBoundsOriented.bounds(TerrainDetail.Shape.SMALL_FOLIAGE, 0), 0.18f, 0f, 0.18f, 0.82f, 0.72f, 0.82f);
    }

    @Test
    void orientedShapesProduceValidBoundsAcrossRotations() {
        TerrainDetail.Shape[] oriented = {
                TerrainDetail.Shape.POST,
                TerrainDetail.Shape.THIN_PANEL,
                TerrainDetail.Shape.WIDE_PANEL,
                TerrainDetail.Shape.HANGING_STRIP,
                TerrainDetail.Shape.RAIL,
        };
        for (TerrainDetail.Shape shape : oriented) {
            for (int idx = 0; idx < 4; idx++) {
                DetailBounds b = DetailBoundsOriented.bounds(shape, idx);
                assertNotNull(b);
                assertTrue(b.minX() <= b.maxX() && b.minY() <= b.maxY() && b.minZ() <= b.maxZ(),
                        () -> shape + " produced inverted bounds");
            }
        }
    }

    @Test
    void detailBoundsRecordExposesComponents() {
        DetailBounds b = new DetailBounds(0.1f, 0.2f, 0.3f, 0.7f, 0.8f, 0.9f);
        assertBounds(b, 0.1f, 0.2f, 0.3f, 0.7f, 0.8f, 0.9f);
    }
}
