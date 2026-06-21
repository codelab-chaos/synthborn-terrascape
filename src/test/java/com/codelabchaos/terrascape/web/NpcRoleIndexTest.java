package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers the index's empty-state contract and the {@link NpcRoleIndex.Entry} record. Population
 * happens from a Hytale {@code AllNPCsLoadedEvent} at runtime, which is out of scope for unit tests.
 */
class NpcRoleIndexTest {

    @Test
    void freshIndexIsEmptyAndNotLoaded() {
        NpcRoleIndex index = new NpcRoleIndex();
        assertEquals(0, index.size());
        assertFalse(index.isLoaded());
    }

    @Test
    void canonicalizeRejectsBlankAndUnknownWhenEmpty() {
        NpcRoleIndex index = new NpcRoleIndex();
        assertNull(index.canonicalize(null));
        assertNull(index.canonicalize(""));
        assertNull(index.canonicalize("   "));
        assertNull(index.canonicalize("Guard_Wander"));
    }

    @Test
    void resolveReturnsNullWhenEmpty() {
        NpcRoleIndex index = new NpcRoleIndex();
        assertNull(index.resolve(null));
        assertNull(index.resolve("Guard"));
    }

    @Test
    void entryExposesIdCategoryAndNormalizedPathHint() {
        Path path = Path.of("Common", "NPC", "Roles", "Combat", "Guard.json");
        NpcRoleIndex.Entry entry = new NpcRoleIndex.Entry("Guard", path, "Combat");
        assertEquals("Guard", entry.id());
        assertEquals("Combat", entry.category());
        assertEquals(path, entry.path());
        // pathHint always uses forward slashes regardless of platform separator.
        assertEquals(path.toString().replace('\\', '/'), entry.pathHint());
    }

    @Test
    void entryPathHintIsNullWhenPathAbsent() {
        NpcRoleIndex.Entry entry = new NpcRoleIndex.Entry("Guard", null, null);
        assertNull(entry.pathHint());
        assertNull(entry.category());
    }
}
