package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers the defensive null/empty contract of the entity-field readers. The component-backed paths
 * (real {@code Store}/{@code ArchetypeChunk}/{@code NPCEntity}) need a live entity and are exercised
 * by runtime tests; here we pin the fallbacks the web snapshots rely on.
 */
class EntityFieldsTest {

    @Test
    void safeEntityTypeFallsBackForNullEntity() {
        assertEquals("LivingEntity", EntityFields.safeEntityType(null));
    }

    @Test
    void safeMobRoleReturnsFallbackWhenNpcAbsent() {
        assertEquals("Guard", EntityFields.safeMobRole(null, null, "Guard"));
    }

    @Test
    void npcAccessorsAreNullSafe() {
        assertNull(EntityFields.safeNpcRoleName(null));
        assertNull(EntityFields.safeNpcTypeIndex(null));
        assertNull(EntityFields.safeNpcRoleIndex(null));
        assertNull(EntityFields.safeNpcNameTranslationKey(null));
    }

    @Test
    void liveNpcEntryReturnsNullWhenIndexEmpty() {
        NpcRoleIndex emptyIndex = new NpcRoleIndex();
        assertNull(EntityFields.liveNpcEntry(emptyIndex, "Wolf", "role", "Common/Wolf.json", "p"));
        assertNull(EntityFields.liveNpcEntry(emptyIndex, null, null, null, null));
    }

    @Test
    void healthSnapshotEmptyHasNoValues() {
        HealthSnapshot empty = HealthSnapshot.empty();
        assertNull(empty.health());
        assertNull(empty.maxHealth());

        HealthSnapshot present = new HealthSnapshot(12.0, 20.0);
        assertEquals(12.0, present.health());
        assertEquals(20.0, present.maxHealth());
    }
}
