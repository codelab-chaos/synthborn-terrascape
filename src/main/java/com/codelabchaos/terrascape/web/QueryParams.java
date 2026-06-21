package com.codelabchaos.terrascape.web;

import com.sun.net.httpserver.HttpExchange;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/** URL query-string parsing and small string helpers shared by the endpoint handlers. */
final class QueryParams {
    private QueryParams() {
    }

    static String decode(@Nonnull String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    static boolean queryFlag(@Nonnull HttpExchange exchange, @Nonnull String name, boolean defaultValue) {
        return queryFlag(exchange.getRequestURI().getRawQuery(), name, defaultValue);
    }

    static boolean queryFlag(@Nullable String query, @Nonnull String name) {
        return queryFlag(query, name, false);
    }

    static boolean queryFlag(@Nullable String query, @Nonnull String name, boolean defaultValue) {
        if (query == null || query.isBlank()) {
            return defaultValue;
        }
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            if (!name.equals(decode(rawKey))) {
                continue;
            }
            String value = equals >= 0 ? decode(pair.substring(equals + 1)) : "true";
            if (value.isBlank()) {
                return defaultValue;
            }
            String normalized = value.toLowerCase();
            return normalized.equals("1")
                    || normalized.equals("true")
                    || normalized.equals("yes")
                    || normalized.equals("on");
        }
        return defaultValue;
    }

    @Nullable
    static String queryParam(@Nullable String query, @Nonnull String name) {
        if (query == null || query.isBlank()) {
            return null;
        }
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            if (!name.equals(decode(rawKey))) {
                continue;
            }
            return equals >= 0 ? decode(pair.substring(equals + 1)) : "true";
        }
        return null;
    }

    @Nullable
    static String queryParam(@Nonnull HttpExchange exchange, @Nonnull String name) {
        String query = exchange.getRequestURI().getRawQuery();
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

    static String safeName(@Nonnull String value) {
        return value.replaceAll("[^A-Za-z0-9_.-]", "_");
    }

    @Nullable
    static String firstNonBlank(@Nullable String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
