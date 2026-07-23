package com.codelabchaos.terrascape;

import com.codelabchaos.terrascape.access.AccessTokens;
import com.codelabchaos.terrascape.commands.TerrascapeCommand;
import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.codelabchaos.terrascape.web.NpcRoleIndex;
import com.codelabchaos.terrascape.web.TerrascapeWebServer;
import com.codelabchaos.terrascape.web.WebConsoleService;
import com.codelabchaos.rcon.RconConfig;
import com.codelabchaos.rcon.RconLog;
import com.codelabchaos.rcon.RconServer;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.logging.Level;

public class TerrascapePlugin extends JavaPlugin {
    private static TerrascapePlugin instance;

    private Instant startedAt;
    private TerrascapeConfig config;
    private AccessTokens accessTokens;
    private TerrascapeWebServer webServer;
    private NpcRoleIndex npcRoleIndex;
    private PlayerLookTracker playerLookTracker;
    private RconServer rconServer;
    private WebConsoleService webConsoleService;

    public TerrascapePlugin(@Nonnull JavaPluginInit init) {
        super(init);
    }

    public static TerrascapePlugin get() {
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

    public TerrascapeConfig config() {
        return config;
    }

    public AccessTokens accessTokens() {
        return accessTokens;
    }

    public NpcRoleIndex npcRoleIndex() {
        return npcRoleIndex;
    }

    public PlayerLookTracker playerLookTracker() {
        return playerLookTracker;
    }

    public WebConsoleService webConsoleService() {
        return webConsoleService;
    }

    public boolean experimentalDetailsEnabled() {
        return config == null || config.features().experimentalDetails();
    }

    @Override
    protected void setup() {
        instance = this;
        npcRoleIndex = new NpcRoleIndex();
        npcRoleIndex.subscribe(getEventRegistry());
        playerLookTracker = new PlayerLookTracker(this);
        playerLookTracker.register();
        webConsoleService = new WebConsoleService(this);
        webConsoleService.register(getEventRegistry());
        // Make our nodes discoverable in /perm listings and tab-completion. Admins (the
        // hytale:Admin group holds '*') already satisfy them; granting terrascape.map.use to a
        // user or group is how an admin lets specific players open the web map.
        PermissionsModule.registerPermission(TerrascapeCommand.PERM_ADMIN);
        PermissionsModule.registerPermission(TerrascapeCommand.PERM_MAP_USE);
        getCommandRegistry().registerCommand(new TerrascapeCommand(this));
        getLogger().at(Level.INFO).log("Terrascape setup complete.");
    }

    @Override
    protected void start() {
        startedAt = Instant.now();

        try {
            config = TerrascapeConfig.load(getDataDirectory());
            config.ensureRuntimeDirectories();
            accessTokens = AccessTokens.load(getDataDirectory());
            getLogger().at(Level.INFO).log("Terrascape config loaded from " + config.configPath());
            webServer = new TerrascapeWebServer(this, config, npcRoleIndex);
            webServer.start();
        } catch (IOException e) {
            getLogger().at(Level.SEVERE).withCause(e).log("Failed to start Terrascape HTTP server.");
        }
        startRcon();
        getLogger().at(Level.INFO).log("Terrascape started.");
    }

    /** Starts opt-in RCON, authorized only by the configured RCON password. */
    private void startRcon() {
        if (config == null) {
            return;
        }
        TerrascapeConfig.Rcon r = config.rcon();
        rconServer = new RconServer(
                new RconConfig(r.enabled(), r.host(), r.port(), r.password(), r.allowRemote(), false),
                "Terrascape",
                new RconLog() {
                    @Override
                    public void info(String message) {
                        getLogger().at(Level.INFO).log(message);
                    }

                    @Override
                    public void error(String message, Throwable cause) {
                        if (cause != null) {
                            getLogger().at(Level.SEVERE).withCause(cause).log(message);
                        } else {
                            getLogger().at(Level.SEVERE).log(message);
                        }
                    }
                });
        rconServer.start();
    }

    @Override
    protected void shutdown() {
        getLogger().at(Level.INFO).log("Terrascape shutting down.");
        if (rconServer != null) {
            rconServer.stop();
            rconServer = null;
        }
        if (webServer != null) {
            webServer.stop();
            webServer = null;
        }
        if (playerLookTracker != null) {
            playerLookTracker.shutdown();
            playerLookTracker = null;
        }
        npcRoleIndex = null;
        webConsoleService = null;
        config = null;
        startedAt = null;
        instance = null;
    }
}
