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
import com.hypixel.hytale.server.core.command.system.arguments.system.RequiredArg;
import com.hypixel.hytale.server.core.command.system.arguments.types.ArgTypes;
import com.hypixel.hytale.server.core.command.system.arguments.types.SingleArgumentType;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractCommandCollection;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractWorldCommand;
import com.hypixel.hytale.server.core.command.system.basecommands.CommandBase;
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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class TerrascapeCommand extends AbstractCommandCollection {
    /** Full plugin control: status, sampling, cache management, and minting map links. */
    public static final String PERM_ADMIN = "terrascape.admin";
    /** Permission to open the web map (mint an access link). Admins grant this to regular users. */
    public static final String PERM_MAP_USE = "terrascape.map.use";
    private static final DateTimeFormatter USER_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a z", Locale.US);
    private static final SingleArgumentType<CacheTarget> CACHE_TARGET_ARG =
            ArgTypes.forEnum("Terrascape cache target", CacheTarget.class);
    private static final SingleArgumentType<SmokeScope> SMOKE_SCOPE_ARG =
            ArgTypes.forEnum("Terrascape smoke-token scope", SmokeScope.class);

    private final TerrascapePlugin plugin;

    public TerrascapeCommand(@Nonnull TerrascapePlugin plugin) {
        super("terrascape", "Terrascape status and validation commands");
        this.plugin = plugin;
        // Map access is the lowest bar to invoke the command. Explicit permissions on each child
        // let Hytale's command tree omit admin-only entries from autocomplete for regular users.
        // The hytale:Admin group holds the '*' wildcard, so ops satisfy both nodes automatically.
        this.requirePermission(PERM_MAP_USE);
        this.addSubCommand(new MapLinkCommand());
        this.addSubCommand(new StatusCommand());
        this.addSubCommand(new ClearCacheCommand());
        this.addSubCommand(new MapTokenCommand());
        this.addSubCommand(new TokensCommand());
        this.addSubCommand(new RevokeTokenCommand());
    }

    private final class MapLinkCommand extends AbstractWorldCommand {
        private MapLinkCommand() {
            super("maplink", "Create a personal Terrascape map link");
            this.requirePermission(PERM_MAP_USE);
        }

        @Override
        protected void execute(
                @Nonnull CommandContext context,
                @Nonnull World world,
                @Nonnull Store<EntityStore> store
        ) {
            handleMapLink(context, store, false);
        }
    }

    private final class StatusCommand extends CommandBase {
        private StatusCommand() {
            super("status", "Show Terrascape server and cache status");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            sendStatus(context);
        }
    }

    private final class SampleCommand extends AbstractWorldCommand {
        private final RequiredArg<Integer> chunkXArg = this.withRequiredArg(
                "chunkX", "Chunk X coordinate", ArgTypes.INTEGER);
        private final RequiredArg<Integer> chunkZArg = this.withRequiredArg(
                "chunkZ", "Chunk Z coordinate", ArgTypes.INTEGER);

        private SampleCommand() {
            super("sample", "Export a terrain sample for one chunk");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void execute(
                @Nonnull CommandContext context,
                @Nonnull World world,
                @Nonnull Store<EntityStore> store
        ) {
            handleSample(chunkXArg.get(context), chunkZArg.get(context), context, world);
        }
    }

    private final class ClearCacheCommand extends CommandBase {
        private ClearCacheCommand() {
            super("clearcache", "Clear Terrascape mesh or map-tile caches");
            this.requirePermission(PERM_ADMIN);
            this.addUsageVariant(new ClearCacheTargetVariant());
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleClearCache(context, CacheTarget.ALL);
        }
    }

    private final class ClearCacheTargetVariant extends CommandBase {
        private final RequiredArg<CacheTarget> targetArg = this.withRequiredArg(
                "target", "Cache to clear", CACHE_TARGET_ARG);

        private ClearCacheTargetVariant() {
            super("Clear Terrascape mesh or map-tile caches");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleClearCache(context, targetArg.get(context));
        }
    }

    private final class MapTokenCommand extends AbstractWorldCommand {
        private MapTokenCommand() {
            super("maptoken", "Create a personal Terrascape access token");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void execute(
                @Nonnull CommandContext context,
                @Nonnull World world,
                @Nonnull Store<EntityStore> store
        ) {
            handleMapLink(context, store, true);
        }
    }

    private final class TokensCommand extends CommandBase {
        private TokensCommand() {
            super("tokens", "List active Terrascape map-link IDs");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleListTokens(context);
        }
    }

    private final class RevokeTokenCommand extends CommandBase {
        private final RequiredArg<String> tokenIdArg = this.withRequiredArg(
                "tokenId", "Token ID shown by /terrascape tokens", ArgTypes.STRING);

        private RevokeTokenCommand() {
            super("revoketoken", "Revoke one Terrascape map link");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleRevokeToken(context, tokenIdArg.get(context));
        }
    }

    private final class SmokeTokenCommand extends CommandBase {
        private SmokeTokenCommand() {
            super("smoketoken", "Create a validation-only access token");
            this.requirePermission(PERM_ADMIN);
            this.addUsageVariant(new SmokeTokenScopeVariant());
            this.addUsageVariant(new SmokeTokenSubjectVariant());
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleSmokeToken(SmokeScope.ADMIN, null, context);
        }
    }

    private final class SmokeTokenScopeVariant extends CommandBase {
        private final RequiredArg<SmokeScope> scopeArg = this.withRequiredArg(
                "scope", "Token scope", SMOKE_SCOPE_ARG);

        private SmokeTokenScopeVariant() {
            super("Create a validation-only access token");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleSmokeToken(scopeArg.get(context), null, context);
        }
    }

    private final class SmokeTokenSubjectVariant extends CommandBase {
        private final RequiredArg<SmokeScope> scopeArg = this.withRequiredArg(
                "scope", "Token scope", SMOKE_SCOPE_ARG);
        private final RequiredArg<String> subjectArg = this.withRequiredArg(
                "subject", "Unique smoke-test subject", ArgTypes.STRING);

        private SmokeTokenSubjectVariant() {
            super("Create a validation-only access token");
            this.requirePermission(PERM_ADMIN);
        }

        @Override
        protected void executeSync(@Nonnull CommandContext context) {
            handleSmokeToken(scopeArg.get(context), subjectArg.get(context), context);
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
        context.sendMessage(Message.raw("  terrain : live meshing and cache controls available").color(Color.GREEN));
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

    private void handleSample(int chunkX, int chunkZ, @Nonnull CommandContext context, @Nonnull World world) {
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

    private void handleClearCache(@Nonnull CommandContext context, @Nonnull CacheTarget target) {
        boolean clearMesh = target == CacheTarget.ALL || target == CacheTarget.MESH;
        boolean clearTiles = target == CacheTarget.ALL || target == CacheTarget.TILES;
        try {
            context.sendMessage(Message.raw("=== Terrascape clearcache ("
                    + target.name().toLowerCase(Locale.ROOT) + ") ===").color(Color.CYAN));

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

    private void handleSmokeToken(
            @Nonnull SmokeScope scope,
            String requestedSubject,
            @Nonnull CommandContext context
    ) {
        AccessTokens tokens = plugin.accessTokens();
        if (tokens == null || plugin.config() == null) {
            context.sendMessage(Message.raw("Access tokens unavailable.").color(Color.RED));
            return;
        }
        if (!plugin.config().validation().smokeTokensEnabled()) {
            context.sendMessage(Message.raw("Smoke token minting is disabled. Set validation.smokeTokensEnabled=true only on dedicated validation servers.").color(Color.YELLOW));
            return;
        }

        String subject = requestedSubject == null
                ? "runtime-smoke-" + Instant.now().toEpochMilli()
                : requestedSubject.trim();
        if (subject.isBlank()) {
            context.sendMessage(Message.raw("Smoke token subject must not be blank.").color(Color.RED));
            return;
        }

        Set<String> scopes = new LinkedHashSet<>();
        scopes.add(AccessTokens.SCOPE_MAP);
        if (scope == SmokeScope.ADMIN) {
            scopes.add(AccessTokens.SCOPE_ADMIN);
        }

        Duration ttl = tokenTtlFor(scopes);
        UUID syntheticPlayer = AccessTokens.syntheticPlayerUuid(subject);
        AccessTokens.MintResult result = tokens.mint(syntheticPlayer, ttl, scopes);
        if (result.token() == null) {
            long minutes = Math.max(1, (result.cooldownMs() + 59_999) / 60_000);
            context.sendMessage(Message.raw("Smoke token rate-limited for subject '" + subject
                    + "'; use a unique subject or wait ~" + minutes + "m.").color(Color.YELLOW));
            return;
        }

        Instant expires = Instant.now().plus(ttl);
        context.sendMessage(Message.raw("=== Terrascape smoke token ===").color(Color.CYAN));
        context.sendMessage(Message.raw("  subject  : " + subject).color(Color.WHITE));
        context.sendMessage(Message.raw("  uuid     : " + syntheticPlayer).color(Color.WHITE));
        context.sendMessage(Message.raw("  scopes   : " + String.join(", ", scopes)).color(Color.WHITE));
        context.sendMessage(Message.raw("  link id  : " + result.tokenId()).color(Color.WHITE));
        context.sendMessage(Message.raw("  token    : " + result.token()).color(Color.GREEN));
        context.sendMessage(Message.raw("  expires  : " + formatExpiresAt(expires)
                + " (~" + formatDuration(ttl) + ")").color(Color.WHITE));
        if (!plugin.config().access().restricted()) {
            context.sendMessage(Message.raw("Note: access.mode is 'public', but scoped endpoints still require this key.").color(Color.YELLOW));
        }
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
        Set<String> scopes = mapScopesFor(context);
        Duration ttl = tokenTtlFor(scopes);
        AccessTokens.MintResult result = tokens.mint(sender.getUuid(), sender.getUsername(), ttl, scopes);
        if (result.token() == null) {
            long minutes = Math.max(1, (result.cooldownMs() + 59_999) / 60_000);
            context.sendMessage(Message.raw("Please wait ~" + minutes + "m before generating another access link.").color(Color.YELLOW));
            return;
        }
        Instant expires = Instant.now().plus(ttl);
        context.sendMessage(Message.raw("=== Terrascape access ===").color(Color.CYAN));
        context.sendMessage(Message.raw("Link ID: " + result.tokenId()).monospace(true).color(Color.WHITE));
        if (tokenOnly) {
            context.sendMessage(Message.raw(result.token()).monospace(true).color(Color.GREEN));
        } else {
            String url = mapBaseUrl() + "/?key=" + result.token();
            context.sendMessage(Message.raw("Open Terrascape map").link(url).color(Color.GREEN));
        }
        context.sendMessage(Message.raw("Valid until " + formatExpiresAt(expires)
                + " (~" + formatDuration(ttl) + "), scope: " + String.join(", ", scopes)
                + ". Bookmark it now - it will not be shown again.").color(Color.WHITE));
        if (!plugin.config().access().restricted()) {
            context.sendMessage(Message.raw("Note: access.mode is 'public', so a key is not required yet.").color(Color.YELLOW));
        }
    }

    private void handleListTokens(@Nonnull CommandContext context) {
        AccessTokens tokens = plugin.accessTokens();
        if (tokens == null) {
            context.sendMessage(Message.raw("Access tokens unavailable.").color(Color.RED));
            return;
        }
        java.util.List<AccessTokens.TokenSummary> active = tokens.activeTokens();
        context.sendMessage(Message.raw("=== Terrascape active links (" + active.size() + ") ===").color(Color.CYAN));
        if (active.isEmpty()) {
            context.sendMessage(Message.raw("  none").color(Color.WHITE));
            return;
        }
        int shown = Math.min(active.size(), 50);
        for (int i = 0; i < shown; i++) {
            AccessTokens.TokenSummary token = active.get(i);
            String owner = token.subjectName() != null
                    ? token.subjectName() + " (" + token.subjectUuid() + ")"
                    : token.subjectUuid() != null ? token.subjectUuid().toString() : "legacy/unbound";
            context.sendMessage(Message.raw("  " + token.id() + "  " + owner
                    + "  [" + String.join(",", token.scopes()) + "]  expires "
                    + formatExpiresAt(Instant.ofEpochMilli(token.expiresAt()))).color(Color.WHITE));
        }
        if (active.size() > shown) {
            context.sendMessage(Message.raw("  ... " + (active.size() - shown) + " more").color(Color.YELLOW));
        }
    }

    private void handleRevokeToken(@Nonnull CommandContext context, @Nonnull String tokenId) {
        AccessTokens tokens = plugin.accessTokens();
        if (tokens == null) {
            context.sendMessage(Message.raw("Access tokens unavailable.").color(Color.RED));
            return;
        }
        AccessTokens.RevokeStatus status = tokens.revokeById(tokenId);
        switch (status) {
            case REVOKED -> context.sendMessage(
                    Message.raw("Revoked Terrascape link " + tokenId + ".").color(Color.GREEN));
            case NOT_FOUND -> context.sendMessage(
                    Message.raw("No active Terrascape link matches " + tokenId + ".").color(Color.YELLOW));
            case AMBIGUOUS -> context.sendMessage(
                    Message.raw("That prefix matches multiple links; use the full listed ID.").color(Color.YELLOW));
            case INVALID_ID -> context.sendMessage(
                    Message.raw("Token IDs are hexadecimal and at least 8 characters.").color(Color.RED));
        }
    }

    /**
     * Snapshots the player's web capabilities into token scopes: every permitted viewer gets
     * {@code map}; {@code terrascape.admin} holders also get {@code admin} so their web session can
     * reach admin-only APIs without a static debug token.
     */
    @Nonnull
    private Set<String> mapScopesFor(@Nonnull CommandContext context) {
        Set<String> scopes = new LinkedHashSet<>();
        scopes.add(AccessTokens.SCOPE_MAP);
        if (context.sender().hasPermission(PERM_ADMIN)) {
            scopes.add(AccessTokens.SCOPE_ADMIN);
        }
        return scopes;
    }

    @Nonnull
    private Duration tokenTtlFor(@Nonnull Set<String> scopes) {
        if (scopes.contains(AccessTokens.SCOPE_ADMIN)) {
            return plugin.config().access().adminMapTokenTtl();
        }
        return plugin.config().access().mapTokenTtl();
    }

    private String mapBaseUrl() {
        String pub = plugin.config().access().publicBaseUrl();
        if (pub != null && !pub.isBlank()) {
            return pub.replaceAll("/+$", "");
        }
        return "http://" + plugin.config().http().host() + ":" + plugin.config().http().port();
    }

    private static String formatDuration(@Nonnull Duration duration) {
        long seconds = Math.max(0, duration.getSeconds());
        long minutes = seconds / 60;
        long hours = minutes / 60;
        if (hours > 0) {
            long remainingMinutes = minutes % 60;
            return remainingMinutes == 0 ? hours + "h" : hours + "h " + remainingMinutes + "m";
        }
        if (minutes > 0) {
            return minutes + "m " + (seconds % 60) + "s";
        }
        return seconds + "s";
    }

    static String formatExpiresAt(@Nonnull Instant expiresAt) {
        return formatExpiresAt(expiresAt, ZoneId.systemDefault());
    }

    static String formatExpiresAt(@Nonnull Instant expiresAt, @Nonnull ZoneId zoneId) {
        return USER_DATE_TIME_FORMAT.withZone(zoneId).format(expiresAt);
    }

    private static String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        double kib = bytes / 1024.0;
        if (kib < 1024) {
            return String.format(java.util.Locale.ROOT, "%.1f KB", kib);
        }
        double mib = kib / 1024.0;
        if (mib < 1024) {
            return String.format(java.util.Locale.ROOT, "%.1f MB", mib);
        }
        return String.format(java.util.Locale.ROOT, "%.1f GB", mib / 1024.0);
    }

    private enum CacheTarget {
        MESH,
        TILES,
        ALL
    }

    private enum SmokeScope {
        MAP,
        ADMIN
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
