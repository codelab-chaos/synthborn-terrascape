package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.testsupport.FakeHttpExchange;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QueryParamsTest {

    @Test
    void decodeUnescapesPercentEncoding() {
        assertEquals("a b", QueryParams.decode("a%20b"));
        assertEquals("x/y", QueryParams.decode("x%2Fy"));
    }

    @Test
    void queryParamFromStringDecodesValuesAndHandlesMisses() {
        assertEquals("default world", QueryParams.queryParam("name=default%20world&x=1", "name"));
        assertEquals("1", QueryParams.queryParam("name=default&x=1", "x"));
        assertNull(QueryParams.queryParam("name=default", "missing"));
        assertNull(QueryParams.queryParam((String) null, "name"));
        assertNull(QueryParams.queryParam("", "name"));
    }

    @Test
    void queryParamFromStringTreatsValuelessKeyAsTrue() {
        assertEquals("true", QueryParams.queryParam("flag", "flag"));
    }

    @Test
    void queryParamFromExchangeTreatsValuelessKeyAsEmpty() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/x?flag&name=v");
        assertEquals("", QueryParams.queryParam(exchange, "flag"));
        assertEquals("v", QueryParams.queryParam(exchange, "name"));
        assertNull(QueryParams.queryParam(exchange, "missing"));
    }

    @Test
    void queryFlagRecognisesTruthyValuesAndDefaults() {
        assertTrue(QueryParams.queryFlag("a=1", "a"));
        assertTrue(QueryParams.queryFlag("a=true", "a"));
        assertTrue(QueryParams.queryFlag("a=YES", "a"));
        assertTrue(QueryParams.queryFlag("a=on", "a"));
        assertFalse(QueryParams.queryFlag("a=0", "a"));
        assertFalse(QueryParams.queryFlag("a=nope", "a"));
        assertFalse(QueryParams.queryFlag("b=1", "a")); // absent → default false
    }

    @Test
    void queryFlagUsesDefaultWhenAbsentOrBlank() {
        assertTrue(QueryParams.queryFlag((String) null, "a", true));
        assertTrue(QueryParams.queryFlag("", "a", true));
        assertFalse(QueryParams.queryFlag("a=", "a", false)); // present but blank → default
    }

    @Test
    void queryFlagFromExchangeReadsRawQuery() {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/x?players=1&mobs=0");
        assertTrue(QueryParams.queryFlag(exchange, "players", false));
        assertFalse(QueryParams.queryFlag(exchange, "mobs", true));
    }

    @Test
    void queryFlagStringTreatsValuelessKeyAsTrue() {
        // String overload, valueless key: rawKey = whole pair (line 33), value defaults to "true" (line 37).
        assertTrue(QueryParams.queryFlag("flag", "flag"));
        assertTrue(QueryParams.queryFlag("x=0&flag", "flag"));
    }

    @Test
    void queryParamFromExchangeReturnsNullWhenNoQuery() {
        // Exchange with no query string -> early null return (line 70).
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/x");
        assertNull(QueryParams.queryParam(exchange, "anything"));
    }

    @Test
    void safeNameReplacesUnsafeCharacters() {
        assertEquals("default_world", QueryParams.safeName("default world"));
        assertEquals("a.b-c_1", QueryParams.safeName("a.b-c_1"));
        assertEquals("__", QueryParams.safeName("/\\"));
    }

    @Test
    void firstNonBlankReturnsTheFirstNonBlankTrimmed() {
        assertEquals("hit", QueryParams.firstNonBlank(null, "", "  ", "  hit  ", "next"));
        assertNull(QueryParams.firstNonBlank(null, "", "   "));
        assertNull(QueryParams.firstNonBlank((String[]) null));
    }
}
