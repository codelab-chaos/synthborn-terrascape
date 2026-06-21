package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrainColumnTest {

    private static TerrainColumn column(int y, int blockId, boolean fluid) {
        return new TerrainColumn(1, 2, y, blockId, 0, "stone", 0x808080, fluid);
    }

    @Test
    void solidBlockAboveGroundIsNotEmpty() {
        assertFalse(column(64, 12, false).empty());
    }

    @Test
    void airBlockIsEmpty() {
        assertTrue(column(64, 0, false).empty());
    }

    @Test
    void belowZeroIsEmpty() {
        assertTrue(column(-1, 12, false).empty());
    }

    @Test
    void fluidIsNeverEmptyEvenWithNoBlockOrNegativeY() {
        assertFalse(column(64, 0, true).empty());
        assertFalse(column(-5, 0, true).empty());
    }

    @Test
    void accessorsExposeAllComponents() {
        TerrainColumn c = new TerrainColumn(3, 4, 70, 9, 2, "dirt", 0x123456, true);
        assertEquals(3, c.localX());
        assertEquals(4, c.localZ());
        assertEquals(70, c.y());
        assertEquals(9, c.blockId());
        assertEquals(2, c.fluidId());
        assertEquals("dirt", c.blockKey());
        assertEquals(0x123456, c.rgb());
        assertTrue(c.fluid());
    }
}
