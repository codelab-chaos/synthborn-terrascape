package com.codelabchaos.terrascape.web;

import org.junit.jupiter.api.Test;

import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

    @Test
    void unescapesJsonStringContent() {
        assertEquals("say \"hi\"\nnext", Json.unescapeJsonString("say \\\"hi\\\"\\nnext"));
        assertEquals("abc", Json.unescapeJsonString("\\u0061bc"));
    }

    @Test
    void round3RoundsToThreeDecimals() {
        assertEquals(1.235, Json.round3(1.23456), 1e-9);
        assertEquals(2.0, Json.round3(2.0), 1e-9);
        assertEquals(-0.001, Json.round3(-0.0012), 1e-9);
    }

    @Test
    void findStringExtractsOrThrows() {
        Pattern p = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"");
        assertEquals("world", Json.findString(p, "{\"name\":\"world\"}", "name"));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> Json.findString(p, "{}", "name"));
        assertEquals("name_required", ex.getMessage());
    }

    @Test
    void findIntExtractsOrThrows() {
        Pattern p = Pattern.compile("\"chunkX\"\\s*:\\s*(-?\\d+)");
        assertEquals(-7, Json.findInt(p, "{\"chunkX\": -7}", "chunkX"));
        assertThrows(IllegalArgumentException.class, () -> Json.findInt(p, "{}", "chunkX"));
    }
}
