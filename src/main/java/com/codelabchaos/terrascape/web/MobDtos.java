package com.codelabchaos.terrascape.web;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

import static com.codelabchaos.terrascape.web.Json.escapeJson;
import static com.codelabchaos.terrascape.web.Json.round3;

// Mob feed data shapes + scan diagnostics, serialized for /api/mobs and /api/mob-debug.
// Grouped as package-private top-level types so the web package references them unqualified.
// MobScanStats members are package-private so the (still-in-server) scan collectors can populate it.

record MobFeedSnapshot(List<MobSnapshot> mobs, MobScanStats stats, int players, double radar, int max) {
    static MobFeedSnapshot empty() {
        return new MobFeedSnapshot(List.of(), new MobScanStats(), 0,
                TerrascapeWebServer.MOB_RADAR_RADIUS, TerrascapeWebServer.MAX_MOB_SNAPSHOTS);
    }

    String toJson(@Nonnull String worldName) {
        String mobJson = mobs.stream()
                .map(MobSnapshot::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true"
                + ",\"world\":\"" + escapeJson(worldName) + "\""
                + ",\"max\":" + max
                + ",\"radar\":" + Math.round(radar)
                + ",\"players\":" + players
                + ",\"mobs\":[" + mobJson + "]"
                + ",\"sourceStats\":" + stats.toJson()
                + "}";
    }
}

record MobSnapshot(
        String id,
        String type,
        String label,
        String category,
        double x,
        double y,
        double z,
        Float yaw,
        String color,
        String source,
        String role,
        String nameTranslationKey,
        Integer npcTypeIndex,
        Integer roleIndex,
        String modelAsset,
        String persistentModelAsset,
        String liveRoleId,
        String liveRoleCategory,
        String liveRolePath,
        Double health,
        Double maxHealth) {
    String toJson() {
        return "{\"id\":\"" + escapeJson(id) + "\""
                + ",\"type\":\"" + escapeJson(type) + "\""
                + ",\"label\":\"" + escapeJson(label) + "\""
                + ",\"category\":\"" + escapeJson(category) + "\""
                + ",\"x\":" + x
                + ",\"y\":" + y
                + ",\"z\":" + z
                + (yaw == null ? "" : ",\"yaw\":" + yaw)
                + ",\"color\":\"" + escapeJson(color) + "\""
                + ",\"source\":\"" + escapeJson(source) + "\""
                + (role == null ? "" : ",\"role\":\"" + escapeJson(role) + "\"")
                + (nameTranslationKey == null ? "" : ",\"nameTranslationKey\":\"" + escapeJson(nameTranslationKey) + "\"")
                + (npcTypeIndex == null ? "" : ",\"npcTypeIndex\":" + npcTypeIndex)
                + (roleIndex == null ? "" : ",\"roleIndex\":" + roleIndex)
                + (modelAsset == null ? "" : ",\"modelAsset\":\"" + escapeJson(modelAsset) + "\"")
                + (persistentModelAsset == null ? "" : ",\"persistentModelAsset\":\"" + escapeJson(persistentModelAsset) + "\"")
                + (liveRoleId == null ? "" : ",\"liveRoleId\":\"" + escapeJson(liveRoleId) + "\"")
                + (liveRoleCategory == null ? "" : ",\"liveRoleCategory\":\"" + escapeJson(liveRoleCategory) + "\"")
                + (liveRolePath == null ? "" : ",\"liveRolePath\":\"" + escapeJson(liveRolePath) + "\"")
                + (health == null ? "" : ",\"health\":" + round3(health))
                + (maxHealth == null ? "" : ",\"maxHealth\":" + round3(maxHealth))
                + "}";
    }
}

record MobCandidate(double distanceSq, MobSnapshot snapshot) {
}

record NearbyCandidate(int id, String type, double distance, double x, double y, double z, String flags) {
    String summary() {
        return type + "#" + id
                + " d=" + Math.round(distance)
                + " @" + Math.round(x) + "," + Math.round(y) + "," + Math.round(z)
                + (flags.isBlank() ? "" : " [" + flags + "]");
    }
}

record NearbyDebugCandidate(
        int id,
        String type,
        String reason,
        double distance,
        double x,
        double y,
        double z,
        boolean npc,
        boolean player,
        @Nullable String role,
        @Nullable String modelAsset,
        @Nullable String persistentModelAsset,
        @Nullable String liveRoleId,
        String archetype) {
    String toJson() {
        return "{\"id\":" + id
                + ",\"type\":\"" + escapeJson(type) + "\""
                + ",\"reason\":\"" + escapeJson(reason) + "\""
                + ",\"distance\":" + round3(distance)
                + ",\"x\":" + round3(x)
                + ",\"y\":" + round3(y)
                + ",\"z\":" + round3(z)
                + ",\"npc\":" + npc
                + ",\"player\":" + player
                + (role == null ? "" : ",\"role\":\"" + escapeJson(role) + "\"")
                + (modelAsset == null ? "" : ",\"modelAsset\":\"" + escapeJson(modelAsset) + "\"")
                + (persistentModelAsset == null ? "" : ",\"persistentModelAsset\":\"" + escapeJson(persistentModelAsset) + "\"")
                + (liveRoleId == null ? "" : ",\"liveRoleId\":\"" + escapeJson(liveRoleId) + "\"")
                + ",\"archetype\":\"" + escapeJson(MobScanStats.shorten(archetype)) + "\""
                + "}";
    }
}

final class MobScanStats {
    final LinkedHashMap<String, Integer> sources = new LinkedHashMap<>();
    final LinkedHashMap<String, Integer> archetypes = new LinkedHashMap<>();
    final LinkedHashMap<String, Integer> acceptedTypes = new LinkedHashMap<>();
    final LinkedHashMap<String, Integer> skippedTypes = new LinkedHashMap<>();
    int chunks;
    int entities;
    int accepted;
    int duplicates;
    int skippedPlayers;
    int skippedNonMobs;
    int skippedOutsideRadar;
    int invalidRefs;
    int noTransform;
    int noPosition;
    int errors;
    int liveRoleMatches;
    int storeEntities;
    int npcEntities;
    int transformEntities;
    int networkSendableEntities;
    int viewerVisible;
    int viewerSent;
    int spatialSources;
    int spatialIndexed;
    int spatialRefs;

