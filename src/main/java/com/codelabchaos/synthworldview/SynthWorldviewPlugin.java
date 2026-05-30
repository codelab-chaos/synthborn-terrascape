package com.codelabchaos.synthworldview;

import com.codelabchaos.synthworldview.commands.WorldviewCommand;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;
import java.nio.file.Path;
import java.time.Instant;
import java.util.logging.Level;

public class SynthWorldviewPlugin extends JavaPlugin {
    private static SynthWorldviewPlugin instance;

    private Instant startedAt;

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

    @Override
    protected void setup() {
        instance = this;
        getCommandRegistry().registerCommand(new WorldviewCommand(this));
        getLogger().at(Level.INFO).log("SynthWorldview setup complete.");
    }

    @Override
    protected void start() {
        startedAt = Instant.now();
        getLogger().at(Level.INFO).log("SynthWorldview started.");
    }

    @Override
    protected void shutdown() {
        getLogger().at(Level.INFO).log("SynthWorldview shutting down.");
        startedAt = null;
        instance = null;
    }
}
