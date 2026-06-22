package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CosmeticShapeRulesExtraTest {

    @Test
    void nullAndEmptyKeysAreNotCosmetic() {
        assertFalse(CosmeticShapeRules.matchesCosmetic(null));
        assertFalse(CosmeticShapeRules.matchesCosmetic(""));
        assertFalse(CosmeticShapeRules.matchesCosmetic("   "));
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor(null));
    }

    @Test
    void keywordCosmeticsAreMatchedCaseInsensitively() {
        assertTrue(CosmeticShapeRules.matchesCosmetic("OAK_PLANK"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("torch_wall"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("rope_bridge"));
    }

    @Test
    void woodRailAndStructuralWoodAreCosmetic() {
        // isWoodRail: contains "rail" and not a minecart rail.
        assertTrue(CosmeticShapeRules.matchesCosmetic("wood_rail"));
        // isStructuralWood: "wooden" without trunk/log/branch/bough.
        assertTrue(CosmeticShapeRules.matchesCosmetic("wooden_wall"));
        // structural wood excluded when it is a trunk/log.
        assertFalse(CosmeticShapeRules.matchesCosmetic("wood_log"));
    }

    @Test
    void shapeForResolvesEachSpecialShape() {
        assertEquals(TerrainDetail.Shape.LIGHT, CosmeticShapeRules.shapeFor("torch"));
        assertEquals(TerrainDetail.Shape.RAIL, CosmeticShapeRules.shapeFor("handrail"));
        assertEquals(TerrainDetail.Shape.POST, CosmeticShapeRules.shapeFor("support_beam"));
        assertEquals(TerrainDetail.Shape.WIDE_PANEL, CosmeticShapeRules.shapeFor("ladder"));
        assertEquals(TerrainDetail.Shape.TOP_SLAB, CosmeticShapeRules.shapeFor("plank"));
        assertEquals(TerrainDetail.Shape.THIN_PANEL, CosmeticShapeRules.shapeFor("door"));
        assertEquals(TerrainDetail.Shape.HANGING_STRIP, CosmeticShapeRules.shapeFor("rope"));
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor("dirt"));
    }

    @Test
    void minecartRailIsNotARailDetail() {
        // Covers the early `return false` branch in isRailDetail when key is a minecart rail
        // even though it contains "rail".
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor("minecart_rail"));
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor("mine_cart_rail"));
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor("tinkering_rail"));
        assertEquals(TerrainDetail.Shape.FULL, CosmeticShapeRules.shapeFor("cart_rail"));
    }

    @Test
    void fenceIsRailUnlessPostOrPillar() {
        assertEquals(TerrainDetail.Shape.RAIL, CosmeticShapeRules.shapeFor("fence"));
        assertEquals(TerrainDetail.Shape.POST, CosmeticShapeRules.shapeFor("fence_post"));
    }

    @Test
    void kindForRespectsSimpleShapesFlag() {
        assertEquals(TerrainDetail.Kind.COSMETIC_VOXEL,
                CosmeticShapeRules.kindFor("door", false));
        assertEquals(TerrainDetail.Kind.COSMETIC_LIGHT,
                CosmeticShapeRules.kindFor("lantern", true));
        assertEquals(TerrainDetail.Kind.COSMETIC_THIN,
                CosmeticShapeRules.kindFor("door", true));
        assertEquals(TerrainDetail.Kind.COSMETIC_VOXEL,
                CosmeticShapeRules.kindFor("dirt", true));
    }

    @Test
    void preferDetailLayerAndBlockRotation() {
        assertFalse(CosmeticShapeRules.preferDetailLayer("door", false));
        assertTrue(CosmeticShapeRules.preferDetailLayer("door", true));
        assertFalse(CosmeticShapeRules.preferDetailLayer("plank", true));

        assertTrue(CosmeticShapeRules.usesBlockRotation("door"));
        assertTrue(CosmeticShapeRules.usesBlockRotation("handrail"));
        assertFalse(CosmeticShapeRules.usesBlockRotation("plank"));
        assertFalse(CosmeticShapeRules.usesBlockRotation("lantern"));
    }
}
