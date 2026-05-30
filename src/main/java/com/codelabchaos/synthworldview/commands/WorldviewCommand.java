package com.codelabchaos.synthworldview.commands;

import com.codelabchaos.synthworldview.SynthWorldviewPlugin;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractWorldCommand;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import javax.annotation.Nonnull;
import java.awt.Color;
import java.time.Duration;
import java.time.Instant;
import java.util.stream.Collectors;

public class WorldviewCommand extends AbstractWorldCommand {
    private final SynthWorldviewPlugin plugin;

    public WorldviewCommand(@Nonnull SynthWorldviewPlugin plugin) {
        super("worldview", "SynthWorldview status and validation commands");
        this.requirePermission("synthworldview.admin");
        this.setAllowsExtraArguments(true);
        this.plugin = plugin;
    }

    @Override
    protected void execute(@Nonnull CommandContext context, @Nonnull World world, @Nonnull Store<EntityStore> store) {
        String[] args = context.getInputString().trim().split("\\s+");
        String subcommand = args.length >= 2 ? args[1].toLowerCase() : "status";

        switch (subcommand) {
            case "status" -> sendStatus(context);
            default -> sendUsage(context);
        }
    }

    private void sendStatus(@Nonnull CommandContext context) {
        Instant startedAt = plugin.startedAt();
        String uptime = startedAt == null ? "not started" : formatDuration(Duration.between(startedAt, Instant.now()));
        String worlds = Universe.get() == null
                ? "<universe unavailable>"
                : Universe.get().getWorlds().values().stream()
                        .map(World::getName)
                        .sorted()
                        .collect(Collectors.joining(", "));
        if (worlds.isBlank()) {
            worlds = "<none>";
        }

        context.sendMessage(Message.raw("=== SynthWorldview status ===").color(Color.CYAN));
        context.sendMessage(Message.raw("  plugin  : loaded").color(Color.WHITE));
        context.sendMessage(Message.raw("  uptime  : " + uptime).color(Color.WHITE));
        context.sendMessage(Message.raw("  worlds  : " + worlds).color(Color.WHITE));
        context.sendMessage(Message.raw("  terrain : not implemented yet (MVP scaffold)").color(Color.YELLOW));
    }

    private static void sendUsage(@Nonnull CommandContext context) {
        context.sendMessage(Message.raw("Usage: /worldview status").color(Color.YELLOW));
    }

    private static String formatDuration(@Nonnull Duration duration) {
        long seconds = Math.max(0, duration.getSeconds());
        long minutes = seconds / 60;
        long hours = minutes / 60;
        if (hours > 0) {
            return hours + "h " + (minutes % 60) + "m";
        }
        if (minutes > 0) {
            return minutes + "m " + (seconds % 60) + "s";
        }
        return seconds + "s";
    }
}
