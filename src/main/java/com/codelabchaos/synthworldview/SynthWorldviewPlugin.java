package com.codelabchaos.synthworldview;

import com.codelabchaos.synthworldview.commands.WorldviewCommand;
import com.codelabchaos.synthworldview.web.WorldviewWebServer;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.logging.Level;

public class SynthWorldviewPlugin extends JavaPlugin {
    private static final String DEFAULT_HTTP_HOST = "127.0.0.1";
    private static final int DEFAULT_HTTP_PORT = 5960;

    private static SynthWorldviewPlugin instance;

    private Instant startedAt;
    private WorldviewWebServer webServer;
    private boolean experimentalDetailsEnabled;

    public SynthWorldviewPlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    public static SynthWorldviewPlugin get() {
        return instance;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Path worldviewDir() {
        return getDataDirectory();
    }

    public String webAddress() {
        return webServer == null ? "stopped" : webServer.address();
    }

    public WorldviewWebServer.Metrics webMetrics() {
        return webServer == null ? null : webServer.metrics();
    }

    public WorldviewWebServer webServer() {
        return webServer;
    }

    public boolean experimentalDetailsEnabled() {
        return experimentalDetailsEnabled;
    }

    @Override
    protected void setup() {
        instance = this;
        getCommandRegistry().registerCommand(new WorldviewCommand(this));
        getLogger().at(Level.INFO).log("SynthWorldview setup complete.");
    }

    @Override
    protected void start() {
        startedAt = Instant.now();
        String host = setting("synthworldview.http.host", "SYNTH_WORLDVIEW_HOST", DEFAULT_HTTP_HOST);
        int port = parseInt(setting(
                "synthworldview.http.port",
                "SYNTH_WORLDVIEW_PORT",
                Integer.toString(DEFAULT_HTTP_PORT)), DEFAULT_HTTP_PORT);
        experimentalDetailsEnabled = parseBoolean(setting(
                "synthworldview.experimental.details",
                "SYNTH_WORLDVIEW_EXPERIMENTAL_DETAILS",
                "false"));

        try {
            webServer = new WorldviewWebServer(this, host, port, experimentalDetailsEnabled);
            webServer.start();
        } catch (IOException e) {
            getLogger().at(Level.SEVERE).withCause(e).log("Failed to start SynthWorldview HTTP server.");
        }
        getLogger().at(Level.INFO).log("SynthWorldview started.");
    }

    @Override
    protected void shutdown() {
        getLogger().at(Level.INFO).log("SynthWorldview shutting down.");
        if (webServer != null) {
            webServer.stop();
            webServer = null;
        }
        startedAt = null;
        instance = null;
    }

    private static String setting(@Nonnull String property, @Nonnull String env, @Nonnull String fallback) {
        String value = System.getProperty(property);
        if (value == null || value.isBlank()) {
            value = System.getenv(env);
        }
        return value == null || value.isBlank() ? fallback : value;
    }

    private static int parseInt(@Nonnull String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static boolean parseBoolean(@Nonnull String value) {
        return "1".equals(value)
                || "true".equalsIgnoreCase(value)
                || "yes".equalsIgnoreCase(value)
                || "on".equalsIgnoreCase(value);
    }
}
