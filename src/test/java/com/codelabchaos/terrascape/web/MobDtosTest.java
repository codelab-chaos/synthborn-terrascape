package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MobDtosTest {

    private static MobSnapshot fullMob() {
        return new MobSnapshot("id1", "Wolf", "Wolf", "hostile", 1.5, 64.0, -2.5, 90f, "#ff5d6c",
                "EntitySpatial", "guard", "key.name", 3, 4, "model.json", "persistent.json",
                "liveId", "hostile", "path/role", 12.0, 20.0);
    }

    private static MobSnapshot minimalMob() {
        return new MobSnapshot("id2", "Cow", "Cow", "livestock", 0, 0, 0, null, "#ffd36a",
                "src", null, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void mobSnapshotJsonIncludesPresentFields() {
        String json = fullMob().toJson();
        assertTrue(json.contains("\"id\":\"id1\""));
        assertTrue(json.contains("\"type\":\"Wolf\""));
        assertTrue(json.contains("\"yaw\":90.0"));
        assertTrue(json.contains("\"role\":\"guard\""));
        assertTrue(json.contains("\"health\":12.0"));
        assertTrue(json.contains("\"liveRoleId\":\"liveId\""));
    }

    @Test
    void mobSnapshotJsonOmitsNullOptionalFields() {
        String json = minimalMob().toJson();
        assertFalse(json.contains("\"yaw\""));
        assertFalse(json.contains("\"role\""));
        assertFalse(json.contains("\"health\""));
        assertFalse(json.contains("\"liveRoleId\""));
        assertTrue(json.contains("\"category\":\"livestock\""));
    }

    @Test
    void mobFeedSnapshotEmptyAndJson() {
        MobFeedSnapshot empty = MobFeedSnapshot.empty();
        assertTrue(empty.mobs().isEmpty());

        MobFeedSnapshot feed = new MobFeedSnapshot(List.of(fullMob()), new MobScanStats(), 2, 500.0, 256);
        String json = feed.toJson("world");
        assertTrue(json.contains("\"ok\":true"));
        assertTrue(json.contains("\"world\":\"world\""));
        assertTrue(json.contains("\"players\":2"));
        assertTrue(json.contains("\"mobs\":[{"));
        assertTrue(json.contains("\"sourceStats\":{"));
    }

    @Test
    void mobScanStatsAggregatesAndSerializes() {
        MobScanStats stats = new MobScanStats();
        stats.addSource("EntitySpatial");
        stats.addSource("EntitySpatial");
        stats.addType("Wolf");
        stats.addSkippedType("item");
        stats.addArchetype("com.hypixel.hytale.server.core.Foo");
        stats.chunks = 3;
        stats.accepted = 1;

        String json = stats.toJson();
        assertTrue(json.contains("\"chunks\":3"));
        assertTrue(json.contains("\"accepted\":1"));
        assertTrue(json.contains("EntitySpatial=2"));
        assertTrue(json.contains("Wolf=1"));
    }

    @Test
    void shortenStripsKnownPackagePrefixes() {
        assertEquals("Foo", MobScanStats.shorten("com.hypixel.hytale.server.core.Foo"));
        assertEquals("a", MobScanStats.shorten("a"));
    }

    @Test
    void nearbyCandidateSummary() {
        NearbyCandidate c = new NearbyCandidate(7, "Wolf", 12.4, 10.2, 64.0, -3.0, "player");
        String summary = c.summary();
        assertTrue(summary.contains("Wolf#7"));
        assertTrue(summary.contains("[player]"));

        assertFalse(new NearbyCandidate(1, "Cow", 1, 0, 0, 0, "").summary().contains("["));
    }

    @Test
    void nearbyDebugCandidateJson() {
        NearbyDebugCandidate c = new NearbyDebugCandidate(5, "Wolf", "accepted", 3.0, 1, 2, 3,
                true, false, "guard", "m.json", "p.json", "live", "com.hypixel.hytale.Foo");
        String json = c.toJson();
        assertTrue(json.contains("\"id\":5"));
        assertTrue(json.contains("\"reason\":\"accepted\""));
        assertTrue(json.contains("\"npc\":true"));
        assertTrue(json.contains("\"archetype\":\"Foo\""));
    }

    @Test
    void mobCandidateHoldsDistanceAndSnapshot() {
        MobCandidate candidate = new MobCandidate(42.0, fullMob());
        assertEquals(42.0, candidate.distanceSq());
        assertEquals("Wolf", candidate.snapshot().type());
    }
}
