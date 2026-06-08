package com.codelabchaos.terrascape;

import com.codelabchaos.terrascape.commands.TerrascapeCommand;
import com.codelabchaos.terrascape.web.NpcRoleIndex;
import com.codelabchaos.terrascape.web.TerrascapeWebServer;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.logging.Level;

public class SynthTerrascapePlugin extends JavaPlugin {
    private static final String DEFAULT_HTTP_HOST = "127.0.0.1";
    private static final int DEFAULT_HTTP_PORT = 5960;

    private static SynthTerrascapePlugin instance;

    private Instant startedAt;
    private TerrascapeWebServer webServer;
    private NpcRoleIndex npcRoleIndex;
    private PlayerLookTracker playerLookTracker;
    private boolean experimentalDetailsEnabled;

    public SynthTerrascapePlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    public static SynthTerrascapePlugin get() {
        return instance;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Path terrascapeDir() {
        return getDataDirectory();
    }

    public String webAddress() {
        return webServer == null ? "stopped" : webServer.address();
    }

    public TerrascapeWebServer.Metrics webMetrics() {
        return webServer == null ? null : webServer.metrics();
    }

    public TerrascapeWebServer webServer() {
        return webServer;
    }

    public NpcRoleIndex npcRoleIndex() {
        return npcRoleIndex;
    }

    public PlayerLookTracker playerLookTracker() {
        return playerLookTracker;
    }

    public boolean experimentalDetailsEnabled() {
        return experimentalDetailsEnabled;
    }

    @Override
    protected void setup() {
        instance = this;
        npcRoleIndex = new NpcRoleIndex();
        npcRoleIndex.subscribe(getEventRegistry());
        playerLookTracker = new PlayerLookTracker(this);
        playerLookTracker.register();
        getCommandRegistry().registerCommand(new TerrascapeCommand(this));
        getLogger().at(Level.INFO).log("SynthTerrascape setup complete.");
    }

    @Override
    protected void start() {
        startedAt = Instant.now();
        String host = setting("terrascape.http.host", "SYNTH_TERRASCAPE_HOST", DEFAULT_HTTP_HOST);
        int port = parseInt(setting(
                "terrascape.http.port",
                "SYNTH_TERRASCAPE_PORT",
                Integer.toString(DEFAULT_HTTP_PORT)), DEFAULT_HTTP_PORT);
        experimentalDetailsEnabled = parseBoolean(setting(
                "terrascape.experimental.details",
                "SYNTH_TERRASCAPE_EXPERIMENTAL_DETAILS",
                "true"));

        try {
            webServer = new TerrascapeWebServer(this, host, port, experimentalDetailsEnabled, npcRoleIndex);
            webServer.start();
        } catch (IOException e) {
            getLogger().at(Level.SEVERE).withCause(e).log("Failed to start SynthTerrascape HTTP server.");
        }
        getLogger().at(Level.INFO).log("SynthTerrascape started.");
    }

    @Override
    protected void shutdown() {
        getLogger().at(Level.INFO).log("SynthTerrascape shutting down.");
        if (webServer != null) {
            webServer.stop();
            webServer = null;
        }
        if (playerLookTracker != null) {
            playerLookTracker.shutdown();
            playerLookTracker = null;
        }
        npcRoleIndex = null;
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
