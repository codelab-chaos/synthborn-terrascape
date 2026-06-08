package com.codelabchaos.terrascape;

import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.protocol.Direction;
import com.hypixel.hytale.protocol.Packet;
import com.hypixel.hytale.protocol.packets.player.ClientMovement;
import com.hypixel.hytale.server.core.io.adapter.PacketAdapters;
import com.hypixel.hytale.server.core.io.adapter.PacketFilter;
import com.hypixel.hytale.server.core.io.adapter.PlayerPacketFilter;
import com.hypixel.hytale.server.core.universe.PlayerRef;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * Caches the player's true client camera orientation from ClientMovement.lookOrientation.
 *
 * <p>TransformComponent rotation is body-level and can report pitch as zero while the player
 * looks up or down. The movement packet carries the camera/head look in radians.
 */
public final class PlayerLookTracker {
    private static final long FRESH_MS = 5 * 60_000L;

    private final SynthTerrascapePlugin plugin;
    private final Map<UUID, Look> latest = new ConcurrentHashMap<>();
    private PacketFilter inboundFilter;

    public PlayerLookTracker(@Nonnull SynthTerrascapePlugin plugin) {
        this.plugin = plugin;
    }

    public void register() {
        if (inboundFilter != null) return;
        inboundFilter = PacketAdapters.registerInbound((PlayerPacketFilter) this::onInboundPacket);
        plugin.getLogger().at(Level.INFO).log("[player-look] tracking ClientMovement.lookOrientation");
    }

    public void shutdown() {
        PacketFilter filter = inboundFilter;
        inboundFilter = null;
        if (filter != null) {
            PacketAdapters.deregisterInbound(filter);
        }
        latest.clear();
    }

    @Nullable
    public Snapshot snapshot(@Nonnull PlayerRef playerRef, @Nullable Rotation3f fallback) {
        UUID uuid = playerRef.getUuid();
        if (uuid == null) {
            return fallback == null ? null : new Snapshot(fallback, "transform_component", -1, false);
        }
        Look look = latest.get(uuid);
        long now = System.currentTimeMillis();
        if (look != null) {
            long ageMs = now - look.atMillis();
            if (ageMs <= FRESH_MS) {
                Rotation3f rotation = new Rotation3f(
                        (float) look.pitchDeg(), (float) look.yawDeg(), (float) look.rollDeg());
                return new Snapshot(rotation, "client_movement", ageMs, true);
            }
        }
        return fallback == null ? null : new Snapshot(fallback, "transform_component", -1, false);
    }

    private boolean onInboundPacket(PlayerRef playerRef, Packet packet) {
        if (playerRef == null || !(packet instanceof ClientMovement movement)) {
            return false;
        }
        UUID uuid = playerRef.getUuid();
        Direction look = movement.lookOrientation;
        if (uuid == null || look == null) {
            return false;
        }

        latest.put(uuid, new Look(
                Math.toDegrees(look.yaw),
                Math.toDegrees(look.pitch),
                Math.toDegrees(look.roll),
                System.currentTimeMillis()));
        return false;
    }

    public record Snapshot(@Nonnull Rotation3f rotation,
                           @Nonnull String source,
                           long ageMillis,
                           boolean fromClientMovement) {}

    private record Look(double yawDeg, double pitchDeg, double rollDeg, long atMillis) {}
}
