package com.codelabchaos.terrascape.access;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Web-access tokens for the "restricted" viewer mode.
 *
 * <p>Tokens are anonymous bearer credentials minted in-game. The store keeps <b>only a one-way
 * HMAC hash</b> of each token plus its expiry and {@linkplain #SCOPE_MAP scopes} — never the token
 * itself — so usable tokens can't be listed or recovered from the file (one-way hashing, not
 * encryption). The raw token is shown to the player once, in the link. Validation re-hashes the
 * presented token and compares.
 *
 * <p>Scopes are a low-entropy capability snapshot taken from the minting player's permissions (for
 * example {@code map} for any permitted viewer, {@code admin} for a {@code terrascape.admin}
 * holder). They let the web layer authorize per-endpoint without a live permission lookup and
 * without storing player identity. Permission changes take effect on the next mint, bounded by TTL.
 *
 * <p>Minting is rate-limited per player with an ever-increasing backoff (in-memory only, so the
 * on-disk store reveals nothing about who minted). Expired hashes are purged lazily on each touch.
 */
public final class AccessTokens {

    /** Capability to open the web map. Held by any token minted by a permitted viewer. */
    public static final String SCOPE_MAP = "map";
    /** Capability to call admin-only web APIs. Minted only for {@code terrascape.admin} holders. */
    public static final String SCOPE_ADMIN = "admin";

    /** Result of a mint attempt: a token, or a non-zero cooldown if rate-limited. */
    public record MintResult(String token, long cooldownMs) {
    }

    /** A validated token's remaining life and granted capabilities. */
    public record TokenInfo(long expiresAt, @Nonnull Set<String> scopes) {
    }

    public static final String FILE_NAME = "access-tokens.json";

    // Ever-increasing cooldown between mints by the same player; index = consecutive mint count.
    private static final long[] BACKOFF_MS = {0L, 60_000L, 300_000L, 1_800_000L, 7_200_000L};
    private static final long RATE_RESET_MS = 24L * 60 * 60 * 1000; // idle this long → backoff resets
    private static final int MAX_TOKENS = 10_000; // hard cap so abuse can't grow the file unbounded

    private static final Gson GSON = new Gson();
    private static final SecureRandom RNG = new SecureRandom();
    private static final String SYNTHETIC_PLAYER_PREFIX = "terrascape-smoke:";

    /** One stored token: when it expires and what it may do. */
    private record Entry(long expiresAt, @Nonnull Set<String> scopes) {
    }

    private final Path file;
    private final byte[] secret;
    private final Map<String, Entry> tokens; // hash -> entry
    private final Map<UUID, long[]> rateState = new ConcurrentHashMap<>(); // uuid -> {lastMintAt, count}

    private AccessTokens(@Nonnull Path file, @Nonnull byte[] secret, @Nonnull Map<String, Entry> tokens) {
        this.file = file;
        this.secret = secret;
        this.tokens = tokens;
    }

    @Nonnull
    public static AccessTokens load(@Nonnull Path dataDirectory) {
        Path file = dataDirectory.resolve(FILE_NAME);
        try {
            if (Files.exists(file)) {
                JsonObject root = GSON.fromJson(Files.readString(file), JsonObject.class);
                byte[] secret = Base64.getDecoder().decode(root.get("secret").getAsString());
                Map<String, Entry> tokens = new LinkedHashMap<>();
                JsonArray arr = root.getAsJsonArray("tokens");
                if (arr != null) {
                    for (JsonElement element : arr) {
                        JsonObject entry = element.getAsJsonObject();
                        tokens.put(entry.get("hash").getAsString(),
                                new Entry(entry.get("expiresAt").getAsLong(), readScopes(entry)));
                    }
                }
                AccessTokens store = new AccessTokens(file, secret, tokens);
                store.purgeExpired();
                return store;
            }
        } catch (RuntimeException | IOException ignored) {
            // fall through to a fresh store
        }
        byte[] secret = new byte[32];
        RNG.nextBytes(secret);
        AccessTokens store = new AccessTokens(file, secret, new LinkedHashMap<>());
        store.save();
        return store;
    }

