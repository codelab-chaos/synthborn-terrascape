package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.codelabchaos.terrascape.testsupport.FakeHttpExchange;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CorsPolicyTest {
    private static final String ORIGIN = "https://map.example.com";

    private static CorsPolicy policy(boolean enabled, String... origins) {
        return new CorsPolicy(new TerrascapeConfig.Cors(enabled, Set.of(origins)));
    }

    @Test
    void disabledEmitsNoHeadersEvenForKnownOrigin() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds").header("Origin", ORIGIN);
        policy(false, ORIGIN).apply(exchange);
        assertNull(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
    }

    @Test
    void sameOriginRequestGetsNoHeaders() {
        // No Origin header => not a cross-origin request.
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds");
        policy(true, ORIGIN).apply(exchange);
        assertNull(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
    }

    @Test
    void enabledEchoesAllowedOriginWithCredentials() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds").header("Origin", ORIGIN);
        policy(true, ORIGIN).apply(exchange);
        assertEquals(ORIGIN, exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
        assertEquals("true", exchange.getResponseHeaders().getFirst("Access-Control-Allow-Credentials"));
        assertTrue(exchange.getResponseHeaders().getOrDefault("Vary", java.util.List.of()).contains("Origin"));
    }

    @Test
    void enabledRejectsUnlistedOrigin() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds").header("Origin", "https://evil.example");
        policy(true, ORIGIN).apply(exchange);
        assertNull(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
    }

    @Test
    void wildcardEchoesAnyOrigin() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds").header("Origin", "https://anything.test");
        policy(true, "*").apply(exchange);
        assertEquals("https://anything.test", exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
    }

    @Test
    void preflightAdvertisesMethodsAndEchoesRequestedHeaders() {
        FakeHttpExchange exchange = new FakeHttpExchange("OPTIONS", "/api/worlds")
                .header("Origin", ORIGIN)
                .header("Access-Control-Request-Headers", "authorization, x-custom");
        policy(true, ORIGIN).applyPreflight(exchange);
        assertEquals(ORIGIN, exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
        assertTrue(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Methods").contains("GET"));
        assertEquals("authorization, x-custom",
                exchange.getResponseHeaders().getFirst("Access-Control-Allow-Headers"));
    }

    @Test
    void preflightWithoutRequestedHeadersFallsBackToDefaults() {
        // No Access-Control-Request-Headers header -> the ternary's false arm uses DEFAULT_ALLOWED_HEADERS (line 58).
        FakeHttpExchange exchange = new FakeHttpExchange("OPTIONS", "/api/worlds").header("Origin", ORIGIN);
        policy(true, ORIGIN).applyPreflight(exchange);
        assertEquals("Authorization, Content-Type, X-Terrascape-Admin-Token",
                exchange.getResponseHeaders().getFirst("Access-Control-Allow-Headers"));
    }

    @Test
    void preflightWithBlankRequestedHeadersFallsBackToDefaults() {
        // Present-but-blank requested headers also hits the default arm (line 58 condition !requested.isBlank()).
        FakeHttpExchange exchange = new FakeHttpExchange("OPTIONS", "/api/worlds")
                .header("Origin", ORIGIN)
                .header("Access-Control-Request-Headers", "   ");
        policy(true, ORIGIN).applyPreflight(exchange);
        assertEquals("Authorization, Content-Type, X-Terrascape-Admin-Token",
                exchange.getResponseHeaders().getFirst("Access-Control-Allow-Headers"));
    }

    @Test
    void preflightForUnlistedOriginAdvertisesNothing() {
        FakeHttpExchange exchange = new FakeHttpExchange("OPTIONS", "/api/worlds").header("Origin", "https://evil.example");
        policy(true, ORIGIN).applyPreflight(exchange);
        assertNull(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Origin"));
        assertNull(exchange.getResponseHeaders().getFirst("Access-Control-Allow-Methods"));
    }
}
