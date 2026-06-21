package com.codelabchaos.terrascape.web;

import javax.annotation.Nonnull;

/** Minimal JSON string escaping for the hand-built JSON responses. */
final class Json {
    private Json() {
    }

    static String escapeJson(@Nonnull String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }
}
