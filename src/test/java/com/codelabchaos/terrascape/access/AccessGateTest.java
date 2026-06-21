package com.codelabchaos.terrascape.access;

import com.codelabchaos.terrascape.testsupport.FakeHttpExchange;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccessGateTest {
    @TempDir
    Path tempDir;

    private static final Duration TTL = Duration.ofHours(1);

    @Test
    void publicModeAllowsEverythingWithoutToken() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        AccessGate gate = new AccessGate(tokens, () -> false);

        assertTrue(gate.authorize(exchange("/", null, null)));
    }

    @Test
    void restrictedModeRejectsWhenNoTokenPresented() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        AccessGate gate = new AccessGate(tokens, () -> true);

        assertFalse(gate.authorize(exchange("/", null, null)));
    }

    @Test
    void restrictedModeAcceptsValidQueryKeyAndPromotesItToACookie() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token();
        AccessGate gate = new AccessGate(tokens, () -> true);

        FakeHttpExchange exchange = exchange("/?key=" + token, null, null);
        assertTrue(gate.authorize(exchange));

        String setCookie = exchange.getResponseHeaders().getFirst("Set-Cookie");
        assertTrue(setCookie != null && setCookie.startsWith(AccessGate.COOKIE_NAME + "=" + token),
                "expected the query key to be promoted to a session cookie, got: " + setCookie);
        assertTrue(setCookie.contains("HttpOnly"));
    }

    @Test
    void restrictedModeAcceptsValidSessionCookie() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token();
        AccessGate gate = new AccessGate(tokens, () -> true);

        FakeHttpExchange exchange = exchange("/api/worlds", AccessGate.COOKIE_NAME + "=" + token, null);
        assertTrue(gate.authorize(exchange));
        // A cookie-borne token is already stored client-side; do not re-set it.
        assertNull(exchange.getResponseHeaders().getFirst("Set-Cookie"));
    }

    @Test
    void restrictedModeAcceptsValidBearerHeader() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token();
        AccessGate gate = new AccessGate(tokens, () -> true);

        assertTrue(gate.authorize(exchange("/api/terrain", null, "Bearer " + token)));
    }

    @Test
    void restrictedModeRejectsUnknownToken() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        AccessGate gate = new AccessGate(tokens, () -> true);

        assertFalse(gate.authorize(exchange("/?key=not-a-real-token", null, null)));
    }

    @Test
    void stashesTokenScopesOnTheExchange() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL,
                Set.of(AccessTokens.SCOPE_MAP, AccessTokens.SCOPE_ADMIN)).token();
        AccessGate gate = new AccessGate(tokens, () -> true);

        FakeHttpExchange exchange = exchange("/api/mob-debug/world", AccessGate.COOKIE_NAME + "=" + token, null);
        assertTrue(gate.authorize(exchange));
        assertTrue(AccessGate.hasScope(exchange, AccessTokens.SCOPE_ADMIN));
        assertTrue(AccessGate.hasScope(exchange, AccessTokens.SCOPE_MAP));
    }

    @Test
    void mapOnlyTokenDoesNotGrantAdminScope() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL, Set.of(AccessTokens.SCOPE_MAP)).token();
        AccessGate gate = new AccessGate(tokens, () -> true);

        FakeHttpExchange exchange = exchange("/api/mob-debug/world", AccessGate.COOKIE_NAME + "=" + token, null);
        assertTrue(gate.authorize(exchange));
        assertFalse(AccessGate.hasScope(exchange, AccessTokens.SCOPE_ADMIN));
    }

    @Test
    void publicModeStillStashesScopesWhenTokenPresented() {
        AccessTokens tokens = AccessTokens.load(tempDir);
        String token = tokens.mint(UUID.randomUUID(), TTL,
                Set.of(AccessTokens.SCOPE_MAP, AccessTokens.SCOPE_ADMIN)).token();
        AccessGate gate = new AccessGate(tokens, () -> false);

        FakeHttpExchange exchange = exchange("/api/mob-debug/world", AccessGate.COOKIE_NAME + "=" + token, null);
        assertTrue(gate.authorize(exchange));
        assertTrue(AccessGate.hasScope(exchange, AccessTokens.SCOPE_ADMIN));
    }

    private static FakeHttpExchange exchange(String uri, String cookieHeader, String authHeader) {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", uri);
        if (cookieHeader != null) {
            exchange.header("Cookie", cookieHeader);
        }
        if (authHeader != null) {
            exchange.header("Authorization", authHeader);
        }
        return exchange;
    }
}
