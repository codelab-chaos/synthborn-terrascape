package com.codelabchaos.terrascape.web;

import javax.annotation.Nonnull;
import java.util.List;
import java.util.stream.Collectors;

import static com.codelabchaos.terrascape.web.Json.escapeJson;

/** Serializes the combined players + mobs payload for the SSE entity stream. Pure given its inputs. */
final class EntityFeed {
    private EntityFeed() {
    }

    static String toJson(@Nonnull String worldName,
                         long intervalMs,
                         @Nonnull List<PlayerSnapshot> players,
                         @Nonnull MobFeedSnapshot mobFeed) {
        String playerJson = players.stream()
                .map(PlayerSnapshot::toJson)
                .collect(Collectors.joining(","));
        String mobJson = mobFeed.mobs().stream()
                .map(MobSnapshot::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true,\"world\":\"" + escapeJson(worldName) + "\""
                + ",\"intervalMs\":" + intervalMs
                + ",\"players\":[" + playerJson + "]"
                + ",\"mobs\":[" + mobJson + "]"
                + ",\"mobRadar\":" + Math.round(mobFeed.radar())
                + ",\"mobRadarPlayers\":" + mobFeed.players()
                + ",\"mobSourceStats\":" + mobFeed.stats().toJson()
                + "}";
    }
}
