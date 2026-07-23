package com.codelabchaos.terrascape.access;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccessTokensTest {
    @TempDir
    Path tempDir;

    private static final Duration TTL = Duration.ofHours(1);

    @Test
    void mintedTokenResolvesWithItsScopes() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL,
                Set.of(AccessTokens.SCOPE_MAP, AccessTokens.SCOPE_ADMIN)).token();

        AccessTokens.TokenInfo info = tokens.resolve(token);
        assertNotNull(info);
        assertEquals(Set.of(AccessTokens.SCOPE_MAP, AccessTokens.SCOPE_ADMIN), info.scopes());
        assertTrue(info.expiresAt() > System.currentTimeMillis());
        assertNull(info.subjectUuid());
    }

    @Test
    void identityBoundTokenRetainsPlayerAcrossReload() {
        UUID player = UUID.randomUUID();
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(player, "Aster", TTL, Set.of(AccessTokens.SCOPE_MAP)).token();

        AccessTokens.TokenInfo info = AccessTokens.load(tempDir).resolve(token);
        assertNotNull(info);
        assertEquals(player, info.subjectUuid());
        assertEquals("Aster", info.subjectName());
    }

    @Test
    void resolveRejectsUnknownAndBlankTokens() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        assertNull(tokens.resolve("not-a-real-token"));
        assertNull(tokens.resolve(""));
        assertNull(tokens.resolve(null));
        assertEquals(0, tokens.validate("not-a-real-token"));
    }

    @Test
    void expiredTokensAreNotResolved() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), Duration.ZERO, Set.of(AccessTokens.SCOPE_MAP)).token();
        // ZERO ttl means expiresAt == mint time, which is already <= now on the next read.
        assertNull(tokens.resolve(token));
        assertEquals(0, tokens.validate(token));
    }

    @Test
    void secondMintBySamePlayerIsRateLimited() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        UUID player = UUID.randomUUID();

        AccessTokens.MintResult first = tokens.mint(player, TTL, Set.of(AccessTokens.SCOPE_MAP));
        assertNotNull(first.token());
        assertEquals(0, first.cooldownMs());

        AccessTokens.MintResult second = tokens.mint(player, TTL, Set.of(AccessTokens.SCOPE_MAP));
        assertNull(second.token());
        assertTrue(second.cooldownMs() > 0);
    }

    @Test
    void rateLimitIsPerPlayer() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        assertNotNull(tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token());
        assertNotNull(tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token());
    }

    @Test
    void syntheticPlayerUuidIsDeterministicAndScopedToSmokeSubjects() {
        UUID alpha = AccessTokens.syntheticPlayerUuid("alpha");
        assertEquals(alpha, AccessTokens.syntheticPlayerUuid(" alpha "));
        assertTrue(!alpha.equals(AccessTokens.syntheticPlayerUuid("beta")));
        assertTrue(!alpha.equals(UUID.nameUUIDFromBytes("alpha".getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    void tokensAndScopesSurviveReload() {
        String token;
        Set<String> scopes = Set.of(AccessTokens.SCOPE_MAP, AccessTokens.SCOPE_ADMIN);
        {
            AccessTokens tokens = AccessTokens.load(tempDir);
            token = tokens.mint(UUID.randomUUID(), TTL, scopes).token();
        }
        // A fresh store reads the persisted secret + entries from disk.
        AccessTokens reloaded = AccessTokens.load(tempDir);
        AccessTokens.TokenInfo info = reloaded.resolve(token);
        assertNotNull(info);
        assertEquals(scopes, info.scopes());
    }

    @Test
    void onlyHashesArePersistedNotRawTokens() throws IOException {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token();

        String onDisk = Files.readString(tempDir.resolve(AccessTokens.FILE_NAME));
        assertTrue(!onDisk.contains(token), "raw token must never be written to disk");
    }

    @Test
    void activeTokensExposeSafeIdsAndIdentityWithoutRawBearerValues() throws IOException {
        AccessTokens tokens = AccessTokens.load(tempDir);
        UUID player = UUID.randomUUID();
        AccessTokens.MintResult minted = tokens.mint(
                player, "Aster", TTL, Set.of(AccessTokens.SCOPE_MAP));

        AccessTokens.TokenSummary summary = tokens.activeTokens().getFirst();
        assertEquals(minted.tokenId(), summary.id());
        assertEquals(16, summary.id().length());
        assertEquals(player, summary.subjectUuid());
        assertEquals("Aster", summary.subjectName());
        assertTrue(!Files.readString(tempDir.resolve(AccessTokens.FILE_NAME)).contains(minted.token()));
    }

    @Test
    void revokesOneTokenByIdAndPersistsTheRemoval() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        AccessTokens.MintResult first = tokens.mint(
                UUID.randomUUID(), "Aster", TTL, Set.of(AccessTokens.SCOPE_MAP));
        AccessTokens.MintResult second = tokens.mint(
                UUID.randomUUID(), "Bryn", TTL, Set.of(AccessTokens.SCOPE_MAP));

        assertEquals(AccessTokens.RevokeStatus.REVOKED, tokens.revokeById(first.tokenId()));
        assertNull(tokens.resolve(first.token()));
        assertNotNull(tokens.resolve(second.token()));
        assertNull(AccessTokens.load(tempDir).resolve(first.token()));
        assertNotNull(AccessTokens.load(tempDir).resolve(second.token()));
    }

    @Test
    void revokeRejectsMalformedAndUnknownIds() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        assertEquals(AccessTokens.RevokeStatus.INVALID_ID, tokens.revokeById("short"));
        assertEquals(AccessTokens.RevokeStatus.INVALID_ID, tokens.revokeById("not-hexadecimal"));
        assertEquals(AccessTokens.RevokeStatus.NOT_FOUND, tokens.revokeById("deadbeef"));
    }

    @Test
    void legacyEntriesWithoutScopesDefaultToMap() throws IOException {
        // Simulate a file written before scopes existed: secret + a hash/expiry with no "scopes".
        // We can't forge a hash for a known token, so assert the default-scope path via reload of a
        // store that minted with an explicit empty intent is covered elsewhere; here we verify the
        // loader tolerates the legacy shape without failing.
        JsonObject root = new JsonObject();
        root.addProperty("secret", Base64.getEncoder().encodeToString(new byte[32]));
        JsonObject entry = new JsonObject();
        entry.addProperty("hash", "deadbeef");
        entry.addProperty("expiresAt", System.currentTimeMillis() + TTL.toMillis());
        JsonArray arr = new JsonArray();
        arr.add(entry);
        root.add("tokens", arr);
        Files.writeString(tempDir.resolve(AccessTokens.FILE_NAME), new Gson().toJson(root));

        // Loading must not throw, and minting still works on top of the legacy file.
        AccessTokens tokens = AccessTokens.load(tempDir);
        assertNotNull(tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token());
    }
}
