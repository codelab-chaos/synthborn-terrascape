package com.codelabchaos.terrascape.terrain;

import com.hypixel.hytale.server.core.asset.type.blocktype.config.Rotation;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.RotationTuple;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DetailBoundsOrientedExtraTest {

    private static int index(Rotation yaw, Rotation pitch, Rotation roll) {
        return RotationTuple.index(yaw, pitch, roll);
    }

    private static DetailBoundsOriented.DetailBounds bounds(TerrainDetail.Shape shape, Rotation yaw) {
        return DetailBoundsOriented.bounds(shape, index(yaw, Rotation.None, Rotation.None));
    }

    @Test
    void clampsNegativeRotationIndex() {
        // index 0 == NONE (no rotation); negative clamps to 0 (the lower bound of clampRotationIndex).
        DetailBoundsOriented.DetailBounds low = DetailBoundsOriented.bounds(TerrainDetail.Shape.POST, -50);
        DetailBoundsOriented.DetailBounds zero = DetailBoundsOriented.bounds(TerrainDetail.Shape.POST, 0);
        assertEquals(zero, low);
        // A valid high in-range index also resolves to a vertical post here (yaw-only does not flatten).
        DetailBoundsOriented.DetailBounds high =
                DetailBoundsOriented.bounds(TerrainDetail.Shape.POST, index(Rotation.OneEighty, Rotation.None, Rotation.None));
        assertTrue(high.maxY() <= 1.0f);
    }

    @Test
    void simpleShapesIgnoreRotation() {
        DetailBoundsOriented.DetailBounds light = bounds(TerrainDetail.Shape.LIGHT, Rotation.None);
        assertEquals(0.26f, light.minX());
        assertEquals(0.88f, light.maxY());

        DetailBoundsOriented.DetailBounds foliage = bounds(TerrainDetail.Shape.SMALL_FOLIAGE, Rotation.None);
        assertEquals(0.0f, foliage.minY());
        assertEquals(0.82f, foliage.maxX());

        DetailBoundsOriented.DetailBounds slab = bounds(TerrainDetail.Shape.TOP_SLAB, Rotation.None);
        assertEquals(0.64f, slab.minY());
        assertEquals(1.0f, slab.maxY());

        DetailBoundsOriented.DetailBounds full = bounds(TerrainDetail.Shape.FULL, Rotation.None);
        assertEquals(new DetailBoundsOriented.DetailBounds(0, 0, 0, 1, 1, 1), full);
    }

    @Test
    void railRotatesBetweenXAndZAlignment() {
        DetailBoundsOriented.DetailBounds none = bounds(TerrainDetail.Shape.RAIL, Rotation.None);
        // default branch: thin along Z.
        assertEquals(0.0f, none.minX());
        assertEquals(1.0f, none.maxX());

        DetailBoundsOriented.DetailBounds ninety = bounds(TerrainDetail.Shape.RAIL, Rotation.Ninety);
        // Ninety/TwoSeventy branch: thin along X.
        assertEquals(0.0f, ninety.minZ());
        assertEquals(1.0f, ninety.maxZ());
        assertEquals(bounds(TerrainDetail.Shape.RAIL, Rotation.TwoSeventy), ninety);
    }

    @Test
    void thinPanelCoversAllFourYaws() {
        DetailBoundsOriented.DetailBounds n = bounds(TerrainDetail.Shape.THIN_PANEL, Rotation.None);
        assertEquals(0.0f, n.minZ());
        assertEquals(0.15f, n.maxZ());

        DetailBoundsOriented.DetailBounds e = bounds(TerrainDetail.Shape.THIN_PANEL, Rotation.Ninety);
        assertEquals(1.0f, e.maxX());

        DetailBoundsOriented.DetailBounds s = bounds(TerrainDetail.Shape.THIN_PANEL, Rotation.OneEighty);
        assertEquals(1.0f, s.maxZ());

        DetailBoundsOriented.DetailBounds w = bounds(TerrainDetail.Shape.THIN_PANEL, Rotation.TwoSeventy);
        assertEquals(0.0f, w.minX());
        assertEquals(0.15f, w.maxX());
    }

    @Test
    void widePanelCoversAllFourYaws() {
        assertEquals(0.15f, bounds(TerrainDetail.Shape.WIDE_PANEL, Rotation.None).maxZ());
        assertEquals(1.0f, bounds(TerrainDetail.Shape.WIDE_PANEL, Rotation.Ninety).maxX());
        assertEquals(1.0f, bounds(TerrainDetail.Shape.WIDE_PANEL, Rotation.OneEighty).maxZ());
        assertEquals(0.15f, bounds(TerrainDetail.Shape.WIDE_PANEL, Rotation.TwoSeventy).maxX());
    }

    @Test
    void hangingStripCoversAllFourYaws() {
        assertEquals(0.40f, bounds(TerrainDetail.Shape.HANGING_STRIP, Rotation.None).minX());
        assertEquals(0.60f, bounds(TerrainDetail.Shape.HANGING_STRIP, Rotation.Ninety).minX());
        assertEquals(0.40f, bounds(TerrainDetail.Shape.HANGING_STRIP, Rotation.OneEighty).minX());
        assertEquals(0.40f, bounds(TerrainDetail.Shape.HANGING_STRIP, Rotation.TwoSeventy).minX());
    }

    @Test
    void verticalPostWhenNoHorizontalAxis() {
        DetailBoundsOriented.DetailBounds post = bounds(TerrainDetail.Shape.POST, Rotation.None);
        assertEquals(0.34f, post.minX());
        assertEquals(0.96f, post.maxY());
    }

    @Test
    void horizontalPostFlattensViaPitch() {
        // pitch horizontal -> beam runs along Z (minZ 0, maxZ 1).
        int idx = index(Rotation.None, Rotation.Ninety, Rotation.None);
        DetailBoundsOriented.DetailBounds b = DetailBoundsOriented.bounds(TerrainDetail.Shape.POST, idx);
        assertEquals(0.0f, b.minZ());
        assertEquals(1.0f, b.maxZ());
        assertEquals(0.34f, b.minX());
    }

    @Test
    void horizontalPostFlattensViaRoll() {
        // roll horizontal (pitch not) -> beam runs along X (minX 0, maxX 1).
        int idx = index(Rotation.None, Rotation.None, Rotation.Ninety);
        DetailBoundsOriented.DetailBounds b = DetailBoundsOriented.bounds(TerrainDetail.Shape.POST, idx);
        assertEquals(0.0f, b.minX());
        assertEquals(1.0f, b.maxX());
        assertEquals(0.34f, b.minZ());
    }
}
