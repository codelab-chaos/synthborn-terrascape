package com.codelabchaos.terrascape.web;

import javax.annotation.Nonnull;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Minimal helpers for the hand-built JSON responses: string escaping, rounding, field extraction. */
final class Json {
    private Json() {
    }

    /** Extracts a required string field via {@code pattern}; throws {@code <field>_required} if absent. */
    static String findString(@Nonnull Pattern pattern, @Nonnull String body, @Nonnull String fieldName) {
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find()) {
            throw new IllegalArgumentException(fieldName + "_required");
        }
        return matcher.group(1);
    }

    /** Extracts a required integer field via {@code pattern}; throws {@code <field>_required} if absent. */
    static Integer findInt(@Nonnull Pattern pattern, @Nonnull String body, @Nonnull String fieldName) {
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find()) {
            throw new IllegalArgumentException(fieldName + "_required");
        }
        return Integer.parseInt(matcher.group(1));
    }

    static String escapeJson(@Nonnull String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    /** Rounds a double to 3 decimal places for compact, stable JSON number output. */
    static double round3(double value) {
        return Math.round(value * 1000.0d) / 1000.0d;
    }
}
