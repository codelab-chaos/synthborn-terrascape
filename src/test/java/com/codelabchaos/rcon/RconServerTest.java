package com.codelabchaos.rcon;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the shared RCON security gate. These cases all resolve before any command is
 * dispatched, so they need no live Hytale {@code CommandManager}.
 */
class RconServerTest {
    private static final String TOKEN = "s3cr3t-token";

    private RconServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop();
            server = null;
        }
    }

    @Test
    void disabledNeverOpensThePort() {
        server = new RconServer(new RconConfig(false, "127.0.0.1", 0, TOKEN, false, false), "Test", RconLog.NONE);
        assertFalse(server.start(), "disabled RCON must not start");
        assertEquals(-1, server.boundPort());
    }

    @Test
    void enabledWithoutTokenRefusesToStart() {
        server = new RconServer(new RconConfig(true, "127.0.0.1", 0, "", false, false), "Test", RconLog.NONE);
        assertFalse(server.start(), "enabled RCON with a blank token must fail closed");
        assertEquals(-1, server.boundPort());
    }

    @Test
    void dangerPublicAllowsOpenStartWithoutToken() {
        server = new RconServer(new RconConfig(true, "127.0.0.1", 0, "", false, true), "Test", RconLog.NONE);
        assertTrue(server.start(), "dangerPublic must allow an open (tokenless) start");
        assertTrue(server.boundPort() > 0);
    }

    @Test
    void dangerPublicOpenEndpointSkipsAuth() throws Exception {
        server = new RconServer(new RconConfig(true, "127.0.0.1", 0, "", false, true), "Test", RconLog.NONE);
        assertTrue(server.start());
        // No token sent: in open mode this passes auth and fails later on the empty command (400),
        // rather than 401 — proving auth was bypassed.
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(uri("/command"))
                        .POST(HttpRequest.BodyPublishers.ofString("{}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(400, response.statusCode());
        assertTrue(response.body().contains("missing_command"), response.body());
    }

    @Test
    void enabledWithTokenStartsAndServesHealth() throws Exception {
        server = startServer(new RconConfig(true, "127.0.0.1", 0, TOKEN, false, false));
        HttpResponse<String> response = get("/health");
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"ok\":true"), response.body());
        assertTrue(response.body().contains("\"service\":\"Test\""), response.body());
    }

    @Test
    void commandWithoutTokenIsUnauthorized() throws Exception {
        server = startServer(new RconConfig(true, "127.0.0.1", 0, TOKEN, false, false));
        HttpResponse<String> response = post("/command", "{\"command\":\"status\"}", null);
        assertEquals(401, response.statusCode());
    }

    @Test
    void commandWithWrongTokenIsUnauthorized() throws Exception {
        server = startServer(new RconConfig(true, "127.0.0.1", 0, TOKEN, false, false));
        HttpResponse<String> response = post("/command", "{\"command\":\"status\"}", "wrong");
        assertEquals(401, response.statusCode());
    }

    @Test
    void authorizedButWrongMethodIsRejectedBeforeDispatch() throws Exception {
        server = startServer(new RconConfig(true, "127.0.0.1", 0, TOKEN, false, false));
        // GET passes the remote+token gate, then fails the POST-only check — proving auth ran first.
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(uri("/command"))
                        .header(RconServer.AUTH_HEADER, TOKEN)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(405, response.statusCode());
    }

    @Test
    void authorizedEmptyCommandIsBadRequest() throws Exception {
        server = startServer(new RconConfig(true, "127.0.0.1", 0, TOKEN, false, false));
        HttpResponse<String> response = post("/command", "{}", TOKEN);
        assertEquals(400, response.statusCode());
        assertTrue(response.body().contains("missing_command"), response.body());
    }

    private RconServer startServer(RconConfig config) {
        RconServer s = new RconServer(config, "Test", RconLog.NONE);
        assertTrue(s.start(), "RCON should start with a token");
        assertTrue(s.boundPort() > 0, "expected a bound ephemeral port");
        return s;
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + server.boundPort() + path);
    }

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(uri(path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri(path))
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            builder.header(RconServer.AUTH_HEADER, token);
        }
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
