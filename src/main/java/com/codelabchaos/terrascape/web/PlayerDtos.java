package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.protocol.PlayerSkin;
import com.hypixel.hytale.server.core.modules.entity.player.PlayerSkinComponent;
import com.hypixel.hytale.server.core.modules.time.WorldTimeResource;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import org.joml.Vector3d;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import static com.codelabchaos.terrascape.web.Json.escapeJson;
import static com.codelabchaos.terrascape.web.Json.round3;
import static com.codelabchaos.terrascape.web.QueryParams.safeName;

// Player, skin, and world-time data shapes for /api/players, /api/player-avatar, and /api/time.
// Grouped as package-private top-level records so the web package references them unqualified.

record PlayerSnapshot(String uuid, String name, double x, double y, double z, float yaw, float pitch,
                      @Nullable PlayerSkinSnapshot skin) {
    String toJson() {
        return "{\"uuid\":\"" + escapeJson(uuid) + "\""
                + ",\"name\":\"" + escapeJson(name) + "\""
                + ",\"avatarUrl\":\"" + escapeJson(avatarUrl()) + "\""
                + (skin == null ? "" : ",\"skin\":" + skin.toJson())
                + ",\"x\":" + x
                + ",\"y\":" + y
                + ",\"z\":" + z
                + ",\"yaw\":" + yaw
                + ",\"pitch\":" + pitch
                + "}";
    }

    private String avatarUrl() {
        String avatarToken = safeName(uuid) + (skin == null ? "" : "-" + safeName(skin.key()));
        return "/api/player-avatar/" + avatarToken + ".png?name="
                + URLEncoder.encode(name, StandardCharsets.UTF_8);
    }
}

record PlayerSkinSnapshot(
        String key,
        String bodyCharacteristic,
        String underwear,
        String face,
        String eyes,
        String ears,
        String mouth,
        String facialHair,
        String haircut,
        String eyebrows,
        String pants,
        String overpants,
        String undertop,
        String overtop,
        String shoes,
        String headAccessory,
        String faceAccessory,
        String earAccessory,
        String skinFeature,
        String gloves,
        String cape) {
    @Nullable
    static PlayerSkinSnapshot from(@Nonnull PlayerRef playerRef) {
        try {
            Ref<EntityStore> ref = playerRef.getReference();
            if (ref == null || !ref.isValid()) {
                return null;
            }
            PlayerSkinComponent skinComponent = ref.getStore().getComponent(ref, PlayerSkinComponent.getComponentType());
            if (skinComponent == null || skinComponent.getPlayerSkin() == null) {
                return null;
            }
            PlayerSkin skin = skinComponent.getPlayerSkin();
            return fromSkin(skin);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static PlayerSkinSnapshot fromSkin(@Nonnull PlayerSkin skin) {
        String data = String.join("|",
                value(skin.bodyCharacteristic),
                value(skin.underwear),
                value(skin.face),
                value(skin.eyes),
                value(skin.ears),
                value(skin.mouth),
                value(skin.facialHair),
                value(skin.haircut),
                value(skin.eyebrows),
                value(skin.pants),
                value(skin.overpants),
                value(skin.undertop),
                value(skin.overtop),
                value(skin.shoes),
                value(skin.headAccessory),
                value(skin.faceAccessory),
                value(skin.earAccessory),
                value(skin.skinFeature),
                value(skin.gloves),
                value(skin.cape));
        return new PlayerSkinSnapshot(
                Integer.toUnsignedString(data.hashCode(), 36),
                value(skin.bodyCharacteristic),
                value(skin.underwear),
                value(skin.face),
                value(skin.eyes),
                value(skin.ears),
                value(skin.mouth),
                value(skin.facialHair),
                value(skin.haircut),
                value(skin.eyebrows),
                value(skin.pants),
                value(skin.overpants),
                value(skin.undertop),
                value(skin.overtop),
                value(skin.shoes),
                value(skin.headAccessory),
                value(skin.faceAccessory),
                value(skin.earAccessory),
                value(skin.skinFeature),
                value(skin.gloves),
                value(skin.cape));
    }

    private static String value(@Nullable String value) {
        return value == null ? "" : value;
    }

    String toJson() {
        return "{\"key\":\"" + escapeJson(key) + "\""
                + skinField("bodyCharacteristic", bodyCharacteristic)
                + skinField("underwear", underwear)
                + skinField("face", face)
                + skinField("eyes", eyes)
                + skinField("ears", ears)
                + skinField("mouth", mouth)
                + skinField("facialHair", facialHair)
                + skinField("haircut", haircut)
                + skinField("eyebrows", eyebrows)
                + skinField("pants", pants)
                + skinField("overpants", overpants)
                + skinField("undertop", undertop)
                + skinField("overtop", overtop)
                + skinField("shoes", shoes)
                + skinField("headAccessory", headAccessory)
                + skinField("faceAccessory", faceAccessory)
                + skinField("earAccessory", earAccessory)
                + skinField("skinFeature", skinFeature)
                + skinField("gloves", gloves)
                + skinField("cape", cape)
                + "}";
    }

    private static String skinField(@Nonnull String name, @Nullable String value) {
        return value == null || value.isBlank()
                ? ""
                : ",\"" + name + "\":\"" + escapeJson(value) + "\"";
    }
}

record WorldTimeSnapshot(
        int hour,
        double dayProgress,
        int moonPhase,
        double sunlightFactor,
        String dateTime,
        double sunX,
        double sunY,
        double sunZ) {

    static WorldTimeSnapshot from(@Nonnull WorldTimeResource time) {
        Vector3d sunDirection = time.getSunDirection();
        return new WorldTimeSnapshot(
                time.getCurrentHour(),
                time.getDayProgress(),
                time.getMoonPhase(),
                time.getSunlightFactor(),
                time.getGameDateTime() == null ? "" : time.getGameDateTime().toString(),
                sunDirection == null ? 0 : sunDirection.x,
                sunDirection == null ? 1 : sunDirection.y,
                sunDirection == null ? 0 : sunDirection.z);
    }

    String toJson(@Nonnull String worldName) {
        return "{\"ok\":true"
                + ",\"world\":\"" + escapeJson(worldName) + "\""
                + ",\"hour\":" + hour
                + ",\"dayProgress\":" + round3(dayProgress)
                + ",\"phase\":\"" + dayPhase(dayProgress) + "\""
                + ",\"moonPhase\":" + moonPhase
                + ",\"sunlightFactor\":" + round3(sunlightFactor)
                + ",\"dateTime\":\"" + escapeJson(dateTime) + "\""
                + ",\"sunDirection\":{\"x\":" + round3(sunX)
                + ",\"y\":" + round3(sunY)
                + ",\"z\":" + round3(sunZ)
                + "}}";
    }

    private static String dayPhase(double progress) {
        if (progress < 0.08 || progress >= 0.92) return "midnight";
        if (progress < 0.20) return "night";
        if (progress < 0.32) return "sunrise";
        if (progress < 0.46) return "morning";
        if (progress < 0.56) return "noon";
        if (progress < 0.70) return "afternoon";
        if (progress < 0.82) return "sunset";
        return "night";
    }
}
