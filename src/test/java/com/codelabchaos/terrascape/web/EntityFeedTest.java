package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class EntityFeedTest {

    @Test
    void toJsonCombinesPlayersAndMobs() {
        PlayerSnapshot player = new PlayerSnapshot("u", "Bob", 1, 2, 3, 0f, 0f, null);
        MobSnapshot mob = new MobSnapshot("m", "Wolf", "Wolf", "hostile", 0, 0, 0, null, "#fff",
                "src", null, null, null, null, null, null, null, null, null, null, null);
        MobFeedSnapshot feed = new MobFeedSnapshot(List.of(mob), new MobScanStats(), 1, 500.0, 256);

        String json = EntityFeed.toJson("world", 1000, List.of(player), feed);
        assertTrue(json.contains("\"ok\":true"));
        assertTrue(json.contains("\"world\":\"world\""));
        assertTrue(json.contains("\"intervalMs\":1000"));
        assertTrue(json.contains("\"players\":[{"));
        assertTrue(json.contains("\"mobs\":[{"));
        assertTrue(json.contains("\"mobRadar\":500"));
        assertTrue(json.contains("\"mobRadarPlayers\":1"));
        assertTrue(json.contains("\"mobSourceStats\":{"));
    }

    @Test
    void toJsonHandlesEmptyFeeds() {
        String json = EntityFeed.toJson("w", 0, List.of(), MobFeedSnapshot.empty());
        assertTrue(json.contains("\"players\":[]"));
        assertTrue(json.contains("\"mobs\":[]"));
    }
}