    void addArchetype(@Nonnull String archetype) {
        archetypes.merge(shorten(archetype), 1, Integer::sum);
    }

    void addSource(@Nonnull String source) {
        sources.merge(source, 1, Integer::sum);
    }

    void addType(@Nonnull String type) {
        acceptedTypes.merge(type, 1, Integer::sum);
    }

    void addSkippedType(@Nonnull String type) {
        skippedTypes.merge(type, 1, Integer::sum);
    }

    String preview(@Nonnull LinkedHashMap<String, Integer> values) {
        if (values.isEmpty()) {
            return "none";
        }
        return values.entrySet().stream()
                .limit(TerrascapeWebServer.MAX_MOB_DEBUG_SUMMARY_ITEMS)
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("|"));
    }

    String toJson() {
        return "{\"source\":\"" + escapeJson(preview(sources)) + "\""
                + ",\"storeEntities\":" + storeEntities
                + ",\"npcEntities\":" + npcEntities
                + ",\"transformEntities\":" + transformEntities
                + ",\"networkSendableEntities\":" + networkSendableEntities
                + ",\"chunks\":" + chunks
                + ",\"entities\":" + entities
                + ",\"accepted\":" + accepted
                + ",\"duplicates\":" + duplicates
                + ",\"players\":" + skippedPlayers
                + ",\"nonMob\":" + skippedNonMobs
                + ",\"outsideRadar\":" + skippedOutsideRadar
                + ",\"invalid\":" + invalidRefs
                + ",\"noTransform\":" + noTransform
                + ",\"noPosition\":" + noPosition
                + ",\"errors\":" + errors
                + ",\"liveRoleMatches\":" + liveRoleMatches
                + ",\"viewerVisible\":" + viewerVisible
                + ",\"viewerSent\":" + viewerSent
                + ",\"spatialSources\":" + spatialSources
                + ",\"spatialIndexed\":" + spatialIndexed
                + ",\"spatialRefs\":" + spatialRefs
                + ",\"types\":\"" + escapeJson(preview(acceptedTypes)) + "\""
                + ",\"skippedTypes\":\"" + escapeJson(preview(skippedTypes)) + "\""
                + ",\"archetypes\":\"" + escapeJson(preview(archetypes)) + "\""
                + "}";
    }

    static String shorten(@Nonnull String value) {
        String compact = value
                .replace("com.hypixel.hytale.server.core.", "")
                .replace("com.hypixel.hytale.server.", "")
                .replace("com.hypixel.hytale.", "");
        return compact.length() <= 140 ? compact : compact.substring(0, 137) + "...";
    }
}
