package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.testsupport.FakeHttpExchange;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

class HttpResponsesTest {

    @Test
    void writeJsonSetsStatusContentTypeAndBody() throws IOException {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/api/worlds");
        HttpResponses.writeJson(exchange, 200, "{\"ok\":true}");

        assertEquals(200, exchange.sentResponseCode());
        assertEquals("application/json; charset=utf-8", exchange.getResponseHeaders().getFirst("Content-Type"));
        assertEquals("no-cache", exchange.getResponseHeaders().getFirst("Cache-Control"));
        assertEquals("{\"ok\":true}", new String(exchange.responseBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void writeTextUsesGivenContentType() throws IOException {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/x");
        HttpResponses.writeText(exchange, 404, "missing", "text/plain; charset=utf-8");

        assertEquals(404, exchange.sentResponseCode());
        assertEquals("text/plain; charset=utf-8", exchange.getResponseHeaders().getFirst("Content-Type"));
        assertEquals("missing", new String(exchange.responseBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void writeCacheableBytesSetsCacheControl() throws IOException {
        FakeHttpExchange exchange = new FakeHttpExchange("GET", "/tile.png");
        byte[] body = {1, 2, 3, 4};
        HttpResponses.writeCacheableBytes(exchange, 200, body, "image/png", "public, max-age=43200");

        assertEquals("public, max-age=43200", exchange.getResponseHeaders().getFirst("Cache-Control"));
        assertEquals("image/png", exchange.getResponseHeaders().getFirst("Content-Type"));
        assertArrayEquals(body, exchange.responseBytes());
    }

    @Test
    void contentTypeMapsByExtension() {
        assertEquals("text/html; charset=utf-8", HttpResponses.contentType("index.html"));
        assertEquals("text/javascript; charset=utf-8", HttpResponses.contentType("app.js"));
        assertEquals("application/json; charset=utf-8", HttpResponses.contentType("data.json"));
        assertEquals("text/css; charset=utf-8", HttpResponses.contentType("styles.css"));
        assertEquals("image/png", HttpResponses.contentType("tile.png"));
        assertEquals("image/jpeg", HttpResponses.contentType("photo.jpeg"));
        assertEquals("image/jpeg", HttpResponses.contentType("photo.jpg"));
        assertEquals("application/octet-stream", HttpResponses.contentType("model.glb"));
    }

    @Test
    void acceptsGzipReadsTheHeaderCaseInsensitively() {
        assertTrue(HttpResponses.acceptsGzip(new FakeHttpExchange("GET", "/").header("Accept-Encoding", "GZIP, br")));
        assertFalse(HttpResponses.acceptsGzip(new FakeHttpExchange("GET", "/").header("Accept-Encoding", "br")));
        assertFalse(HttpResponses.acceptsGzip(new FakeHttpExchange("GET", "/")));
    }

    @Test
    void gzipRoundTrips() throws IOException {
        byte[] original = "the quick brown fox".repeat(20).getBytes(StandardCharsets.UTF_8);
        byte[] compressed = HttpResponses.gzip(original);
        try (GZIPInputStream in = new GZIPInputStream(new ByteArrayInputStream(compressed))) {
            assertArrayEquals(original, in.readAllBytes());
        }
    }
}