    /**
     * Deterministic synthetic player identity for console/RCON smoke validation. This exercises the
     * same minting path and per-player rate limiting as a real player without storing or requiring a
     * real player UUID.
     */
    @Nonnull
    public static UUID syntheticPlayerUuid(@Nonnull String label) {
        String normalized = label.trim().isEmpty() ? "default" : label.trim();
        return UUID.nameUUIDFromBytes((SYNTHETIC_PLAYER_PREFIX + normalized).getBytes(StandardCharsets.UTF_8));
    }

    /** Reads an entry's scopes, defaulting to {@link #SCOPE_MAP} for tokens written before scopes existed. */
    @Nonnull
    private static Set<String> readScopes(@Nonnull JsonObject entry) {
        JsonArray scopes = entry.getAsJsonArray("scopes");
        if (scopes == null || scopes.isEmpty()) {
            return Set.of(SCOPE_MAP);
        }
        Set<String> result = new LinkedHashSet<>();
        for (JsonElement scope : scopes) {
            result.add(scope.getAsString());
        }
        return Set.copyOf(result);
    }

    /** Mints a token for the player, or returns a cooldown if they minted too recently. */
    @Nonnull
    public synchronized MintResult mint(@Nonnull UUID player, @Nonnull Duration ttl, @Nonnull Set<String> scopes) {
        long now = System.currentTimeMillis();
        long[] state = rateState.get(player);
        int count = (state != null && now - state[0] < RATE_RESET_MS) ? (int) state[1] : 0;
        long required = BACKOFF_MS[Math.min(count, BACKOFF_MS.length - 1)];
        if (state != null && now - state[0] < required) {
            return new MintResult(null, required - (now - state[0]));
        }

        purgeExpired();
        String token = randomToken();
        tokens.put(hash(token), new Entry(now + ttl.toMillis(), Set.copyOf(scopes)));
        if (tokens.size() > MAX_TOKENS) {
            tokens.remove(tokens.keySet().iterator().next()); // evict oldest insertion
        }
        rateState.put(player, new long[]{now, count + 1});
        save();
        return new MintResult(token, 0);
    }

    /** Returns the token's expiry and scopes if valid and unexpired, otherwise {@code null}. */
    @Nullable
    public synchronized TokenInfo resolve(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        purgeExpired();
        Entry entry = tokens.get(hash(token));
        if (entry == null || entry.expiresAt() <= System.currentTimeMillis()) {
            return null;
        }
        return new TokenInfo(entry.expiresAt(), entry.scopes());
    }

    /** Returns the token's expiry (epoch ms) if valid and unexpired, otherwise 0. */
    public long validate(String token) {
        TokenInfo info = resolve(token);
        return info == null ? 0 : info.expiresAt();
    }

    private void purgeExpired() {
        long now = System.currentTimeMillis();
        tokens.entrySet().removeIf((entry) -> entry.getValue().expiresAt() <= now);
    }

    private static String randomToken() {
        byte[] bytes = new byte[24];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(@Nonnull String token) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC unavailable", e);
        }
    }

    private synchronized void save() {
        JsonObject root = new JsonObject();
        root.addProperty("secret", Base64.getEncoder().encodeToString(secret));
        JsonArray arr = new JsonArray();
        tokens.forEach((hash, entry) -> {
            JsonObject json = new JsonObject();
            json.addProperty("hash", hash);
            json.addProperty("expiresAt", entry.expiresAt());
            JsonArray scopes = new JsonArray();
            entry.scopes().forEach(scopes::add);
            json.add("scopes", scopes);
            arr.add(json);
        });
        root.add("tokens", arr);
        try {
            Files.writeString(file, GSON.toJson(root));
        } catch (IOException ignored) {
            // best-effort persistence; tokens still valid in memory until restart
        }
    }
}
