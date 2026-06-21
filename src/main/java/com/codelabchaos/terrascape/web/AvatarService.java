package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.config.TerrascapeConfig;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.logging.Level;

import static com.codelabchaos.terrascape.web.QueryParams.safeName;

/**
 * Serves player avatar PNGs: a TTL'd on-disk cache backed by a fetch from the external Hyvatar
 * render service. Size and TTL come from {@code entities.*} config.
 */
final class AvatarService {
    private static final String RENDER_BASE_URL = "https://hyvatar.io/render/";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;

    AvatarService(@Nonnull TerrascapeConfig config, @Nonnull TerrascapePlugin plugin) {
        this.config = config;
        this.plugin = plugin;
    }

    @Nullable
    byte[] readOrFetch(@Nonnull String uuid, @Nullable String username, @Nullable String skinKey) {
        String cacheToken = safeName(uuid) + (skinKey == null || skinKey.isBlank() ? "" : "-" + safeName(skinKey));
        Path cachePath = config.folders().playerAvatarsDir()
                .resolve(cacheToken + ".png");
        try {
            if (Files.isRegularFile(cachePath)) {
                long ageMs = System.currentTimeMillis() - Files.getLastModifiedTime(cachePath).toMillis();
                if (ageMs <= config.entities().playerAvatarCacheTtl().toMillis()) {
                    return Files.readAllBytes(cachePath);
                }
            }
        } catch (IOException ignored) {
        }

        if (username == null || username.isBlank()) {
            return null;
        }

        byte[] bytes = fetch(username);
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        try {
            Files.createDirectories(cachePath.getParent());
            Files.write(cachePath, bytes);
            plugin.getLogger().at(Level.INFO).log("Cached player avatar from Hyvatar: " + username + " (" + uuid + ")");
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).withCause(e).log("Unable to cache player avatar: " + username);
        }
        return bytes;
    }

    @Nullable
    private byte[] fetch(@Nonnull String username) {
        String encodedName = URLEncoder.encode(username, StandardCharsets.UTF_8);
        URI uri = URI.create(RENDER_BASE_URL + encodedName + "?size=" + config.entities().playerAvatarSize());
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] body = response.body();
            if (response.statusCode() != 200 || body == null || body.length == 0 || body.length > config.entities().maxPlayerAvatarBytes()) {
                plugin.getLogger().at(Level.FINE).log("Player avatar fetch failed for " + username
                        + ": status=" + response.statusCode()
                        + " bytes=" + (body == null ? 0 : body.length));
                return null;
            }
            return body;
        } catch (Exception e) {
            plugin.getLogger().at(Level.FINE).withCause(e).log("Player avatar fetch failed for " + username);
            return null;
        }
    }
}
