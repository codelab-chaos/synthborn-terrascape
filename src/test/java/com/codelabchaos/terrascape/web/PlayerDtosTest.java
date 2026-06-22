package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.protocol.PlayerSkin;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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

    @Test
    void worldTimePhaseCoversEveryBand() {
        // Exercise every branch of the private dayPhase ladder via toJson.
        assertTrue(new WorldTimeSnapshot(0, 0.95, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"midnight\"")); // >= 0.92
        assertTrue(new WorldTimeSnapshot(0, 0.10, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"night\"")); // < 0.20
        assertTrue(new WorldTimeSnapshot(0, 0.40, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"morning\"")); // < 0.46
        assertTrue(new WorldTimeSnapshot(0, 0.85, 0, 0, "", 0, 0, 0).toJson("w").contains("\"phase\":\"night\"")); // tail return
    }

    @Test
    void playerSnapshotEscapesQuotesInNameAndUuid() {
        // escapeJson is reached for both uuid and name fields.
        String json = new PlayerSnapshot("a\"b", "Q\"uote", 0, 0, 0, 0f, 0f, null).toJson();
        assertTrue(json.contains("\"uuid\":\"a\\\"b\""));
        assertTrue(json.contains("\"name\":\"Q\\\"uote\""));
    }

    @Test
    void skinSnapshotEmitsAllPopulatedFields() {
        // Every skinField branch with a non-blank value is serialized. Field order after key:
        // bodyCharacteristic, underwear, face, eyes, ears, mouth, facialHair, haircut, eyebrows,
        // pants, overpants, undertop, overtop, shoes, headAccessory, faceAccessory, earAccessory,
        // skinFeature, gloves, cape.
        PlayerSkinSnapshot full = new PlayerSkinSnapshot(
                "k", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "l",
                "m", "n", "o", "p", "q", "r", "s", "t", "u");
        String json = full.toJson();
        assertTrue(json.contains("\"bodyCharacteristic\":\"a\""));
        assertTrue(json.contains("\"mouth\":\"f\""));         // 6th field after key
        assertTrue(json.contains("\"facialHair\":\"g\""));    // 7th
        assertTrue(json.contains("\"earAccessory\":\"r\""));  // 17th
        assertTrue(json.contains("\"cape\":\"u\""));          // 20th / last
    }

    // NOTE: WorldTimeSnapshot.from(WorldTimeResource) is NOT unit-testable here. WorldTimeResource has
    // a public no-arg ctor, but its getDayProgress()/getSunDirection() dereference an internal
    // _gameTimeLocalDateTime that is only populated by the live time module, so calling from() on a
    // bare instance throws NPE. That path is engine-bound and intentionally left uncovered.

    @Test
    void skinSnapshotFromSkinDerivesKeyAndCopiesFields() throws Exception {
        // from(PlayerRef) needs a live EntityStore/Ref (engine-bound) so it is skipped; but the
        // pure mapping fromSkin(PlayerSkin) is reachable: PlayerSkin is a plain POJO with public
        // String fields and a no-arg ctor. Invoked via reflection because the method is private.
        PlayerSkin skin = new PlayerSkin();
        skin.bodyCharacteristic = "body";
        skin.face = "face";
        skin.haircut = "hair";
        skin.cape = "cape";
        // Leave the rest null so the value() null->"" branch is exercised too.

        Method fromSkin = PlayerSkinSnapshot.class.getDeclaredMethod("fromSkin", PlayerSkin.class);
        fromSkin.setAccessible(true);
        PlayerSkinSnapshot snapshot = (PlayerSkinSnapshot) fromSkin.invoke(null, skin);

        assertNotNull(snapshot);
        assertEquals("body", snapshot.bodyCharacteristic());
        assertEquals("face", snapshot.face());
        assertEquals("hair", snapshot.haircut());
        assertEquals("cape", snapshot.cape());
        // Null source fields are normalized to empty strings by value().
        assertEquals("", snapshot.underwear());
        assertEquals("", snapshot.gloves());
        // Key is a deterministic base-36 hash of the joined field data; same input -> same key.
        assertNotNull(snapshot.key());
        PlayerSkinSnapshot again = (PlayerSkinSnapshot) fromSkin.invoke(null, skin);
        assertEquals(snapshot.key(), again.key());
        // Blank fields are omitted from JSON; populated ones are present.
        String json = snapshot.toJson();
        assertTrue(json.contains("\"bodyCharacteristic\":\"body\""));
        assertFalse(json.contains("\"underwear\""));
    }
}
