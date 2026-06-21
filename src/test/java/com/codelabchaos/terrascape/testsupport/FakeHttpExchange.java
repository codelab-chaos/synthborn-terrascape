package com.codelabchaos.terrascape.testsupport;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpPrincipal;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Minimal {@link HttpExchange} stub for unit tests: configurable method, URI, and request headers;
 * captures response headers, attributes, and the status passed to {@link #sendResponseHeaders}.
 * Only the surface the web code reads is implemented.
 */
public final class FakeHttpExchange extends HttpExchange {
    private final String method;
    private final URI uri;
    private final Headers requestHeaders = new Headers();
    private final Headers responseHeaders = new Headers();
    private final Map<String, Object> attributes = new HashMap<>();
    private final ByteArrayOutputStream responseBody = new ByteArrayOutputStream();
    private int responseCode = -1;

    public FakeHttpExchange(String method, String uri) {
        this.method = method;
        this.uri = URI.create(uri);
    }

    /** Adds a request header and returns this for chaining. */
    public FakeHttpExchange header(String name, String value) {
        requestHeaders.add(name, value);
        return this;
    }

    /** The status code passed to {@link #sendResponseHeaders}, or -1 if none was sent. */
    public int sentResponseCode() {
        return responseCode;
    }

    /** Bytes written to the response body. */
    public byte[] responseBytes() {
        return responseBody.toByteArray();
    }

    @Override
    public Headers getRequestHeaders() {
        return requestHeaders;
    }

    @Override
    public Headers getResponseHeaders() {
        return responseHeaders;
    }

    @Override
    public URI getRequestURI() {
        return uri;
    }

    @Override
    public String getRequestMethod() {
        return method;
    }

    @Override
    public void sendResponseHeaders(int rCode, long responseLength) {
        this.responseCode = rCode;
    }

    @Override
    public Object getAttribute(String name) {
        return attributes.get(name);
    }

    @Override
    public void setAttribute(String name, Object value) {
        attributes.put(name, value);
    }

    @Override
    public HttpContext getHttpContext() {
        return null;
    }

    @Override
    public void close() {
    }

    @Override
    public InputStream getRequestBody() {
        return InputStream.nullInputStream();
    }

    @Override
    public OutputStream getResponseBody() {
        return responseBody;
    }

    @Override
    public InetSocketAddress getRemoteAddress() {
        return null;
    }

    @Override
    public int getResponseCode() {
        return responseCode;
    }

    @Override
    public InetSocketAddress getLocalAddress() {
        return null;
    }

    @Override
    public String getProtocol() {
        return "HTTP/1.1";
    }

    @Override
    public void setStreams(InputStream i, OutputStream o) {
    }

    @Override
    public HttpPrincipal getPrincipal() {
        return null;
    }
}
