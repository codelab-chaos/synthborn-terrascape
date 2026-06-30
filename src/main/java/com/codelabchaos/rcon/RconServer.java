package com.codelabchaos.rcon;

import com.hypixel.hytale.server.core.command.system.CommandManager;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared Synthborn RCON endpoint: a small localhost HTTP/JSON bridge that runs Hytale
 * server commands and returns their output. Decoupled from any specific mod — a host
 * provides an {@link RconConfig}, a service name, and an {@link RconLog}.
 *
 * <p>Wire contract (identical across mods, so one mod could call another's port):
 * <ul>
 *   <li>{@code GET  /health} → {@code {"ok":true,"service":"<name>"}}</li>
 *   <li>{@code POST /command} with {@code {"command":"..."}} and an auth credential in
 *       {@code X-SynthRCON-Token} or {@code Authorization: Bearer ...} →
 *       {@code {"ok":true,"command":...,"messages":[...]}}</li>
 * </ul>
 *
 * <p>Security ({@link #start()} enforces it, fail closed): disabled mods never open the
 * port; an enabled mod with no credential or custom authenticator refuses to start; every request
 * needs an accepted credential; non-loopback callers are rejected unless {@code allowRemote}.
 */
public final class RconServer {
    /** Wire header carrying the bearer credential. Kept stable for tooling compatibility. */
    public static final String AUTH_HEADER = "X-SynthRCON-Token";

    /** Host-provided dynamic credential validator, used when auth is not a single static secret. */
    @FunctionalInterface
    public interface TokenAuthorizer {
        boolean isAuthorized(@Nonnull String token);
    }

    // Generous enough for slow commands (e.g. chunk gen) that the old 5s default aborted mid-flow.
    private static final Duration COMMAND_TIMEOUT = Duration.ofSeconds(90);
    private static final Pattern COMMAND_PATTERN = Pattern.compile("\"command\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");

    private final RconConfig config;
    private final String serviceName;
    private final RconLog log;
    private final TokenAuthorizer tokenAuthorizer;
    private final String authDescription;
    private HttpServer server;

    public RconServer(@Nonnull RconConfig config, @Nonnull String serviceName, @Nonnull RconLog log) {
        this(config, serviceName, log, staticTokenAuthorizer(config), "credential auth");
    }

    public RconServer(
            @Nonnull RconConfig config,
            @Nonnull String serviceName,
            @Nonnull RconLog log,
            @Nullable TokenAuthorizer tokenAuthorizer,
            @Nonnull String authDescription
    ) {
        this.config = config;
        this.serviceName = serviceName;
        this.log = log;
        this.tokenAuthorizer = tokenAuthorizer;
        this.authDescription = authDescription;
    }

    /**
     * Opens the RCON endpoint if it is enabled and the security gate passes.
     *
     * @return {@code true} if the server is now listening; {@code false} if RCON is disabled,
     *         refused for safety (enabled without a credential), or failed to bind.
     */
    public boolean start() {
        if (!config.enabled()) {
            log.info(serviceName + " RCON disabled (rcon.enabled=false).");
            return false;
        }
        if (tokenAuthorizer == null && !config.dangerPublic()) {
            log.error(serviceName + " RCON is enabled but no authenticator is configured — refusing to start. "
                    + "Set rcon.password to a secret value, provide a host authenticator, "
                    + "or set rcon.dangerPublic=true for an open dev endpoint.", null);
            return false;
        }

        try {
            server = HttpServer.create(new InetSocketAddress(config.host(), config.port()), 0);
            server.createContext("/health", this::handleHealth);
            server.createContext("/command", this::handleCommand);
            server.setExecutor(Executors.newSingleThreadExecutor(runnable -> {
                Thread thread = new Thread(runnable, serviceName + "-rcon-http");
                thread.setDaemon(true);
                return thread;
            }));
            server.start();
            if (tokenAuthorizer == null) {
                log.error("⚠ " + serviceName + " RCON is running OPEN with NO authentication "
                        + "(rcon.dangerPublic) — anyone who can reach " + config.host() + ":" + config.port()
                        + " can run server commands. Never use this on a public or untrusted network.", null);
            }
            String auth = tokenAuthorizer == null ? "OPEN — NO AUTH (dangerPublic)" : authDescription;
            String reach = config.allowRemote() ? "remote callers permitted" : "local-only";
            log.info(serviceName + " RCON listening on http://" + config.host() + ":" + config.port()
                    + " with " + auth + ", " + reach + ".");
            return true;
        } catch (IOException e) {
            log.error("Failed to start " + serviceName + " RCON HTTP server on "
                    + config.host() + ":" + config.port(), e);
            server = null;
            return false;
        }
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
    }

    /** The actually-bound port (useful when started on port 0), or -1 if not listening. */
    public int boundPort() {
        return server == null ? -1 : server.getAddress().getPort();
    }

    private void handleHealth(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        writeJson(exchange, 200, "{\"ok\":true,\"service\":\"" + escapeJson(serviceName) + "\"}");
    }

    private void handleCommand(@Nonnull HttpExchange exchange) throws IOException {
        if (!isLocal(exchange) && !config.allowRemote()) {
            writeJson(exchange, 403, "{\"ok\":false,\"error\":\"forbidden_remote_address\"}");
            return;
        }
        if (!isAuthorized(exchange)) {
            writeJson(exchange, 401, "{\"ok\":false,\"error\":\"unauthorized\"}");
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String command = extractCommand(readBody(exchange));
        if (command == null || command.isBlank()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"missing_command\"}");
            return;
        }

        BufferedCommandSender sender = new BufferedCommandSender(serviceName);
        try {
            CompletableFuture<Void> future = CommandManager.get().handleCommand(sender, command);
            future.get(COMMAND_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            writeJson(exchange, 200, responseJson(true, command, sender.messages(), null));
        } catch (Exception e) {
            log.error(serviceName + " RCON command failed: " + command, e);
            writeJson(exchange, 500, responseJson(false, command, sender.messages(), e.getMessage()));
        }
    }

    private static boolean isLocal(@Nonnull HttpExchange exchange) {
        String host = exchange.getRemoteAddress().getAddress().getHostAddress();
        return "127.0.0.1".equals(host) || "0:0:0:0:0:0:0:1".equals(host) || "::1".equals(host);
    }

    /** Validates the presented credential, or allows open dev mode when dangerPublic was enabled. */
    private boolean isAuthorized(@Nonnull HttpExchange exchange) {
        if (tokenAuthorizer == null) {
            return true; // open dev mode — only reachable when dangerPublic allowed start
        }
        String provided = requestToken(exchange);
        if (provided == null) {
            return false;
        }
        return tokenAuthorizer.isAuthorized(provided);
    }

    @Nullable
    private static String requestToken(@Nonnull HttpExchange exchange) {
        String provided = exchange.getRequestHeaders().getFirst(AUTH_HEADER);
        if (provided != null && !provided.isBlank()) {
            return provided;
        }
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String bearer = authorization.substring("Bearer ".length()).trim();
            if (!bearer.isBlank()) {
                return bearer;
            }
        }
        return null;
    }

    @Nullable
    private static TokenAuthorizer staticTokenAuthorizer(@Nonnull RconConfig config) {
        if (!config.hasToken()) {
            return null;
        }
        return provided -> MessageDigest.isEqual(
                config.token().getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }

    private static String readBody(@Nonnull HttpExchange exchange) throws IOException {
        try (InputStream input = exchange.getRequestBody()) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String extractCommand(@Nonnull String body) {
        Matcher matcher = COMMAND_PATTERN.matcher(body);
        if (!matcher.find()) {
            return null;
        }
        return unescapeJson(matcher.group(1));
    }

    private static void writeJson(@Nonnull HttpExchange exchange, int status, @Nonnull String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static String responseJson(boolean ok, @Nonnull String command, @Nonnull List<String> messages, String error) {
        StringBuilder json = new StringBuilder();
        json.append("{\"ok\":").append(ok);
        json.append(",\"command\":\"").append(escapeJson(command)).append("\"");
        json.append(",\"messages\":[");
        for (int i = 0; i < messages.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            json.append('"').append(escapeJson(messages.get(i))).append('"');
        }
        json.append(']');
        if (error != null && !error.isBlank()) {
            json.append(",\"error\":\"").append(escapeJson(error)).append("\"");
        }
        json.append('}');
        return json.toString();
    }

    private static String escapeJson(@Nonnull String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    private static String unescapeJson(@Nonnull String value) {
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
            result.append(switch (c) {
                case 'n' -> '\n';
                case 'r' -> '\r';
                case 't' -> '\t';
                case '\\' -> '\\';
                case '"' -> '"';
                default -> c;
            });
            escaping = false;
        }
        if (escaping) {
            result.append('\\');
        }
        return result.toString();
    }
}
