package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static com.codelabchaos.terrascape.terrain.TerrainDetail.Shape;
import static com.codelabchaos.terrascape.terrain.TerrainDetail.Kind;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CosmeticShapeRulesTest {

    @Test
    void matchesCosmeticByKeyword() {
        assertTrue(CosmeticShapeRules.matchesCosmetic("oak_plank"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("torch"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("iron_door"));
    }

    @Test
    void matchesCosmeticIsCaseInsensitive() {
        assertTrue(CosmeticShapeRules.matchesCosmetic("OAK_PLANK"));
    }

    @Test
    void nonCosmeticBlocksDoNotMatch() {
        assertFalse(CosmeticShapeRules.matchesCosmetic("stone"));
        assertFalse(CosmeticShapeRules.matchesCosmetic(null));
        assertFalse(CosmeticShapeRules.matchesCosmetic(""));
    }

    @Test
    void structuralWoodMatchesButLogsAndTrunksDoNot() {
        assertTrue(CosmeticShapeRules.matchesCosmetic("wood_panel"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("wooden_frame"));
        assertFalse(CosmeticShapeRules.matchesCosmetic("wood_log"));
        assertFalse(CosmeticShapeRules.matchesCosmetic("oak_trunk_wood"));
    }

    @Test
    void minecartRailsAreNotTreatedAsCosmeticRails() {
        assertFalse(CosmeticShapeRules.matchesCosmetic("minecart_rail"));
        assertFalse(CosmeticShapeRules.matchesCosmetic("cart_rail"));
        assertTrue(CosmeticShapeRules.matchesCosmetic("iron_rail")); // a plain rail is cosmetic
    }

    @Test
    void shapeForFollowsPriorityOrder() {
        assertEquals(Shape.LIGHT, CosmeticShapeRules.shapeFor("torch"));
        assertEquals(Shape.RAIL, CosmeticShapeRules.shapeFor("handrail"));
        assertEquals(Shape.RAIL, CosmeticShapeRules.shapeFor("garden_fence"));
        assertEquals(Shape.POST, CosmeticShapeRules.shapeFor("scaffold"));
        assertEquals(Shape.POST, CosmeticShapeRules.shapeFor("stone_pillar"));
        assertEquals(Shape.WIDE_PANEL, CosmeticShapeRules.shapeFor("ladder"));
        assertEquals(Shape.TOP_SLAB, CosmeticShapeRules.shapeFor("oak_plank"));
        assertEquals(Shape.THIN_PANEL, CosmeticShapeRules.shapeFor("iron_door"));
        assertEquals(Shape.HANGING_STRIP, CosmeticShapeRules.shapeFor("rope"));
        assertEquals(Shape.FULL, CosmeticShapeRules.shapeFor("stone"));
    }

    @Test
    void fencePostIsAPostNotARail() {
        // "fence" alone is a rail, but a fence post/pillar is excluded from rail and becomes a post.
        assertEquals(Shape.POST, CosmeticShapeRules.shapeFor("fence_post"));
    }

    @Test
    void kindForRespectsSimpleShapesToggle() {
        assertEquals(Kind.COSMETIC_VOXEL, CosmeticShapeRules.kindFor("iron_door", false));
        assertEquals(Kind.COSMETIC_LIGHT, CosmeticShapeRules.kindFor("torch", true));
        assertEquals(Kind.COSMETIC_THIN, CosmeticShapeRules.kindFor("iron_door", true));
        assertEquals(Kind.COSMETIC_VOXEL, CosmeticShapeRules.kindFor("oak_plank", true)); // TOP_SLAB → voxel
    }

    @Test
    void preferDetailLayerOnlyForThinShapesWhenSimple() {
        assertFalse(CosmeticShapeRules.preferDetailLayer("iron_door", false));
        assertTrue(CosmeticShapeRules.preferDetailLayer("iron_door", true));   // THIN_PANEL
        assertTrue(CosmeticShapeRules.preferDetailLayer("torch", true));        // LIGHT
        assertFalse(CosmeticShapeRules.preferDetailLayer("oak_plank", true));   // TOP_SLAB
    }

    @Test
    void usesBlockRotationExcludesLightAndFullShapes() {
        assertTrue(CosmeticShapeRules.usesBlockRotation("iron_door"));   // THIN_PANEL
        assertTrue(CosmeticShapeRules.usesBlockRotation("scaffold"));    // POST
        assertFalse(CosmeticShapeRules.usesBlockRotation("torch"));      // LIGHT
        assertFalse(CosmeticShapeRules.usesBlockRotation("stone"));      // FULL
        assertFalse(CosmeticShapeRules.usesBlockRotation("oak_plank"));  // TOP_SLAB
    }
}
