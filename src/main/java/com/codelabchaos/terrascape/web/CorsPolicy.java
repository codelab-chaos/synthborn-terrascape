package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;

import javax.annotation.Nonnull;

/**
 * Cross-Origin Resource Sharing policy for the web APIs.
 *
 * <p>Disabled by default: the bundled viewer is same-origin and needs no CORS, so the locked-down
 * stance is to emit no CORS headers at all — browsers then refuse cross-origin reads. When enabled,
 * only the configured origins are allowed; the matching {@code Origin} is echoed back (never
 * {@code *}, which browsers reject alongside credentials) and credentialed requests are permitted so
 * a future cross-origin client can present its session.
 *
 * <p>This class only writes headers; it does not decide auth. The {@link AccessGate} still gates the
 * actual request regardless of CORS.
 */
public final class CorsPolicy {
    private static final String ALLOWED_METHODS = "GET, POST, OPTIONS";
    private static final String DEFAULT_ALLOWED_HEADERS = "Authorization, Content-Type, X-Terrascape-Admin-Token";
    private static final String MAX_AGE_SECONDS = "600";

    private final TerrascapeConfig.Cors config;

    public CorsPolicy(@Nonnull TerrascapeConfig.Cors config) {
        this.config = config;
    }

    /**
     * Adds CORS response headers when the request's {@code Origin} is allowed; a no-op otherwise
     * (same-origin requests carry no {@code Origin} and need no headers). Must run before the
     * response headers are sent.
     */
    public void apply(@Nonnull HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin == null || !config.allows(origin)) {
            return;
        }
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", origin);
        headers.add("Vary", "Origin"); // response varies by Origin; keep caches from mixing them up
        headers.set("Access-Control-Allow-Credentials", "true");
    }

    /** Adds preflight headers (methods, allowed request headers, cache) on top of {@link #apply}. */
    public void applyPreflight(@Nonnull HttpExchange exchange) {
        apply(exchange);
        Headers headers = exchange.getResponseHeaders();
        if (headers.getFirst("Access-Control-Allow-Origin") == null) {
            return; // origin not allowed — advertise nothing, the browser will block the real call
        }
        headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
        String requested = exchange.getRequestHeaders().getFirst("Access-Control-Request-Headers");
        headers.set("Access-Control-Allow-Headers",
                requested != null && !requested.isBlank() ? requested : DEFAULT_ALLOWED_HEADERS);
        headers.set("Access-Control-Max-Age", MAX_AGE_SECONDS);
    }
}
