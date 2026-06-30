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

    static String unescapeJsonString(@Nonnull String value) {
        StringBuilder result = new StringBuilder(value.length());
        boolean escaping = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (!escaping) {
                if (c == '\\') {
                    escaping = true;
                } else {
                    result.append(c);
                }
                continue;
            }
            switch (c) {
                case '"' -> result.append('"');
                case '\\' -> result.append('\\');
                case '/' -> result.append('/');
                case 'b' -> result.append('\b');
                case 'f' -> result.append('\f');
                case 'n' -> result.append('\n');
                case 'r' -> result.append('\r');
                case 't' -> result.append('\t');
                case 'u' -> {
                    if (i + 4 >= value.length()) {
                        result.append('u');
                        break;
                    }
                    String hex = value.substring(i + 1, i + 5);
                    try {
                        result.append((char) Integer.parseInt(hex, 16));
                        i += 4;
                    } catch (NumberFormatException e) {
                        result.append('u').append(hex);
                        i += 4;
                    }
                }
                default -> result.append(c);
            }
            escaping = false;
        }
        if (escaping) {
            result.append('\\');
        }
        return result.toString();
    }

    /** Rounds a double to 3 decimal places for compact, stable JSON number output. */
    static double round3(double value) {
        return Math.round(value * 1000.0d) / 1000.0d;
    }
}
