package com.codelabchaos.terrascape.access;

import com.sun.net.httpserver.HttpExchange;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.function.BooleanSupplier;

/**
 * Enforces the "restricted" web-access mode for the viewer.
 *
 * <p>When access is not restricted every request is allowed and the gate is a no-op. When it is
 * restricted a request is allowed only if it carries a valid {@link AccessTokens} credential, taken
 * from (in order) the {@code key} query parameter, the {@value #COOKIE_NAME} cookie, or an
 * {@code Authorization: Bearer} header. A token presented via the query string is promoted to a
 * session cookie so the browser re-sends it on every subsequent request — the viewer's existing
 * fetches work unchanged, with no front-end token plumbing.
 *
 * <p>This class only answers "may this request proceed?"; minting and validation of the underlying
 * tokens belong to {@link AccessTokens}.
 */
public final class AccessGate {

    public static final String COOKIE_NAME = "terrascape_key";

    /**
     * Per-request attribute holding the {@code Set<String>} of scopes from the presented token.
     * Absent when no valid token was supplied (for example any request in public mode). Endpoints
     * read it via {@link HttpExchange#getAttribute(String)} to authorize beyond plain map access.
     */
    public static final String SCOPES_ATTRIBUTE = "terrascape.scopes";
    /** Per-request validated token metadata, including its optional player identity. */
    public static final String TOKEN_INFO_ATTRIBUTE = "terrascape.tokenInfo";

    private final AccessTokens tokens;
    private final BooleanSupplier restricted;

    public AccessGate(@Nonnull AccessTokens tokens, @Nonnull BooleanSupplier restricted) {
        this.tokens = tokens;
        this.restricted = restricted;
    }

    public boolean restricted() {
        return restricted.getAsBoolean();
    }

    /**
     * Evaluates the request: resolves any presented token, stashing its scopes on the exchange and
     * promoting a valid query-string token to a session cookie. Both side effects happen whenever a
     * valid token is present, regardless of mode, so endpoint scope checks work even in public mode.
     * Must be called before the response headers are sent.
     *
     * @return {@code true} if the request may proceed under the current access mode
     */
    public boolean authorize(@Nonnull HttpExchange exchange) {
        String token = presentedToken(exchange);
        AccessTokens.TokenInfo info = token == null ? null : tokens.resolve(token);
        if (info != null) {
            exchange.setAttribute(SCOPES_ATTRIBUTE, info.scopes());
            exchange.setAttribute(TOKEN_INFO_ATTRIBUTE, info);
            String fromQuery = queryParam(exchange.getRequestURI().getRawQuery(), "key");
            if (token.equals(fromQuery)) {
                setSessionCookie(exchange, token, info.expiresAt());
            }
        }
        return !restricted() || info != null;
    }

    /** True if the request carried a valid token granting the given scope. */
    public static boolean hasScope(@Nonnull HttpExchange exchange, @Nonnull String scope) {
        Object attribute = exchange.getAttribute(SCOPES_ATTRIBUTE);
        return attribute instanceof Set<?> set && set.contains(scope);
    }

    /** Returns validated token metadata, or {@code null} for anonymous/debug-token requests. */
    @Nullable
    public static AccessTokens.TokenInfo tokenInfo(@Nonnull HttpExchange exchange) {
        Object attribute = exchange.getAttribute(TOKEN_INFO_ATTRIBUTE);
        return attribute instanceof AccessTokens.TokenInfo info ? info : null;
    }

    @Nullable
    private static String presentedToken(@Nonnull HttpExchange exchange) {
        String fromQuery = queryParam(exchange.getRequestURI().getRawQuery(), "key");
        if (fromQuery != null && !fromQuery.isBlank()) {
            return fromQuery;
        }
        String fromCookie = cookieValue(exchange, COOKIE_NAME);
        if (fromCookie != null && !fromCookie.isBlank()) {
            return fromCookie;
        }
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String bearer = authorization.substring("Bearer ".length()).trim();
            if (!bearer.isBlank()) {
                return bearer;
            }
        }
        return null;
    }

    private static void setSessionCookie(@Nonnull HttpExchange exchange, @Nonnull String token, long expiresAt) {
        long maxAgeSeconds = Math.max(0, (expiresAt - System.currentTimeMillis()) / 1000);
        exchange.getResponseHeaders().add("Set-Cookie",
                COOKIE_NAME + "=" + token + "; Path=/; Max-Age=" + maxAgeSeconds + "; HttpOnly; SameSite=Lax");
    }

    @Nullable
    private static String cookieValue(@Nonnull HttpExchange exchange, @Nonnull String name) {
        String header = exchange.getRequestHeaders().getFirst("Cookie");
        if (header == null || header.isBlank()) {
            return null;
        }
        for (String pair : header.split(";")) {
            int equals = pair.indexOf('=');
            if (equals < 0) {
                continue;
            }
            if (name.equals(pair.substring(0, equals).trim())) {
                return pair.substring(equals + 1).trim();
            }
        }
        return null;
    }

    @Nullable
    private static String queryParam(@Nullable String query, @Nonnull String name) {
        if (query == null || query.isBlank()) {
            return null;
        }
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            if (!name.equals(decode(rawKey))) {
                continue;
            }
            return equals >= 0 ? decode(pair.substring(equals + 1)) : "";
        }
        return null;
    }

    private static String decode(@Nonnull String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
