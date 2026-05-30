package com.codelabchaos.synthworldview.commands;

import com.codelabchaos.synthworldview.SynthWorldviewPlugin;
import com.codelabchaos.synthworldview.terrain.GltfWriter;
import com.codelabchaos.synthworldview.terrain.TerrainMesh;
import com.codelabchaos.synthworldview.terrain.TerrainMesher;
import com.codelabchaos.synthworldview.terrain.TerrainSampler;
import com.codelabchaos.synthworldview.terrain.TerrainSnapshot;
import com.codelabchaos.synthworldview.web.WorldviewWebServer;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractWorldCommand;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import javax.annotation.Nonnull;
import java.awt.Color;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
            case "sample" -> handleSample(args, context, world);
            case "clearcache" -> handleClearCache(context);
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
        context.sendMessage(Message.raw("  web     : " + plugin.webAddress()).color(Color.WHITE));
        context.sendMessage(Message.raw("  worlds  : " + worlds).color(Color.WHITE));
        context.sendMessage(Message.raw("  terrain : sample and clearcache commands available").color(Color.GREEN));
        WorldviewWebServer.Metrics metrics = plugin.webMetrics();
        if (metrics != null) {
            context.sendMessage(Message.raw("  gen     : active " + metrics.activeGenerations()
                    + "/" + metrics.maxConcurrentGenerations()
                    + ", pending " + metrics.pendingRequests()).color(Color.WHITE));
            context.sendMessage(Message.raw("  chunks  : generated " + metrics.generatedChunks()
                    + ", coalesced " + metrics.coalescedRequests()
                    + ", failed " + metrics.failedGenerations()).color(Color.WHITE));
            context.sendMessage(Message.raw("  http    : single " + metrics.singleRequests()
                    + ", batch " + metrics.batchRequests()).color(Color.WHITE));
        }
    }

    private void handleSample(@Nonnull String[] args, @Nonnull CommandContext context, @Nonnull World world) {
        if (args.length < 4) {
            context.sendMessage(Message.raw("Usage: /worldview sample <chunkX> <chunkZ>").color(Color.YELLOW));
            return;
        }

        Integer chunkX = parseInt(args[2]);
        Integer chunkZ = parseInt(args[3]);
        if (chunkX == null || chunkZ == null) {
            context.sendMessage(Message.raw("Chunk coordinates must be integers.").color(Color.RED));
            return;
        }

        try {
            TerrainSnapshot snapshot = TerrainSampler.sample(world, chunkX, chunkZ);
            TerrainMesh mesh = TerrainMesher.mesh(snapshot);
            byte[] glb = GltfWriter.writeGlb(mesh);
            Path output = sampleOutputPath(world.getName(), chunkX, chunkZ);
            Files.createDirectories(output.getParent());
            Files.write(output, glb);

            context.sendMessage(Message.raw("=== SynthWorldview sample ===").color(Color.CYAN));
            context.sendMessage(Message.raw("  world     : " + world.getName()).color(Color.WHITE));
            context.sendMessage(Message.raw("  chunk     : " + chunkX + ", " + chunkZ).color(Color.WHITE));
            context.sendMessage(Message.raw("  columns   : " + snapshot.nonEmptyColumns()
                    + "/1024 non-empty, y " + snapshot.minY() + ".." + snapshot.maxY()).color(Color.WHITE));
            context.sendMessage(Message.raw("  common    : " + snapshot.mostCommonBlockKey()).color(Color.WHITE));
            context.sendMessage(Message.raw("  mesh      : " + mesh.vertexCount() + " vertices, "
                    + mesh.triangleCount() + " triangles").color(Color.WHITE));
            context.sendMessage(Message.raw("  detail    : " + snapshot.details().length + " proxies, "
                    + mesh.detail().vertexCount() + " vertices, " + mesh.detail().triangleCount() + " triangles")
                    .color(mesh.hasDetail() ? Color.GREEN : Color.WHITE));
            context.sendMessage(Message.raw("  glb       : " + glb.length + " bytes").color(Color.WHITE));
            context.sendMessage(Message.raw("  wrote     : " + output).color(Color.GREEN));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).log(
                    "Worldview sample failed for chunk " + chunkX + "," + chunkZ + ": " + e.getMessage());
            context.sendMessage(Message.raw("Sample failed: " + e.getMessage()).color(Color.RED));
        }
    }

    private Path sampleOutputPath(@Nonnull String worldName, int chunkX, int chunkZ) {
        String safeWorld = worldName.replaceAll("[^A-Za-z0-9_.-]", "_");
        return plugin.worldviewDir()
                .resolve("samples")
                .resolve(safeWorld + "_" + chunkX + "_" + chunkZ + ".glb");
    }

    private void handleClearCache(@Nonnull CommandContext context) {
        try {
            CacheDeleteStats terrain = deleteCacheDirectory("terrain");
            CacheDeleteStats samples = deleteCacheDirectory("samples");
            CacheDeleteStats total = terrain.plus(samples);

            context.sendMessage(Message.raw("=== SynthWorldview clearcache ===").color(Color.CYAN));
            context.sendMessage(Message.raw("  files   : " + total.files()).color(Color.WHITE));
            context.sendMessage(Message.raw("  dirs    : " + total.directories()).color(Color.WHITE));
            context.sendMessage(Message.raw("  bytes   : " + total.bytes()).color(Color.WHITE));
            context.sendMessage(Message.raw("  terrain : " + terrain.files() + " files").color(Color.WHITE));
            context.sendMessage(Message.raw("  samples : " + samples.files() + " files").color(Color.WHITE));
            context.sendMessage(Message.raw("  cleared : " + plugin.worldviewDir()).color(Color.GREEN));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Worldview clearcache failed.");
            context.sendMessage(Message.raw("Clearcache failed: " + e.getMessage()).color(Color.RED));
        }
    }

    private CacheDeleteStats deleteCacheDirectory(@Nonnull String childName) throws IOException {
        Path root = plugin.worldviewDir().toAbsolutePath().normalize();
        Path target = root.resolve(childName).normalize();
        if (!target.startsWith(root)) {
            throw new IOException("Refusing to delete path outside plugin data directory: " + target);
        }
        if (!Files.exists(target)) {
            return CacheDeleteStats.empty();
        }

        CacheDeleteStats stats = CacheDeleteStats.scan(target);
        try (Stream<Path> paths = Files.walk(target)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
        return stats;
    }

    private static void sendUsage(@Nonnull CommandContext context) {
        context.sendMessage(Message.raw("Usage: /worldview status | /worldview sample <chunkX> <chunkZ> | /worldview clearcache").color(Color.YELLOW));
    }

    private static Integer parseInt(@Nonnull String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
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

    private record CacheDeleteStats(long files, long directories, long bytes) {
        static CacheDeleteStats empty() {
            return new CacheDeleteStats(0, 0, 0);
        }

        static CacheDeleteStats scan(@Nonnull Path target) throws IOException {
            long files = 0;
            long directories = 0;
            long bytes = 0;

            try (Stream<Path> paths = Files.walk(target)) {
                for (Path path : paths.toList()) {
                    if (Files.isDirectory(path)) {
                        directories++;
                    } else if (Files.isRegularFile(path)) {
                        files++;
                        bytes += Files.size(path);
                    }
                }
            }

            return new CacheDeleteStats(files, directories, bytes);
        }

        CacheDeleteStats plus(@Nonnull CacheDeleteStats other) {
            return new CacheDeleteStats(
                    files + other.files,
                    directories + other.directories,
                    bytes + other.bytes);
        }
    }
}
