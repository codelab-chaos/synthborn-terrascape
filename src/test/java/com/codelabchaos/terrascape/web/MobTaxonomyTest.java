package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MobTaxonomyTest {

    @Test
    void categoryFromTypeKeywords() {
        assertEquals("boss", MobTaxonomy.categoryForMob("AncientDragon"));
        assertEquals("hostile", MobTaxonomy.categoryForMob("Skeleton_Warrior"));
        assertEquals("npc", MobTaxonomy.categoryForMob("Kweebec_Elder"));
        assertEquals("livestock", MobTaxonomy.categoryForMob("Cow"));
        assertEquals("critter", MobTaxonomy.categoryForMob("Rabbit"));
        assertEquals("flying", MobTaxonomy.categoryForMob("Raven"));
        assertEquals("swimming", MobTaxonomy.categoryForMob("Shark"));
        assertEquals("passive", MobTaxonomy.categoryForMob("Deer"));
        assertEquals("unknown", MobTaxonomy.categoryForMob("Florbnak"));
    }

    @Test
    void categoryIsCaseInsensitive() {
        assertEquals("hostile", MobTaxonomy.categoryForMob("WOLF"));
    }

    @Test
    void bossKeywordWinsOverHostile() {
        // "guardian" → boss is checked before the hostile keyword list.
        assertEquals("boss", MobTaxonomy.categoryForMob("VoidGuardian"));
    }

    @Test
    void liveCategoryOverridesTypeHeuristics() {
        // A type that would otherwise be "unknown" is classified by the server-provided category.
        assertEquals("hostile", MobTaxonomy.categoryForMob("Florbnak", "Aggressive"));
        assertEquals("livestock", MobTaxonomy.categoryForMob("Florbnak", "Livestock"));
        assertEquals("critter", MobTaxonomy.categoryForMob("Florbnak", "Critter"));
        assertEquals("flying", MobTaxonomy.categoryForMob("Florbnak", "Avian"));
        assertEquals("swimming", MobTaxonomy.categoryForMob("Florbnak", "Fish"));
        assertEquals("npc", MobTaxonomy.categoryForMob("Florbnak", "Intelligent"));
    }

    @Test
    void liveCategoryFallsThroughToTypeWhenUnrecognized() {
        assertEquals("hostile", MobTaxonomy.categoryForMob("Skeleton", "somethingElse"));
    }

    @Test
    void colorMapsKnownCategoriesAndFallsBackDeterministically() {
        assertEquals("#ff5d6c", MobTaxonomy.colorForMob("Skeleton"));
        assertEquals("#7ec8ff", MobTaxonomy.colorForMob("Kweebec"));
        assertEquals("#d189ff", MobTaxonomy.colorForMob("Dragon"));
        // unknown → hsl fallback that is stable for the same input
        String fallback = MobTaxonomy.colorForMob("Florbnak");
        assertTrue(fallback.startsWith("hsl("));
        assertEquals(fallback, MobTaxonomy.colorForMob("Florbnak"));
    }

    @Test
    void fallbackColorIsHueBoundedAndStable() {
        for (String type : new String[]{"a", "zzz", "Florbnak", ""}) {
            String color = MobTaxonomy.fallbackMobColor(type);
            int hue = Integer.parseInt(color.substring(4, color.indexOf(',')));
            assertTrue(hue >= 0 && hue < 360, () -> "hue out of range for " + type);
        }
    }

    @Test
    void spawnMarkerDetection() {
        assertTrue(MobTaxonomy.isSpawnMarkerType("Mob_Spawn_Marker"));
        assertTrue(MobTaxonomy.isSpawnMarkerType("pathMarker"));
        assertFalse(MobTaxonomy.isSpawnMarkerType("Skeleton"));
    }

    @Test
    void labelFromAssetIdStripsPathNamespaceAndExtension() {
        assertEquals("Skeleton", MobTaxonomy.labelFromAssetId("Common/NPC/Skeleton.json"));
        assertEquals("Wolf", MobTaxonomy.labelFromAssetId("hytale:Wolf"));
        assertEquals("Guard", MobTaxonomy.labelFromAssetId("a\\b\\Guard"));
        assertNull(MobTaxonomy.labelFromAssetId(null));
        assertNull(MobTaxonomy.labelFromAssetId("   "));
        assertNull(MobTaxonomy.labelFromAssetId("dir/.json"));
    }

    @Test
    void colorMapsRemainingCategories() {
        // Cover the switch arms not hit elsewhere (lines 90-94): livestock, critter, flying, swimming, passive.
        assertEquals("#ffd36a", MobTaxonomy.colorForMob("Cow"));      // livestock
        assertEquals("#8ee58b", MobTaxonomy.colorForMob("Rabbit"));   // critter
        assertEquals("#b8d8ff", MobTaxonomy.colorForMob("Raven"));    // flying
        assertEquals("#62d4e7", MobTaxonomy.colorForMob("Shark"));    // swimming
        assertEquals("#a7e06f", MobTaxonomy.colorForMob("Deer"));     // passive
    }

    @Test
    void labelFromAssetIdEdgeCases() {
        // Trailing namespace colon: colon is at the end, so colon+1 < length is false -> keep as-is.
        assertEquals("Wolf:", MobTaxonomy.labelFromAssetId("Wolf:"));
        // Trailing path slash: slash+1 < length is false -> path segment is not stripped.
        assertEquals("dir/", MobTaxonomy.labelFromAssetId("dir/"));
        // Namespace + path + extension combined are all stripped.
        assertEquals("Bear", MobTaxonomy.labelFromAssetId("hytale:Common/NPC/Bear.json"));
        // A bare ".json" (no name) normalizes to blank -> null.
        assertNull(MobTaxonomy.labelFromAssetId(".json"));
        // Empty string is blank -> null.
        assertNull(MobTaxonomy.labelFromAssetId(""));
    }

    @Test
    void liveCategoryUndeadAndElementalAreHostile() {
        // The remaining hostile keywords in the live-category branch (line ~21).
        assertEquals("hostile", MobTaxonomy.categoryForMob("Florbnak", "Undead"));
        assertEquals("hostile", MobTaxonomy.categoryForMob("Florbnak", "Elemental"));
        // "flying" keyword (not just "avian") in the live-category branch.
        assertEquals("flying", MobTaxonomy.categoryForMob("Florbnak", "Flying"));
        // "swimming" keyword (not just "fish").
        assertEquals("swimming", MobTaxonomy.categoryForMob("Florbnak", "Swimming"));
    }
}
