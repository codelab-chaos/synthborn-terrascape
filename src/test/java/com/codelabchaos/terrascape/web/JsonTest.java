package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JsonTest {

    @Test
    void leavesPlainTextUntouched() {
        assertEquals("hello world", Json.escapeJson("hello world"));
    }

    @Test
    void escapesBackslashesAndQuotes() {
        assertEquals("a\\\\b", Json.escapeJson("a\\b"));
        assertEquals("say \\\"hi\\\"", Json.escapeJson("say \"hi\""));
    }

    @Test
    void escapesControlWhitespace() {
        assertEquals("line1\\nline2", Json.escapeJson("line1\nline2"));
        assertEquals("a\\tb", Json.escapeJson("a\tb"));
        assertEquals("a\\rb", Json.escapeJson("a\rb"));
    }

    @Test
    void escapesBackslashBeforeQuotesDeterministically() {
        // A literal backslash followed by a quote must not corrupt into an escaped quote.
        assertEquals("\\\\\\\"", Json.escapeJson("\\\""));
    }
}
