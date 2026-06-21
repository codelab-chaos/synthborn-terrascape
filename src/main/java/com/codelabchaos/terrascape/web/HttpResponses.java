package com.codelabchaos.terrascape.web;

import com.sun.net.httpserver.HttpExchange;

import javax.annotation.Nonnull;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.GZIPOutputStream;

/** Low-level HTTP response writers and content helpers shared by every endpoint handler. */
final class HttpResponses {
    private HttpResponses() {
    }

    static void writeJson(@Nonnull HttpExchange exchange, int status, @Nonnull String json) throws IOException {
        writeBytes(exchange, status, json.getBytes(StandardCharsets.UTF_8), "application/json; charset=utf-8");
    }

    static void writeText(@Nonnull HttpExchange exchange, int status, @Nonnull String text,
                          @Nonnull String contentType) throws IOException {
        writeBytes(exchange, status, text.getBytes(StandardCharsets.UTF_8), contentType);
    }

    static void writeBytes(@Nonnull HttpExchange exchange, int status, byte[] bytes,
                           @Nonnull String contentType) throws IOException {
        writeCacheableBytes(exchange, status, bytes, contentType, "no-cache");
    }

    static void writeCacheableBytes(@Nonnull HttpExchange exchange, int status, byte[] bytes,
                                    @Nonnull String contentType, @Nonnull String cacheControl) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Cache-Control", cacheControl);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    static boolean acceptsGzip(@Nonnull HttpExchange exchange) {
        String accept = exchange.getRequestHeaders().getFirst("Accept-Encoding");
        return accept != null && accept.toLowerCase(Locale.ROOT).contains("gzip");
    }

    static byte[] gzip(@Nonnull byte[] data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(64, data.length / 2));
        try (GZIPOutputStream gz = new GZIPOutputStream(out)) {
            gz.write(data);
        }
        return out.toByteArray();
    }

    static String contentType(@Nonnull String resourcePath) {
        if (resourcePath.endsWith(".html")) return "text/html; charset=utf-8";
        if (resourcePath.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (resourcePath.endsWith(".json")) return "application/json; charset=utf-8";
        if (resourcePath.endsWith(".css")) return "text/css; charset=utf-8";
        if (resourcePath.endsWith(".png")) return "image/png";
        if (resourcePath.endsWith(".jpg") || resourcePath.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }
}
