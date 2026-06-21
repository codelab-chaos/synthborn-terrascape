package com.codelabchaos.terrascape.web;

import org.joml.Vector3d;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MobSelectorTest {

    private static final List<Vector3d> PLAYERS = List.of(new Vector3d(0, 0, 0));
    private static final double RADAR_SQ = 100.0; // radius 10

    private static MobSnapshot snap(String type) {
        return new MobSnapshot("id", type, type, "cat", 0, 0, 0, null, "#fff", "s",
                null, null, null, null, null, null, null, null, null, null, null);
    }

    /** Type/snapshot suppliers that fail if invoked — proves the gate short-circuits before expensive reads. */
    private static final Supplier<String> NO_TYPE = () -> { throw new AssertionError("type read on skipped entity"); };
    private static final Function<String, MobSnapshot> NO_SNAPSHOT = t -> { throw new AssertionError("snapshot built on skip"); };

    private MobScanStats stats;
    private Set<Integer> seen;

    private MobCandidate select(boolean valid, boolean isPlayer, boolean notMob, String reason,
                               boolean hasTransform, Vector3d position, double radarSq,
                               Supplier<String> typeSupplier, Function<String, MobSnapshot> factory) {
        return MobSelector.select(1, valid, isPlayer, notMob, reason, hasTransform, position,
                PLAYERS, radarSq, typeSupplier, stats, seen, factory);
    }

    @org.junit.jupiter.api.BeforeEach
    void setup() {
        stats = new MobScanStats();
        seen = new HashSet<>();
    }

    @Test
    void acceptsAValidNearbyMob() {
        MobCandidate c = select(true, false, false, null, true, new Vector3d(3, 0, 0), RADAR_SQ,
                () -> "Wolf", MobSelectorTest::snap);
        assertNotNull(c);
        assertEquals("Wolf", c.snapshot().type());
        assertEquals(9.0, c.distanceSq(), 1e-9);
        assertEquals(1, stats.entities);
        assertEquals(1, stats.accepted);
        assertTrue(seen.contains(1));
    }

    @Test
    void invalidRefIsCounted() {
        assertNull(select(false, false, false, null, true, new Vector3d(0, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.entities);
        assertEquals(1, stats.invalidRefs);
    }

    @Test
    void duplicateRefIsCounted() {
        seen.add(1);
        assertNull(select(true, false, false, null, true, new Vector3d(0, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.duplicates);
    }

    @Test
    void playerIsSkippedBeforeAnyExpensiveRead() {
        assertNull(select(true, true, false, null, true, new Vector3d(0, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.skippedPlayers);
    }

    @Test
    void nonMobWithReasonRecordsType_withoutReasonDoesNot() {
        assertNull(select(true, false, true, "item", true, new Vector3d(0, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.skippedNonMobs);
        assertTrue(stats.toJson().contains("item=1"));

        setup();
        assertNull(select(true, false, true, null, true, new Vector3d(0, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.skippedNonMobs);
        assertTrue(stats.toJson().contains("\"skippedTypes\":\"none\""));
    }

    @Test
    void missingTransformAndPositionAreDistinct() {
        assertNull(select(true, false, false, null, false, null, RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.noTransform);

        setup();
        assertNull(select(true, false, false, null, true, null, RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.noPosition);
    }

    @Test
    void outsideRadarIsSkippedBeforeTypeRead() {
        assertNull(select(true, false, false, null, true, new Vector3d(50, 0, 0), RADAR_SQ, NO_TYPE, NO_SNAPSHOT));
        assertEquals(1, stats.skippedOutsideRadar);
    }

    @Test
    void spawnMarkerIsSkippedAfterTypeReadButBeforeSnapshot() {
        assertNull(select(true, false, false, null, true, new Vector3d(1, 0, 0), RADAR_SQ,
                () -> "Mob_Spawn_Marker", NO_SNAPSHOT));
        assertEquals(1, stats.skippedNonMobs);
        assertEquals(0, stats.accepted);
    }

    @Test
    void topSnapshotsSortsByDistanceAndLimits() {
        MobCandidate far = new MobCandidate(100, snap("Far"));
        MobCandidate near = new MobCandidate(1, snap("Near"));
        MobCandidate mid = new MobCandidate(25, snap("Mid"));
        List<MobSnapshot> top = MobSelector.topSnapshots(List.of(far, near, mid), 2);
        assertEquals(2, top.size());
        assertEquals("Near", top.get(0).type());
        assertEquals("Mid", top.get(1).type());
    }

    @Test
    void dueForLogRespectsInterval() {
        assertTrue(MobSelector.dueForLog(10_000, 0, 10_000));
        assertTrue(MobSelector.dueForLog(15_000, 0, 10_000));
        assertEquals(false, MobSelector.dueForLog(9_999, 0, 10_000));
    }

    @Test
    void debugReasonClassifiesEachSkipAndAccept() {
        assertEquals("player", MobSelector.debugReason(true, null, false, false, 1, RADAR_SQ));
        assertEquals("technical_item", MobSelector.debugReason(false, "item", false, false, 1, RADAR_SQ));
        assertEquals("technical_marker", MobSelector.debugReason(false, null, true, false, 1, RADAR_SQ));
        assertEquals("no_player_anchor", MobSelector.debugReason(false, null, false, true, 1, RADAR_SQ));
        assertEquals("outside_radar", MobSelector.debugReason(false, null, false, false, 9999, RADAR_SQ));
        assertEquals("accepted", MobSelector.debugReason(false, null, false, false, 1, RADAR_SQ));
    }

    @Test
    void shouldLogConnectSampleOnlyOnIncreaseWithPlayers() {
        assertTrue(MobSelector.shouldLogConnectSample(null, 1));   // first sample with players
        assertTrue(MobSelector.shouldLogConnectSample(1, 3));      // increased
        assertEquals(false, MobSelector.shouldLogConnectSample(3, 3)); // unchanged
        assertEquals(false, MobSelector.shouldLogConnectSample(5, 2)); // decreased
        assertEquals(false, MobSelector.shouldLogConnectSample(null, 0)); // no players
    }
}
