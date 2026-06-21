package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerDtosTest {

    private static PlayerSkinSnapshot skin() {
        return new PlayerSkinSnapshot("skinkey", "body", "", "face", "", "", "", "", "hair",
                "", "", "", "", "", "", "", "", "", "", "", "cape");
    }

    @Test
    void playerSnapshotJsonWithoutSkin() {
        String json = new PlayerSnapshot("abc-123", "Steve Jobs", 1.0, 2.0, 3.0, 90f, 45f, null).toJson();
        assertTrue(json.contains("\"uuid\":\"abc-123\""));
        assertTrue(json.contains("\"name\":\"Steve Jobs\""));
        // avatarUrl uses safe token + URL-encoded name
        assertTrue(json.contains("/api/player-avatar/abc-123.png?name=Steve+Jobs"));
        assertFalse(json.contains("\"skin\""));
        assertTrue(json.contains("\"yaw\":90.0"));
    }

    @Test
    void playerSnapshotJsonWithSkinEmbedsSkinAndKeyInAvatarToken() {
        String json = new PlayerSnapshot("u1", "Bob", 0, 0, 0, 0f, 0f, skin()).toJson();
        assertTrue(json.contains("\"skin\":{"));
        assertTrue(json.contains("/api/player-avatar/u1-skinkey.png"));
    }

    @Test
    void playerSkinSnapshotJsonOmitsBlankFields() {
        String json = skin().toJson();
        assertTrue(json.contains("\"key\":\"skinkey\""));
        assertTrue(json.contains("\"bodyCharacteristic\":\"body\""));
        assertTrue(json.contains("\"cape\":\"cape\""));
        assertFalse(json.contains("\"underwear\"")); // blank → omitted
        assertFalse(json.contains("\"eyes\""));
    }

    @Test
    void worldTimeSnapshotJsonAndPhase() {
        String json = new WorldTimeSnapshot(12, 0.5, 2, 0.9, "Day 1", 0.1, 0.9, 0.2).toJson("world");
        assertTrue(json.contains("\"ok\":true"));
        assertTrue(json.contains("\"world\":\"world\""));
        assertTrue(json.contains("\"hour\":12"));
        assertTrue(json.contains("\"phase\":\"noon\"")); // dayProgress 0.5
        assertTrue(json.contains("\"dayProgress\":0.5"));
        assertTrue(json.contains("\"sunDirection\":{"));
    }

    @Test
    void worldTimePhaseBoundaries() {
        assertTrue(new WorldTimeSnapshot(0, 0.0, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"midnight\""));
        assertTrue(new WorldTimeSnapshot(0, 0.25, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"sunrise\""));
        assertTrue(new WorldTimeSnapshot(0, 0.60, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"afternoon\""));
        assertTrue(new WorldTimeSnapshot(0, 0.75, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"sunset\""));
    }
}
