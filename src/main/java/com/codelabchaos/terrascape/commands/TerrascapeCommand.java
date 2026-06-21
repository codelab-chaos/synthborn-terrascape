package com.codelabchaos.terrascape.commands;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.access.AccessTokens;
import com.codelabchaos.terrascape.terrain.GltfWriter;
import com.codelabchaos.terrascape.terrain.TerrainMesh;
import com.codelabchaos.terrascape.terrain.TerrainMesher;
import com.codelabchaos.terrascape.terrain.TerrainSampler;
import com.codelabchaos.terrascape.terrain.TerrainSnapshot;
import com.codelabchaos.terrascape.web.TerrascapeWebServer;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.universe.PlayerRef;
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
import java.util.UUID;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class TerrascapeCommand extends AbstractWorldCommand {
    private final TerrascapePlugin plugin;

    public TerrascapeCommand(@Nonnull TerrascapePlugin plugin) {
        super("terrascape", "Terrascape status and validation commands");
        this.requirePermission("terrascape.admin");
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
            case "clearcache" -> handleClearCache(context, args.length >= 3 ? args[2].toLowerCase() : "all");
            case "maplink", "maptoken" -> handleMapLink(context, store, subcommand.equals("maptoken"));
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

        context.sendMessage(Message.raw("=== Terrascape status ===").color(Color.CYAN));
        context.sendMessage(Message.raw("  plugin  : loaded").color(Color.WHITE));
        context.sendMessage(Message.raw("  uptime  : " + uptime).color(Color.WHITE));
        context.sendMessage(Message.raw("  web     : " + plugin.webAddress()).color(Color.WHITE));
        context.sendMessage(Message.raw("  worlds  : " + worlds).color(Color.WHITE));
        context.sendMessage(Message.raw("  terrain : sample and clearcache commands available").color(Color.GREEN));
        TerrascapeWebServer.Metrics metrics = plugin.webMetrics();
        if (metrics != null) {
            context.sendMessage(Message.raw("  gen     : active " + metrics.activeGenerations()
                    + "/" + metrics.maxConcurrentGenerations()
                    + ", pending " + metrics.pendingRequests()).color(Color.WHITE));
            context.sendMessage(Message.raw("  chunks  : generated " + metrics.generatedChunks()
                    + ", coalesced " + metrics.coalescedRequests()
                    + ", failed " + metrics.failedGenerations()).color(Color.WHITE));
            context.sendMessage(Message.raw("  cache   : memory " + metrics.memoryCacheEntries()
                    + "/" + metrics.maxMemoryCacheEntries()
                    + " entries, " + formatBytes(metrics.memoryCacheBytes())
                    + "/" + formatBytes(metrics.maxMemoryCacheBytes())
                    + ", hits " + metrics.memoryCacheHits()).color(Color.WHITE));
            context.sendMessage(Message.raw("  disk    : " + metrics.diskCacheFiles()
                    + " GLBs, " + formatBytes(metrics.diskCacheBytes())
                    + ", hits " + metrics.diskCacheHits()).color(Color.WHITE));
            context.sendMessage(Message.raw("  http    : single " + metrics.singleRequests()
                    + ", batch " + metrics.batchRequests()).color(Color.WHITE));
        }
        if (plugin.config() != null) {
            context.sendMessage(Message.raw("  config  : " + plugin.config().configPath()).color(Color.WHITE));
        }
    }

    private void handleSample(@Nonnull String[] args, @Nonnull CommandContext context, @Nonnull World world) {
        if (args.length < 4) {
            context.sendMessage(Message.raw("Usage: /terrascape sample <chunkX> <chunkZ>").color(Color.YELLOW));
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

            context.sendMessage(Message.raw("=== Terrascape sample ===").color(Color.CYAN));
            context.sendMessage(Message.raw("  world     : " + world.getName()).color(Color.WHITE));
            context.sendMessage(Message.raw("  chunk     : " + chunkX + ", " + chunkZ).color(Color.WHITE));
            context.sendMessage(Message.raw("  columns   : " + snapshot.nonEmptyColumns()
                    + "/1024 non-empty, y " + snapshot.minY() + ".." + snapshot.maxY()).color(Color.WHITE));
            context.sendMessage(Message.raw("  common    : " + snapshot.mostCommonBlockKey()).color(Color.WHITE));
            context.sendMessage(Message.raw("  mesh      : " + mesh.vertexCount() + " vertices, "
                    + mesh.triangleCount() + " triangles").color(Color.WHITE));
            context.sendMessage(Message.raw("  detail    : " + snapshot.details().length + " voxels, "
                    + mesh.detail().vertexCount() + " vertices, " + mesh.detail().triangleCount() + " triangles")
                    .color(mesh.hasDetail() ? Color.GREEN : Color.WHITE));
            context.sendMessage(Message.raw("  glb       : " + glb.length + " bytes").color(Color.WHITE));
            context.sendMessage(Message.raw("  wrote     : " + output).color(Color.GREEN));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).log(
                    "Terrascape sample failed for chunk " + chunkX + "," + chunkZ + ": " + e.getMessage());
            context.sendMessage(Message.raw("Sample failed: " + e.getMessage()).color(Color.RED));
        }
    }

    private Path sampleOutputPath(@Nonnull String worldName, int chunkX, int chunkZ) {
        String safeWorld = worldName.replaceAll("[^A-Za-z0-9_.-]", "_");
        return (plugin.config() == null
                ? plugin.terrascapeDir().resolve("samples")
                : plugin.config().folders().samplesDir())
                .resolve(safeWorld + "_" + chunkX + "_" + chunkZ + ".glb");
    }

    private void handleClearCache(@Nonnull CommandContext context, @Nonnull String target) {
        boolean clearMesh = target.equals("all") || target.equals("mesh");
        boolean clearTiles = target.equals("all") || target.equals("tiles");
        if (!clearMesh && !clearTiles) {
            context.sendMessage(Message.raw("Usage: /terrascape clearcache [mesh|tiles|all]").color(Color.YELLOW));
            return;
        }
        try {
            context.sendMessage(Message.raw("=== Terrascape clearcache (" + target + ") ===").color(Color.CYAN));

            if (clearMesh) {
                TerrascapeWebServer.MemoryCacheStats memory = plugin.webServer() == null
                        ? new TerrascapeWebServer.MemoryCacheStats(0, 0)
                        : plugin.webServer().clearMemoryCache();
                CacheDeleteStats terrain = deleteCacheDirectory(plugin.config() == null
                        ? plugin.terrascapeDir().resolve("terrain")
                        : plugin.config().folders().terrainCacheDir());
                CacheDeleteStats samples = deleteCacheDirectory(plugin.config() == null
                        ? plugin.terrascapeDir().resolve("samples")
                        : plugin.config().folders().samplesDir());
                CacheDeleteStats total = terrain.plus(samples);
                context.sendMessage(Message.raw("  mesh files  : " + total.files()
                        + " (" + total.bytes() + " bytes)").color(Color.WHITE));
                context.sendMessage(Message.raw("  mesh memory : " + memory.entries()
                        + " entries, " + formatBytes(memory.bytes())).color(Color.WHITE));
            }

            if (clearTiles) {
                int tiles = plugin.webServer() == null ? 0 : plugin.webServer().clearMapTileCache();
                context.sendMessage(Message.raw("  tile memory : " + tiles + " entries").color(Color.WHITE));
            }

            context.sendMessage(Message.raw("  cleared : " + plugin.terrascapeDir()).color(Color.GREEN));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Terrascape clearcache failed.");
            context.sendMessage(Message.raw("Clearcache failed: " + e.getMessage()).color(Color.RED));
        }
    }

    private CacheDeleteStats deleteCacheDirectory(@Nonnull Path targetPath) throws IOException {
        Path root = plugin.terrascapeDir().toAbsolutePath().normalize();
        Path target = targetPath.toAbsolutePath().normalize();
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

    private void handleMapLink(@Nonnull CommandContext context, @Nonnull Store<EntityStore> store, boolean tokenOnly) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Run /terrascape maplink in-game as a player.").color(Color.YELLOW));
            return;
        }
        Ref<EntityStore> playerEntity = context.senderAsPlayerRef();
        if (playerEntity == null || !playerEntity.isValid()) {
            context.sendMessage(Message.raw("Could not resolve your player.").color(Color.RED));
            return;
        }
        PlayerRef sender = store.getComponent(playerEntity, PlayerRef.getComponentType());
        if (sender == null || sender.getUuid() == null) {
            context.sendMessage(Message.raw("Player has no UUID.").color(Color.RED));
            return;
        }
        AccessTokens tokens = plugin.accessTokens();
        if (tokens == null || plugin.config() == null) {
            context.sendMessage(Message.raw("Access tokens unavailable.").color(Color.RED));
            return;
        }
        Duration ttl = plugin.config().access().tokenTtl();
        AccessTokens.MintResult result = tokens.mint(sender.getUuid(), ttl);
        if (result.token() == null) {
            long minutes = Math.max(1, (result.cooldownMs() + 59_999) / 60_000);
            context.sendMessage(Message.raw("Please wait ~" + minutes + "m before generating another access link.").color(Color.YELLOW));
            return;
        }
        Instant expires = Instant.now().plus(ttl);
        context.sendMessage(Message.raw("=== Terrascape access ===").color(Color.CYAN));
        context.sendMessage(Message.raw(tokenOnly ? result.token() : mapBaseUrl() + "/?key=" + result.token()).color(Color.GREEN));
        context.sendMessage(Message.raw("Valid until " + expires + " (~" + ttl.toHours()
                + "h). Bookmark it now - it will not be shown again.").color(Color.WHITE));
        if (!plugin.config().access().restricted()) {
            context.sendMessage(Message.raw("Note: access.mode is 'public', so a key is not required yet.").color(Color.YELLOW));
        }
    }

    private String mapBaseUrl() {
        String pub = plugin.config().access().publicBaseUrl();
        if (pub != null && !pub.isBlank()) {
            return pub.replaceAll("/+$", "");
        }
        return "http://" + plugin.config().http().host() + ":" + plugin.config().http().port();
    }

    private static void sendUsage(@Nonnull CommandContext context) {
        context.sendMessage(Message.raw("Usage: /terrascape status | sample <chunkX> <chunkZ> | clearcache [mesh|tiles|all] | maplink | maptoken").color(Color.YELLOW));
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

    private static String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        double kib = bytes / 1024.0;
        if (kib < 1024) {
            return String.format(java.util.Locale.ROOT, "%.1f KiB", kib);
        }
        double mib = kib / 1024.0;
        if (mib < 1024) {
            return String.format(java.util.Locale.ROOT, "%.1f MiB", mib);
        }
        return String.format(java.util.Locale.ROOT, "%.1f GiB", mib / 1024.0);
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
