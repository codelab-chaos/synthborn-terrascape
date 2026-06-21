package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static com.codelabchaos.terrascape.terrain.TerrainSampler.VisualDetailMode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the pure {@link VisualDetailMode} contract. {@code TerrainSampler.sample(...)} itself
 * needs a live Hytale {@code World} with loaded chunks, so it is exercised by runtime tests, not
 * here.
 */
class TerrainSamplerTest {

    @Test
    void fromQueryDefaultsToAllWhenAbsent() {
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery(null));
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery(""));
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery("   "));
    }

    @Test
    void fromQueryMapsBasicAndOff() {
        assertEquals(VisualDetailMode.BASIC, VisualDetailMode.fromQuery("basic"));
        assertEquals(VisualDetailMode.BASIC, VisualDetailMode.fromQuery("OFF"));
    }

    @Test
    void fromQueryMapsAllSynonyms() {
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery("all"));
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery("foliage"));
        assertEquals(VisualDetailMode.ALL, VisualDetailMode.fromQuery("structures+foliage"));
    }

    @Test
    void fromQueryFallsBackToStructuresForUnknown() {
        assertEquals(VisualDetailMode.STRUCTURES, VisualDetailMode.fromQuery("structures"));
        assertEquals(VisualDetailMode.STRUCTURES, VisualDetailMode.fromQuery("anything-else"));
    }

    @Test
    void queryValueRoundTripsThroughFromQuery() {
        for (VisualDetailMode mode : VisualDetailMode.values()) {
            assertEquals(mode, VisualDetailMode.fromQuery(mode.queryValue()));
        }
    }

    @Test
    void featureFlagsMatchMode() {
        assertFalse(VisualDetailMode.BASIC.usesSimpleShapes());
        assertTrue(VisualDetailMode.STRUCTURES.usesSimpleShapes());
        assertTrue(VisualDetailMode.ALL.usesSimpleShapes());

        assertFalse(VisualDetailMode.STRUCTURES.includesSmallFoliage());
        assertTrue(VisualDetailMode.ALL.includesSmallFoliage());

        assertFalse(VisualDetailMode.BASIC.includesAllOccupiedDetails());
        assertTrue(VisualDetailMode.STRUCTURES.includesAllOccupiedDetails());
    }
}
