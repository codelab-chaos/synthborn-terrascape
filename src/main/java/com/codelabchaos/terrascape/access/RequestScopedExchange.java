package com.codelabchaos.terrascape.access;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpPrincipal;

import javax.annotation.Nonnull;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Delegates HTTP I/O while keeping attributes local to one request.
 *
 * <p>The JDK HTTP server backs {@link HttpExchange#setAttribute(String, Object)} with the
 * {@link HttpContext} attribute map, which is shared by every request on that context. Authentication
 * metadata must never be stored there directly: a valid request could otherwise lend its identity
 * to a later or concurrent anonymous request.
 */
public final class RequestScopedExchange extends HttpExchange {
    private final HttpExchange delegate;
    private final Map<String, Object> attributes = new ConcurrentHashMap<>();

    public RequestScopedExchange(@Nonnull HttpExchange delegate) {
        this.delegate = delegate;
    }

    @Override
    public Object getAttribute(String name) {
        return attributes.get(name);
    }

    @Override
    public void setAttribute(String name, Object value) {
        if (value == null) {
            attributes.remove(name);
        } else {
            attributes.put(name, value);
        }
    }

    @Override
    public Headers getRequestHeaders() {
        return delegate.getRequestHeaders();
    }

    @Override
    public Headers getResponseHeaders() {
        return delegate.getResponseHeaders();
    }

    @Override
    public URI getRequestURI() {
        return delegate.getRequestURI();
    }

    @Override
    public String getRequestMethod() {
        return delegate.getRequestMethod();
    }

    @Override
    public HttpContext getHttpContext() {
        return delegate.getHttpContext();
    }

    @Override
    public void close() {
        delegate.close();
    }

    @Override
    public InputStream getRequestBody() {
        return delegate.getRequestBody();
    }

    @Override
    public OutputStream getResponseBody() {
        return delegate.getResponseBody();
    }

    @Override
    public void sendResponseHeaders(int responseCode, long responseLength) throws java.io.IOException {
        delegate.sendResponseHeaders(responseCode, responseLength);
    }

    @Override
    public InetSocketAddress getRemoteAddress() {
        return delegate.getRemoteAddress();
    }

    @Override
    public int getResponseCode() {
        return delegate.getResponseCode();
    }

    @Override
    public InetSocketAddress getLocalAddress() {
        return delegate.getLocalAddress();
    }

    @Override
    public String getProtocol() {
        return delegate.getProtocol();
    }

    @Override
    public void setStreams(InputStream input, OutputStream output) {
        delegate.setStreams(input, output);
    }

    @Override
    public HttpPrincipal getPrincipal() {
        return delegate.getPrincipal();
    }
}
