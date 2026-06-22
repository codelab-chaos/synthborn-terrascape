package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.server.npc.AllNPCsLoadedEvent;
import com.hypixel.hytale.server.npc.asset.builder.BuilderInfo;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    // ---------------------------------------------------------------------------------------------
    // Populated-index coverage. subscribe()/onAllNPCsLoaded run at server start from a Hytale
    // AllNPCsLoadedEvent. The event and its BuilderInfo payload ARE constructible here (no live
    // World/Store needed), so we drive the private handler reflectively to populate the index and
    // exercise resolve/canonicalize/categoryFromPath/stripRuntimeSuffix against real data.
    // ---------------------------------------------------------------------------------------------

    private static BuilderInfo info(int id, String keyName, Path path) {
        // BuilderInfo(int, String keyName, Builder<?> builder, Path path) — builder may be null.
        return new BuilderInfo(id, keyName, null, path);
    }

    private static NpcRoleIndex populated() throws Exception {
        Int2ObjectMap<BuilderInfo> loaded = new Int2ObjectOpenHashMap<>();
        loaded.put(1, info(1, "Guard", Path.of("Common", "NPC", "Roles", "Combat", "Guard.json")));
        loaded.put(2, info(2, "Merchant", Path.of("Common", "NPC", "Roles", "Town", "Merchant.json")));
        loaded.put(3, info(3, "PathlessRole", null)); // no source path -> category null, withoutPath++
        loaded.put(4, info(4, "", Path.of("x.json"))); // blank id -> skipped entirely
        // AllNPCsLoadedEvent(allNPCs, loadedNPCs): getLoadedNPCs() returns the SECOND arg, which is
        // what NpcRoleIndex reads, so the populated map must be passed second.
        AllNPCsLoadedEvent event = new AllNPCsLoadedEvent(loaded, loaded);

        NpcRoleIndex index = new NpcRoleIndex();
        Method handler = NpcRoleIndex.class.getDeclaredMethod("onAllNPCsLoaded", AllNPCsLoadedEvent.class);
        handler.setAccessible(true);
        handler.invoke(index, event);
        return index;
    }

    @Test
    void populatedIndexReportsSizeAndLoaded() throws Exception {
        NpcRoleIndex index = populated();
        assertEquals(3, index.size()); // blank id dropped
        assertTrue(index.isLoaded());
    }

    @Test
    void resolveAndCanonicalizeUseExactThenLowercase() throws Exception {
        NpcRoleIndex index = populated();
        // Exact id hit (short-circuit at containsKey).
        assertEquals("Guard", index.canonicalize("Guard"));
        // Case-insensitive hit via lowerToCanonical.
        assertEquals("Merchant", index.canonicalize("merchant"));
        // resolve returns the Entry with derived category from the source path.
        NpcRoleIndex.Entry guard = index.resolve("guard");
        assertNotNull(guard);
        assertEquals("Guard", guard.id());
        assertEquals("Combat", guard.category());
        assertTrue(guard.pathHint().endsWith("/NPC/Roles/Combat/Guard.json"));
        // Unknown candidate resolves to null.
        assertNull(index.canonicalize("Nonexistent"));
        assertNull(index.resolve("Nonexistent"));
    }

    @Test
    void canonicalizeStripsRuntimeSuffix() throws Exception {
        NpcRoleIndex index = populated();
        // "Guard_Wander"/"Guard_Patrol" strip back to the canonical "Guard".
        assertEquals("Guard", index.canonicalize("Guard_Wander"));
        assertEquals("Guard", index.canonicalize("guard_patrol"));
        // A suffix-stripped form that still has no match returns null.
        assertNull(index.canonicalize("Mystery_Wander"));
    }

    @Test
    void pathlessRoleHasNullCategory() throws Exception {
        NpcRoleIndex index = populated();
        NpcRoleIndex.Entry entry = index.resolve("PathlessRole");
        assertNotNull(entry);
        assertNull(entry.path());
        assertNull(entry.category());
        assertNull(entry.pathHint());
    }

    @Test
    void categoryFromPathReturnsNullWhenNotUnderRoles() throws Exception {
        // A path that does not contain "/NPC/Roles/" yields a null category.
        Int2ObjectMap<BuilderInfo> loaded = new Int2ObjectOpenHashMap<>();
        loaded.put(1, info(1, "Stray", Path.of("Common", "Other", "Stray.json")));
        // AllNPCsLoadedEvent(allNPCs, loadedNPCs): getLoadedNPCs() returns the SECOND arg, which is
        // what NpcRoleIndex reads, so the populated map must be passed second.
        AllNPCsLoadedEvent event = new AllNPCsLoadedEvent(loaded, loaded);

        NpcRoleIndex index = new NpcRoleIndex();
        Method handler = NpcRoleIndex.class.getDeclaredMethod("onAllNPCsLoaded", AllNPCsLoadedEvent.class);
        handler.setAccessible(true);
        handler.invoke(index, event);

        NpcRoleIndex.Entry entry = index.resolve("Stray");
        assertNotNull(entry);
        assertNull(entry.category());
    }
}
