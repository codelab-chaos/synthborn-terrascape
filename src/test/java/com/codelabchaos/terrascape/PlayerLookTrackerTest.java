package com.codelabchaos.terrascape;

import com.hypixel.hytale.math.vector.Rotation3f;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the public {@link PlayerLookTracker.Snapshot} contract. The tracker itself wires into the
 * Hytale packet pipeline and needs a live plugin + PlayerRef, so its capture/snapshot flow is
 * exercised by runtime tests, not here.
 */
class PlayerLookTrackerTest {

    @Test
    void snapshotExposesItsComponents() {
        Rotation3f rotation = new Rotation3f(10f, 20f, 30f);
        PlayerLookTracker.Snapshot snapshot =
                new PlayerLookTracker.Snapshot(rotation, "client_movement", 1234L, true);

        assertEquals(rotation, snapshot.rotation());
        assertEquals("client_movement", snapshot.source());
        assertEquals(1234L, snapshot.ageMillis());
        assertTrue(snapshot.fromClientMovement());
    }

    @Test
    void transformFallbackSnapshotIsMarkedNotFromClientMovement() {
        PlayerLookTracker.Snapshot snapshot =
                new PlayerLookTracker.Snapshot(new Rotation3f(0f, 0f, 0f), "transform_component", -1L, false);

        assertEquals("transform_component", snapshot.source());
        assertEquals(-1L, snapshot.ageMillis());
        assertEquals(false, snapshot.fromClientMovement());
    }
}
