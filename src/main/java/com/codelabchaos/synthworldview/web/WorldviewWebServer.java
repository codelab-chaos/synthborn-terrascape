package com.codelabchaos.synthworldview.web;

import com.codelabchaos.synthworldview.SynthWorldviewPlugin;
import com.codelabchaos.synthworldview.PlayerLookTracker;
import com.codelabchaos.synthworldview.terrain.GltfWriter;
import com.codelabchaos.synthworldview.terrain.TerrainMesh;
import com.codelabchaos.synthworldview.terrain.TerrainMesher;
import com.codelabchaos.synthworldview.terrain.TerrainSampler;
import com.codelabchaos.synthworldview.terrain.TerrainSnapshot;
import com.hypixel.hytale.component.Archetype;
import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.ResourceType;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.spatial.SpatialResource;
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.math.vector.Transform;
import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import com.hypixel.hytale.server.core.entity.Entity;
import com.hypixel.hytale.server.core.entity.EntityUtils;
import com.hypixel.hytale.server.core.entity.UUIDComponent;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.entity.entities.ProjectileComponent;
import com.hypixel.hytale.server.core.modules.entity.AllLegacyEntityTypesQuery;
import com.hypixel.hytale.server.core.modules.entity.AllLegacyLivingEntityTypesQuery;
import com.hypixel.hytale.server.core.modules.entity.EntityModule;
import com.hypixel.hytale.server.core.modules.entity.component.ModelComponent;
import com.hypixel.hytale.server.core.modules.entity.component.PersistentModel;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.tracker.EntityTrackerSystems;
import com.hypixel.hytale.server.core.modules.entity.tracker.NetworkId;
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatMap;
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatValue;
import com.hypixel.hytale.server.core.modules.entitystats.asset.DefaultEntityStatTypes;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.modules.entity.player.PlayerSkinComponent;
import com.hypixel.hytale.server.core.modules.time.TimeModule;
import com.hypixel.hytale.server.core.modules.time.WorldTimeResource;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.protocol.PlayerSkin;
import com.hypixel.hytale.server.npc.NPCPlugin;
import com.hypixel.hytale.server.npc.entities.NPCEntity;
import com.hypixel.hytale.server.npc.role.Role;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.joml.Vector3d;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public final class WorldviewWebServer {
    private static final String FORMAT_VERSION = "v13";
    private static final Duration TERRAIN_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration BATCH_TERRAIN_TIMEOUT = Duration.ofSeconds(45);
    private static final int MAX_BATCH_CHUNKS = 16;
    private static final int MAX_CONCURRENT_GENERATIONS = 1;
    private static final int MAX_MEMORY_CACHE_ENTRIES = 128;
    private static final long MAX_MEMORY_CACHE_BYTES = 128L * 1024L * 1024L;
    private static final int MAP_REGION_TILE_SIZE = 32;
    private static final int MAX_MAP_REGION_RADIUS = 108;
    private static final int MAP_REGION_GENERATE_RADIUS = 20;
    private static final int MAX_MAP_REGION_MEMORY_CACHE_ENTRIES = 16;
    private static final long MAX_MAP_REGION_MEMORY_CACHE_BYTES = 64L * 1024L * 1024L;
    private static final int MAX_MAP_TILE_MEMORY_CACHE_ENTRIES = 20_000;
    private static final String MAP_REGION_CACHE_CONTROL = "public, max-age=31536000, immutable";
    private static final Duration MAP_REGION_TIMEOUT = Duration.ofSeconds(60);
    private static final int MAX_CLIENT_LOG_BYTES = 16 * 1024;
    private static final String[] PERF_CLIENT_LOG_TYPES = {
            "\"type\":\"frame_hitch\"",
            "\"type\":\"grid_load\"",
            "\"type\":\"terrain_single_load\"",
            "\"type\":\"map_tile_single_load\"",
            "\"type\":\"map_tiles_stream\""
    };
    private static final int STATIC_HTTP_THREADS = 2;
    private static final int API_HTTP_THREADS = 8;
    private static final int MAX_MOB_SNAPSHOTS = 256;
    private static final int MAX_MOB_DEBUG_SUMMARY_ITEMS = 32;
    private static final double MOB_RADAR_RADIUS = 500.0d;
    private static final double MOB_RADAR_RADIUS_SQ = MOB_RADAR_RADIUS * MOB_RADAR_RADIUS;
    private static final long ENTITY_STREAM_INTERVAL_MS = 1000L;
    private static final String PLAYER_AVATAR_RENDER_BASE_URL = "https://hyvatar.io/render/";
    private static final int PLAYER_AVATAR_SIZE = 64;
    private static final int MAX_PLAYER_AVATAR_BYTES = 512 * 1024;
    private static final long PLAYER_AVATAR_CACHE_TTL_MS = Duration.ofHours(12).toMillis();
    private static final Pattern WORLD_PATTERN = Pattern.compile("\"world\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern CHUNK_OBJECT_PATTERN = Pattern.compile("\\{[^{}]*}");
    private static final Pattern CHUNK_X_PATTERN = Pattern.compile("\"chunkX\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_Z_PATTERN = Pattern.compile("\"chunkZ\"\\s*:\\s*(-?\\d+)");
    private static final Pattern ASSET_PATTERN = Pattern.compile("\"asset\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern MOB_ICON_PATH_PATTERN = Pattern.compile("^/mob-icons/([A-Za-z0-9_.-]+\\.png)$");
    private static final Pattern PLAYER_AVATAR_PATH_PATTERN = Pattern.compile("^/api/player-avatar/([A-Za-z0-9-]{1,64})\\.png$");
    private static final String GENERATED_ICON_ENTRY_PREFIX = "Common/Icons/ModelsGenerated/";
    private static final HttpClient AVATAR_HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    private final SynthWorldviewPlugin plugin;
    private final String host;
    private final int port;
    private final boolean experimentalDetailsEnabled;
    private final NpcRoleIndex npcRoleIndex;
    private final HttpServer server;
    private final ExecutorService staticHttpExecutor = Executors.newFixedThreadPool(STATIC_HTTP_THREADS, runnable -> {
        Thread thread = new Thread(runnable, "SynthWorldview-http-static");
        thread.setDaemon(true);
        return thread;
    });
    private final ExecutorService apiHttpExecutor = Executors.newFixedThreadPool(API_HTTP_THREADS, runnable -> {
        Thread thread = new Thread(runnable, "SynthWorldview-http-api");
        thread.setDaemon(true);
        return thread;
    });
    private final Semaphore generationPermits = new Semaphore(MAX_CONCURRENT_GENERATIONS);
    private final ConcurrentHashMap<String, CompletableFuture<TerrainResult>> pendingTerrain = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<MapRegionResult>> pendingMapRegions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<BufferedImage>> pendingMapTiles = new ConcurrentHashMap<>();
    private final Object memoryCacheLock = new Object();
    private final LinkedHashMap<String, TerrainResult> memoryCache = new LinkedHashMap<>(32, 0.75f, true);
    private final Object mapRegionMemoryCacheLock = new Object();
    private final LinkedHashMap<String, byte[]> mapRegionMemoryCache = new LinkedHashMap<>(16, 0.75f, true);
    private final Object mapTileMemoryCacheLock = new Object();
    private final LinkedHashMap<String, BufferedImage> mapTileMemoryCache = new LinkedHashMap<>(1024, 0.75f, true);
    private long memoryCacheBytes;
    private long mapRegionMemoryCacheBytes;
    private final AtomicInteger activeGenerations = new AtomicInteger();
    private final AtomicLong singleRequests = new AtomicLong();
    private final AtomicLong batchRequests = new AtomicLong();
    private final AtomicLong generatedChunks = new AtomicLong();
    private final AtomicLong memoryCacheHits = new AtomicLong();
    private final AtomicLong diskCacheHits = new AtomicLong();
    private final AtomicLong coalescedRequests = new AtomicLong();
    private final AtomicLong failedGenerations = new AtomicLong();
    private final AtomicLong lastMobDebugLogMillis = new AtomicLong();
    private final ConcurrentHashMap<String, Integer> lastMobSamplePlayerCounts = new ConcurrentHashMap<>();
    private volatile Path assetsZipPath;

    public WorldviewWebServer(@Nonnull SynthWorldviewPlugin plugin, @Nonnull String host, int port,
                              boolean experimentalDetailsEnabled, @Nonnull NpcRoleIndex npcRoleIndex) throws IOException {
        this.plugin = plugin;
        this.host = host;
        this.port = port;
        this.experimentalDetailsEnabled = experimentalDetailsEnabled;
        this.npcRoleIndex = npcRoleIndex;
        this.server = HttpServer.create(new InetSocketAddress(host, port), 0);
        this.server.createContext("/api/worlds", onApi(this::handleWorlds));
        this.server.createContext("/api/players", onApi(this::handlePlayers));
        this.server.createContext("/api/player-avatar", onApi(this::handlePlayerAvatar));
        this.server.createContext("/api/time", onApi(this::handleTime));
        this.server.createContext("/api/mobs", onApi(this::handleMobs));
        this.server.createContext("/api/mob-debug", onApi(this::handleMobDebug));
        this.server.createContext("/api/npc-index", onApi(this::handleNpcIndex));
        this.server.createContext("/api/entities/stream", onApi(this::handleEntityStream));
        this.server.createContext("/api/mapregion", onApi(this::handleMapRegion));
        this.server.createContext("/api/client-log", onApi(this::handleClientLog));
        this.server.createContext("/api/terrain", onApi(this::handleTerrain));
        this.server.createContext("/", onStatic(this::handleStatic));
        this.server.setExecutor(null);
    }

    public void start() {
        server.start();
        plugin.getLogger().at(Level.INFO).log("SynthWorldview listening on http://" + host + ":" + port);
    }

    public void stop() {
        server.stop(0);
        staticHttpExecutor.shutdownNow();
        apiHttpExecutor.shutdownNow();
    }

    private HttpHandler onStatic(@Nonnull HttpHandler handler) {
        return exchange -> staticHttpExecutor.execute(() -> {
            try {
                handler.handle(exchange);
            } catch (IOException error) {
                plugin.getLogger().at(Level.WARNING).withCause(error).log(
                        "Static request failed: " + exchange.getRequestURI().getPath());
            }
        });
    }

    private HttpHandler onApi(@Nonnull HttpHandler handler) {
        return exchange -> apiHttpExecutor.execute(() -> {
            try {
                handler.handle(exchange);
            } catch (IOException error) {
                plugin.getLogger().at(Level.WARNING).withCause(error).log(
                        "API request failed: " + exchange.getRequestURI().getPath());
            }
        });
    }

    public String address() {
        return "http://" + host + ":" + port;
    }

    public Metrics metrics() {
        DiskStats diskStats = scanDiskCache();
        return new Metrics(
                singleRequests.get(),
                batchRequests.get(),
                generatedChunks.get(),
                memoryCacheHits.get(),
                diskCacheHits.get(),
                coalescedRequests.get(),
                failedGenerations.get(),
                activeGenerations.get(),
                pendingTerrain.size(),
                MAX_CONCURRENT_GENERATIONS,
                memoryCacheSize(),
                memoryCacheBytes(),
                MAX_MEMORY_CACHE_ENTRIES,
                MAX_MEMORY_CACHE_BYTES,
                diskStats.files(),
                diskStats.bytes());
    }

    public MemoryCacheStats clearMemoryCache() {
        synchronized (memoryCacheLock) {
            MemoryCacheStats stats = new MemoryCacheStats(memoryCache.size(), memoryCacheBytes);
            memoryCache.clear();
            memoryCacheBytes = 0;
            return stats;
        }
    }

    private void handleWorlds(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        Universe universe = Universe.get();
        String worlds = universe == null ? "" : universe.getWorlds().values().stream()
                .map(World::getName)
                .sorted()
                .map(name -> "{\"name\":\"" + escapeJson(name) + "\"}")
                .collect(Collectors.joining(","));
        writeJson(exchange, 200, "{\"ok\":true,\"features\":{\"experimentalDetails\":" + experimentalDetailsEnabled
                + ",\"terrainFormatVersion\":\"" + FORMAT_VERSION + "\""
                + "},\"worlds\":[" + worlds + "]}");
    }

    private void handleClientLog(@Nonnull HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            addCors(exchange);
            exchange.sendResponseHeaders(204, -1);
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        byte[] body = exchange.getRequestBody().readNBytes(MAX_CLIENT_LOG_BYTES + 1);
        if (body.length > MAX_CLIENT_LOG_BYTES) {
            writeJson(exchange, 413, "{\"ok\":false,\"error\":\"client_log_too_large\"}");
            return;
        }

        String message = new String(body, StandardCharsets.UTF_8)
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replace('\t', ' ')
                .trim();
        if (message.length() > MAX_CLIENT_LOG_BYTES) {
            message = message.substring(0, MAX_CLIENT_LOG_BYTES);
        }
        if (isUnrequestedPerfClientLog(message)) {
            writeJson(exchange, 200, "{\"ok\":true}");
            return;
        }
        if (!message.isBlank()) {
            plugin.getLogger().at(Level.INFO).log("client-log " + message);
        }
        writeJson(exchange, 200, "{\"ok\":true}");
    }

    private boolean isUnrequestedPerfClientLog(String message) {
        if (message.contains("\"perfTelemetry\":true")) {
            return false;
        }
        for (String eventType : PERF_CLIENT_LOG_TYPES) {
            if (message.contains(eventType)) {
                return true;
            }
        }
        return false;
    }

    private void handleNpcIndex(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        writeJson(exchange, 200, "{\"ok\":true"
                + ",\"loaded\":" + npcRoleIndex.isLoaded()
                + ",\"roles\":" + npcRoleIndex.size()
                + "}");
    }

    private void handlePlayers(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String prefix = "/api/players/";
        String path = exchange.getRequestURI().getPath();
        if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/players/{world}\"}");
            return;
        }

        String worldName = decode(path.substring(prefix.length()));
        World world = findWorld(worldName);
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        CompletableFuture<List<PlayerSnapshot>> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                future.complete(snapshotPlayers(world));
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        future.completeOnTimeout(List.of(), 1, TimeUnit.SECONDS);

        try {
            List<PlayerSnapshot> players = future.get(1500, TimeUnit.MILLISECONDS);
            String json = players.stream()
                    .map(PlayerSnapshot::toJson)
                    .collect(Collectors.joining(","));
            writeJson(exchange, 200, "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\",\"players\":[" + json + "]}");
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Player snapshot request failed: " + worldName);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handlePlayerAvatar(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        Matcher matcher = PLAYER_AVATAR_PATH_PATTERN.matcher(exchange.getRequestURI().getPath());
        if (!matcher.matches()) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }

        String uuid = matcher.group(1);
        String username = queryParam(exchange, "name");
        String skinKey = queryParam(exchange, "skin");
        byte[] bytes = readOrFetchPlayerAvatar(uuid, username, skinKey);
        if (bytes == null || bytes.length == 0) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }

        writeCacheableBytes(exchange, 200, bytes, "image/png", "public, max-age=43200");
    }

    private void handleTime(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String prefix = "/api/time/";
        String path = exchange.getRequestURI().getPath();
        if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/time/{world}\"}");
            return;
        }

        String worldName = decode(path.substring(prefix.length()));
        World world = findWorld(worldName);
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        ResourceType<EntityStore, WorldTimeResource> resourceType;
        try {
            resourceType = TimeModule.get().getWorldTimeResourceType();
        } catch (Throwable t) {
            plugin.getLogger().at(Level.WARNING).withCause(t).log("Time module unavailable for world time request.");
            writeJson(exchange, 503, "{\"ok\":false,\"error\":\"time_module_unavailable\"}");
            return;
        }
        if (resourceType == null) {
            writeJson(exchange, 503, "{\"ok\":false,\"error\":\"world_time_resource_type_missing\"}");
            return;
        }

        CompletableFuture<WorldTimeSnapshot> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                Store<EntityStore> store = world.getEntityStore().getStore();
                WorldTimeResource time = store.getResource(resourceType);
                future.complete(time == null ? null : WorldTimeSnapshot.from(time));
            } catch (Throwable t) {
                future.completeExceptionally(t);
            }
        });
        future.completeOnTimeout(null, 1, TimeUnit.SECONDS);

        try {
            WorldTimeSnapshot snapshot = future.get(1500, TimeUnit.MILLISECONDS);
            if (snapshot == null) {
                writeJson(exchange, 503, "{\"ok\":false,\"error\":\"world_time_resource_missing\"}");
                return;
            }
            writeJson(exchange, 200, snapshot.toJson(world.getName()));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("World time request failed: " + worldName);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleMobs(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String prefix = "/api/mobs/";
        String path = exchange.getRequestURI().getPath();
        if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/mobs/{world}\"}");
            return;
        }

        String worldName = decode(path.substring(prefix.length()));
        World world = findWorld(worldName);
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        CompletableFuture<MobFeedSnapshot> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                future.complete(snapshotMobs(world));
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        future.completeOnTimeout(MobFeedSnapshot.empty(), 1, TimeUnit.SECONDS);

        try {
            MobFeedSnapshot snapshot = future.get(1500, TimeUnit.MILLISECONDS);
            writeJson(exchange, 200, snapshot.toJson(world.getName()));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Mob snapshot request failed: " + worldName);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleMobDebug(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String prefix = "/api/mob-debug/";
        String path = exchange.getRequestURI().getPath();
        if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/mob-debug/{world}\"}");
            return;
        }

        String worldName = decode(path.substring(prefix.length()));
        World world = findWorld(worldName);
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        CompletableFuture<String> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                future.complete(mobDebugJson(world));
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        future.completeOnTimeout("{\"ok\":false,\"world\":\"" + escapeJson(world.getName())
                + "\",\"error\":\"mob_debug_timeout\"}", 1, TimeUnit.SECONDS);

        try {
            writeJson(exchange, 200, future.get(1500, TimeUnit.MILLISECONDS));
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Mob debug request failed: " + worldName);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleEntityStream(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        String prefix = "/api/entities/stream/";
        String path = exchange.getRequestURI().getPath();
        if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/entities/stream/{world}\"}");
            return;
        }

        String worldName = decode(path.substring(prefix.length()));
        World world = findWorld(worldName);
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }
        boolean includePlayers = queryFlag(exchange, "players", true);
        boolean includeMobs = queryFlag(exchange, "mobs", true);

        addCors(exchange);
        exchange.getResponseHeaders().set("Content-Type", "text/event-stream; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
        exchange.getResponseHeaders().set("Connection", "keep-alive");
        exchange.sendResponseHeaders(200, 0);

        try (OutputStream output = exchange.getResponseBody()) {
            writeSseEvent(output, "hello", "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\"}");
            while (!Thread.currentThread().isInterrupted()) {
                String json = snapshotEntitiesForStream(world, includePlayers, includeMobs);
                writeSseEvent(output, "entities", json);
                try {
                    Thread.sleep(ENTITY_STREAM_INTERVAL_MS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        } catch (IOException ignored) {
            // Browser navigated away or EventSource reconnected.
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Entity stream failed: " + worldName);
        }
    }

    private void handleMapRegion(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        MapRegionRequest request = parseMapRegionRequest(exchange.getRequestURI().getPath());
        if (request == null) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/mapregion/{world}/{centerX}/{centerZ}/{radius}.png\"}");
            return;
        }

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            long startedNanos = System.nanoTime();
            MapRegionResult result = getMapRegion(world, request);
            byte[] bytes = result.bytes();
            if (bytes.length == 0) {
                writeJson(exchange, 500, "{\"ok\":false,\"error\":\"map_region_empty\"}");
                return;
            }
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
            int chunkCount = request.radius() * 2 + 1;
            exchange.getResponseHeaders().set("X-Worldview-Map-Region-Chunks", Integer.toString(chunkCount));
            exchange.getResponseHeaders().set("X-Worldview-Map-Region-Tile-Size", Integer.toString(MAP_REGION_TILE_SIZE));
            exchange.getResponseHeaders().set("X-Worldview-Map-Region-Millis", Long.toString(elapsedMillis));
            exchange.getResponseHeaders().set("X-Worldview-Map-Region-Cache", result.source());
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.getResponseHeaders().set("Cache-Control", MAP_REGION_CACHE_CONTROL);
            addCors(exchange);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(bytes);
            }
            plugin.getLogger().at(Level.INFO).log("map-region world=" + world.getName()
                    + " center=" + request.centerX() + "," + request.centerZ()
                    + " radius=" + request.radius()
                    + " chunks=" + (chunkCount * chunkCount)
                    + " pixels=" + (chunkCount * MAP_REGION_TILE_SIZE) + "x" + (chunkCount * MAP_REGION_TILE_SIZE)
                    + " bytes=" + bytes.length
                    + " cache=" + result.source()
                    + " ms=" + elapsedMillis);
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Map region request failed: " + request);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleTerrain(@Nonnull HttpExchange exchange) throws IOException {
        if ("/api/terrain/batch".equals(exchange.getRequestURI().getPath())) {
            handleTerrainBatch(exchange);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        TerrainMapTileRequest mapTileRequest = parseTerrainMapTileRequest(exchange.getRequestURI().getPath());
        if (mapTileRequest != null) {
            handleTerrainMapTile(exchange, mapTileRequest);
            return;
        }

        TerrainRequest request = parseTerrainRequest(exchange.getRequestURI().getPath(), experimentalDetailsEnabled);
        if (request == null) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/terrain/{world}/{chunkX}/{chunkZ}.glb_or_.map.png\"}");
            return;
        }

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            singleRequests.incrementAndGet();
            long startedNanos = System.nanoTime();
            TerrainResult result = generateTerrain(world, request);
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);

            exchange.getResponseHeaders().set("Content-Type", "model/gltf-binary");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            addCors(exchange);
            exchange.getResponseHeaders().set("X-Worldview-Columns", Integer.toString(result.columns()));
            exchange.getResponseHeaders().set("X-Worldview-Vertices", Integer.toString(result.vertices()));
            exchange.getResponseHeaders().set("X-Worldview-Triangles", Integer.toString(result.triangles()));
            exchange.getResponseHeaders().set("X-Worldview-Details", Integer.toString(result.details()));
            exchange.getResponseHeaders().set("X-Worldview-Cache", result.source());
            exchange.sendResponseHeaders(200, result.glb().length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(result.glb());
            }
            plugin.getLogger().at(Level.FINE).log("terrain-single world=" + world.getName()
                    + " chunk=" + request.chunkX() + "," + request.chunkZ()
                    + " cache=" + result.source()
                    + " bytes=" + result.glb().length
                    + " columns=" + result.columns()
                    + " vertices=" + result.vertices()
                    + " triangles=" + result.triangles()
                    + " details=" + result.details()
                    + " ms=" + elapsedMillis);
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Terrain request failed: " + request);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleTerrainMapTile(@Nonnull HttpExchange exchange, @Nonnull TerrainMapTileRequest request) throws IOException {
        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            long startedNanos = System.nanoTime();
            MapTileTerrainResult result = generateMapTilePng(world, request);
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            addCors(exchange);
            exchange.getResponseHeaders().set("X-Worldview-Cache", result.source());
            exchange.sendResponseHeaders(200, result.png().length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(result.png());
            }
            plugin.getLogger().at(Level.FINE).log("terrain-map-tile world=" + world.getName()
                    + " chunk=" + request.chunkX() + "," + request.chunkZ()
                    + " cache=" + result.source()
                    + " bytes=" + result.png().length
                    + " ms=" + elapsedMillis);
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Terrain map tile request failed: " + request);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleTerrainMapTileBatch(
            @Nonnull HttpExchange exchange,
            @Nonnull World world,
            @Nonnull BatchTerrainRequest request,
            long startedNanos) throws IOException {
        List<BatchMapTileResult> results = generateMapTileBatch(world, request);
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
        StringBuilder json = new StringBuilder(256 + results.size() * 512);
        json.append("{\"ok\":true,\"asset\":\"map\",\"maxBatchChunks\":").append(MAX_BATCH_CHUNKS).append(",\"chunks\":[");
        for (int i = 0; i < results.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            BatchMapTileResult result = results.get(i);
            json.append("{\"chunkX\":").append(result.chunkX())
                    .append(",\"chunkZ\":").append(result.chunkZ())
                    .append(",\"ok\":").append(result.error() == null);
            if (result.error() == null && result.tile() != null) {
                json.append(",\"cache\":\"").append(result.tile().source()).append("\"")
                        .append(",\"base64\":\"")
                        .append(Base64.getEncoder().encodeToString(result.tile().png()))
                        .append("\"");
            } else {
                json.append(",\"error\":\"").append(escapeJson(result.error())).append("\"");
            }
            json.append('}');
        }
        json.append("]}");
        writeJson(exchange, 200, json.toString());
        plugin.getLogger().at(Level.INFO).log("terrain-map-batch world=" + world.getName()
                + " requested=" + request.chunks().size()
                + " ok=" + results.stream().filter(result -> result.error() == null).count()
                + " ms=" + elapsedMillis);
    }

    private MapTileTerrainResult generateMapTilePng(@Nonnull World world, @Nonnull TerrainMapTileRequest request) throws Exception {
        byte[] diskCached = readTerrainMapTileDiskCache(request);
        if (diskCached != null) {
            return new MapTileTerrainResult(diskCached, "disk");
        }

        WorldMapManager mapManager = world.getWorldMapManager();
        if (mapManager == null || !mapManager.isWorldMapEnabled()) {
            throw new IllegalStateException("world_map_disabled");
        }

        BufferedImage tile = getMapTileImage(mapManager, world.getName(), request.chunkX(), request.chunkZ(), true)
                .get(MAP_REGION_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        if (tile == null) {
            throw new IllegalStateException("map_tile_missing");
        }
        byte[] png = MapTilePngEncoder.encode(tile);
        writeTerrainMapTileDiskCache(request, png);
        return new MapTileTerrainResult(png, "generated");
    }

    private List<BatchMapTileResult> generateMapTileBatch(@Nonnull World world, @Nonnull BatchTerrainRequest request) {
        List<BatchMapTileResult> results = new ArrayList<>(request.chunks().size());
        for (ChunkCoord chunk : request.chunks()) {
            try {
                MapTileTerrainResult tile = generateMapTilePng(
                        world,
                        new TerrainMapTileRequest(request.worldName(), chunk.chunkX(), chunk.chunkZ()));
                results.add(new BatchMapTileResult(chunk.chunkX(), chunk.chunkZ(), tile, null));
            } catch (Exception e) {
                results.add(new BatchMapTileResult(chunk.chunkX(), chunk.chunkZ(), null, e.getMessage()));
            }
        }
        return results;
    }

    private void handleTerrainBatch(@Nonnull HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        BatchTerrainRequest request;
        try {
            request = parseBatchTerrainRequest(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
            return;
        }
        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            batchRequests.incrementAndGet();
            long startedNanos = System.nanoTime();
            if (request.mapAsset()) {
                handleTerrainMapTileBatch(exchange, world, request, startedNanos);
                return;
            }
            List<BatchTerrainResult> results = generateTerrainBatch(world, request);
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
            TerrainBatchSummary summary = summarizeTerrainBatch(results);
            StringBuilder json = new StringBuilder(256 + results.size() * 256);
            json.append("{\"ok\":true,\"asset\":\"mesh\",\"maxBatchChunks\":").append(MAX_BATCH_CHUNKS).append(",\"chunks\":[");
            for (int i = 0; i < results.size(); i++) {
                if (i > 0) {
                    json.append(',');
                }
                BatchTerrainResult result = results.get(i);
                json.append("{\"chunkX\":").append(result.chunkX())
                        .append(",\"chunkZ\":").append(result.chunkZ())
                        .append(",\"ok\":").append(result.error() == null);
                if (result.error() == null && result.terrain() != null) {
                    TerrainResult terrain = result.terrain();

                    json.append(",\"columns\":").append(terrain.columns())
                            .append(",\"vertices\":").append(terrain.vertices())
                            .append(",\"triangles\":").append(terrain.triangles())
                            .append(",\"details\":").append(terrain.details())
                            .append(",\"cache\":\"").append(terrain.source()).append("\"")
                            .append(",\"base64\":\"")
                            .append(Base64.getEncoder().encodeToString(terrain.glb()))
                            .append("\"");
                } else {
                    json.append(",\"error\":\"").append(escapeJson(result.error())).append("\"");
                }
                json.append('}');
            }
            json.append("]}");
            writeJson(exchange, 200, json.toString());
            plugin.getLogger().at(Level.INFO).log("terrain-batch world=" + world.getName()
                    + " requested=" + request.chunks().size()
                    + " ok=" + summary.ok()
                    + " errors=" + summary.errors()
                    + " generated=" + summary.generated()
                    + " disk=" + summary.disk()
                    + " memory=" + summary.memory()
                    + " bytes=" + summary.bytes()
                    + " columns=" + summary.columns()
                    + " vertices=" + summary.vertices()
                    + " triangles=" + summary.triangles()
                    + " details=" + summary.details()
                    + " ms=" + elapsedMillis);
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Batch terrain request failed.");
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private TerrainResult generateTerrain(@Nonnull World world, @Nonnull TerrainRequest request) throws Exception {
        String key = request.key();
        TerrainResult memoryCached = readMemoryCache(key);
        if (memoryCached != null) {
            memoryCacheHits.incrementAndGet();
            return memoryCached.withSource("memory");
        }

        TerrainResult diskCached = readDiskCache(request);
        if (diskCached != null) {
            diskCacheHits.incrementAndGet();
            putMemoryCache(key, diskCached);
            return diskCached.withSource("disk");
        }

        CompletableFuture<TerrainResult> future = new CompletableFuture<>();
        CompletableFuture<TerrainResult> existing = pendingTerrain.putIfAbsent(key, future);
        if (existing != null) {
            coalescedRequests.incrementAndGet();
            return existing.get(TERRAIN_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        }

        try {
            generationPermits.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            pendingTerrain.remove(key, future);
            future.completeExceptionally(e);
            throw e;
        }

        activeGenerations.incrementAndGet();
        world.execute(() -> {
            try {
                TerrainSnapshot snapshot = TerrainSampler.sample(world, request.chunkX(), request.chunkZ());
                CompletableFuture.runAsync(() -> {
                    try {
                        TerrainMesh mesh = TerrainMesher.mesh(snapshot, request.includeDetails());
                        generatedChunks.incrementAndGet();
                        future.complete(TerrainResult.generated(snapshot, mesh, GltfWriter.writeGlb(mesh)));
                    } catch (Exception e) {
                        failedGenerations.incrementAndGet();
                        future.completeExceptionally(e);
                    } finally {
                        activeGenerations.decrementAndGet();
                        pendingTerrain.remove(key, future);
                        generationPermits.release();
                    }
                });
            } catch (Exception e) {
                failedGenerations.incrementAndGet();
                future.completeExceptionally(e);
                activeGenerations.decrementAndGet();
                pendingTerrain.remove(key, future);
                generationPermits.release();
            }
        });
        TerrainResult result = future.get(TERRAIN_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        putMemoryCache(key, result);
        writeDiskCache(request, result);
        return result;
    }

    private List<BatchTerrainResult> generateTerrainBatch(@Nonnull World world, @Nonnull BatchTerrainRequest request) throws Exception {
        List<BatchTerrainResult> results = new ArrayList<>(request.chunks().size());
        long deadline = System.nanoTime() + BATCH_TERRAIN_TIMEOUT.toNanos();
        for (ChunkCoord chunk : request.chunks()) {
            long remainingMillis = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
            if (remainingMillis <= 0) {
                results.add(new BatchTerrainResult(chunk.chunkX(), chunk.chunkZ(), null, "batch_timeout"));
                continue;
            }

            try {
                TerrainRequest terrainRequest = new TerrainRequest(
                        request.worldName(),
                        chunk.chunkX(),
                        chunk.chunkZ(),
                        experimentalDetailsEnabled);
                results.add(new BatchTerrainResult(
                        chunk.chunkX(),
                        chunk.chunkZ(),
                        generateTerrain(world, terrainRequest),
                        null));
            } catch (Exception e) {
                results.add(new BatchTerrainResult(chunk.chunkX(), chunk.chunkZ(), null, e.getMessage()));
            }
        }
        return results;
    }

    private MapRegionResult getMapRegion(@Nonnull World world, @Nonnull MapRegionRequest request) throws Exception {
        String key = request.key();
        byte[] memoryCached = readMapRegionMemoryCache(key);
        if (memoryCached != null) {
            return new MapRegionResult(memoryCached, "memory");
        }

        byte[] diskCached = readMapRegionDiskCache(request);
        if (diskCached != null) {
            putMapRegionMemoryCache(key, diskCached);
            return new MapRegionResult(diskCached, "disk");
        }

        CompletableFuture<MapRegionResult> future = new CompletableFuture<>();
        CompletableFuture<MapRegionResult> existing = pendingMapRegions.putIfAbsent(key, future);
        if (existing != null) {
            return existing.get(MAP_REGION_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS).withSource("pending");
        }

        try {
            MapRegionGeneration generated = generateMapRegion(world, request)
                    .get(MAP_REGION_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            byte[] bytes = generated.bytes();
            if (bytes.length > 0 && generated.complete()) {
                putMapRegionMemoryCache(key, bytes);
                writeMapRegionDiskCache(request, bytes);
            }
            MapRegionResult result = new MapRegionResult(bytes, generated.complete() ? "generated" : "generated-partial");
            future.complete(result);
            return result;
        } catch (Exception e) {
            future.completeExceptionally(e);
            throw e;
        } finally {
            pendingMapRegions.remove(key, future);
        }
    }

    private CompletableFuture<MapRegionGeneration> generateMapRegion(@Nonnull World world, @Nonnull MapRegionRequest request) {
        WorldMapManager mapManager = world.getWorldMapManager();
        if (mapManager == null || !mapManager.isWorldMapEnabled()) {
            return CompletableFuture.completedFuture(new MapRegionGeneration(new byte[0], true));
        }

        int chunkCount = request.radius() * 2 + 1;
        int outputSize = chunkCount * MAP_REGION_TILE_SIZE;
        BufferedImage composite = new BufferedImage(outputSize, outputSize, BufferedImage.TYPE_INT_ARGB);
        List<CompletableFuture<Void>> futures = new ArrayList<>(chunkCount * chunkCount);
        int minChunkX = request.centerX() - request.radius();
        int minChunkZ = request.centerZ() - request.radius();
        AtomicInteger missingCacheOnlyTiles = new AtomicInteger();

        for (int dz = 0; dz < chunkCount; dz++) {
            for (int dx = 0; dx < chunkCount; dx++) {
                int chunkX = minChunkX + dx;
                int chunkZ = minChunkZ + dz;
                int outputX = dx * MAP_REGION_TILE_SIZE;
                int outputY = dz * MAP_REGION_TILE_SIZE;
                boolean allowGenerate = Math.max(
                        Math.abs(chunkX - request.centerX()),
                        Math.abs(chunkZ - request.centerZ())) <= MAP_REGION_GENERATE_RADIUS;
                futures.add(getMapTileImage(mapManager, world.getName(), chunkX, chunkZ, allowGenerate)
                        .thenAccept(tile -> {
                            if (tile == null) {
                                missingCacheOnlyTiles.incrementAndGet();
                                return;
                            }
                            drawCachedMapRegionTile(composite, tile, outputX, outputY);
                        }));
            }
        }

        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                .thenApply(ignored -> new MapRegionGeneration(
                        MapTilePngEncoder.encode(composite),
                        missingCacheOnlyTiles.get() == 0))
                .exceptionally(e -> {
                    plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to generate map region " + request);
                    return new MapRegionGeneration(new byte[0], false);
                });
    }

    private static void drawMapRegionTile(@Nonnull BufferedImage composite, @Nullable MapImage mapImage,
                                          int outputX, int outputY) {
        if (mapImage == null || mapImage.palette == null || mapImage.packedIndices == null
                || mapImage.width <= 0 || mapImage.height <= 0) {
            return;
        }
        synchronized (composite) {
            MapTilePngEncoder.drawMapImage(composite, mapImage, outputX, outputY, MAP_REGION_TILE_SIZE);
        }
    }

    private static void drawCachedMapRegionTile(@Nonnull BufferedImage composite, @Nullable BufferedImage tile,
                                                int outputX, int outputY) {
        if (tile == null) {
            return;
        }
        synchronized (composite) {
            Graphics2D graphics = composite.createGraphics();
            try {
                graphics.drawImage(tile, outputX, outputY, MAP_REGION_TILE_SIZE, MAP_REGION_TILE_SIZE, null);
            } finally {
                graphics.dispose();
            }
        }
    }

    private static TerrainBatchSummary summarizeTerrainBatch(@Nonnull List<BatchTerrainResult> results) {
        int ok = 0;
        int errors = 0;
        int generated = 0;
        int disk = 0;
        int memory = 0;
        long bytes = 0;
        long columns = 0;
        long vertices = 0;
        long triangles = 0;
        long details = 0;

        for (BatchTerrainResult result : results) {
            TerrainResult terrain = result.terrain();
            if (terrain == null || result.error() != null) {
                errors++;
                continue;
            }
            ok++;
            bytes += terrain.glb().length;
            columns += terrain.columns();
            vertices += terrain.vertices();
            triangles += terrain.triangles();
            details += terrain.details();
            switch (terrain.source()) {
                case "generated" -> generated++;
                case "disk" -> disk++;
                case "memory" -> memory++;
                default -> {
                }
            }
        }
        return new TerrainBatchSummary(ok, errors, generated, disk, memory, bytes, columns, vertices, triangles, details);
    }

    private void handleStatic(@Nonnull HttpExchange exchange) {
        try {
            serveStatic(exchange);
        } catch (Exception error) {
            plugin.getLogger().at(Level.WARNING).withCause(error).log(
                    "Static request failed: " + exchange.getRequestURI().getPath());
            try {
                if (exchange.getResponseCode() <= 0) {
                    writeText(exchange, 500, "internal error", "text/plain; charset=utf-8");
                }
            } catch (IOException ignored) {
            }
        }
    }

    private void serveStatic(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeText(exchange, 405, "method not allowed", "text/plain; charset=utf-8");
            return;
        }

        String requestPath = exchange.getRequestURI().getPath();
        if (tryHandleMobIcon(exchange, requestPath)) {
            return;
        }

        String resourcePath = switch (requestPath) {
            case "/", "/index.html" -> "/web/index.html";
            case "/dist/worldview.js" -> "/web/dist/worldview.js";
            case "/styles.css" -> "/web/styles.css";
            case "/textures/waternormals.jpg" -> "/web/textures/waternormals.jpg";
            default -> moduleResourcePath(requestPath);
        };

        if (resourcePath == null) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }

        try (InputStream input = WorldviewWebServer.class.getResourceAsStream(resourcePath)) {
            if (input == null) {
                writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
                return;
            }
            byte[] bytes = input.readAllBytes();
            writeBytes(exchange, 200, bytes, contentType(resourcePath));
        }
    }

    private Path terrainOutputPath(@Nonnull TerrainRequest request) {
        String safeWorld = safeName(request.worldName());
        return plugin.worldviewDir()
                .resolve("terrain")
                .resolve(FORMAT_VERSION)
                .resolve(safeWorld)
                .resolve(request.includeDetails() ? "surface-details" : "surface")
                .resolve(request.chunkX() + "_" + request.chunkZ() + ".glb");
    }

    private Path terrainMetadataPath(@Nonnull TerrainRequest request) {
        return Path.of(terrainOutputPath(request).toString() + ".json");
    }

    private TerrainResult readMemoryCache(@Nonnull String key) {
        synchronized (memoryCacheLock) {
            return memoryCache.get(key);
        }
    }

    private void putMemoryCache(@Nonnull String key, @Nonnull TerrainResult result) {
        synchronized (memoryCacheLock) {
            TerrainResult previous = memoryCache.put(key, result.withSource("memory"));
            if (previous != null) {
                memoryCacheBytes -= previous.glb().length;
            }
            memoryCacheBytes += result.glb().length;
            evictMemoryCache();
        }
    }

    private void evictMemoryCache() {
        while ((memoryCache.size() > MAX_MEMORY_CACHE_ENTRIES || memoryCacheBytes > MAX_MEMORY_CACHE_BYTES)
                && !memoryCache.isEmpty()) {
            Map.Entry<String, TerrainResult> eldest = memoryCache.entrySet().iterator().next();
            memoryCacheBytes -= eldest.getValue().glb().length;
            memoryCache.remove(eldest.getKey());
        }
    }

    private int memoryCacheSize() {
        synchronized (memoryCacheLock) {
            return memoryCache.size();
        }
    }

    private long memoryCacheBytes() {
        synchronized (memoryCacheLock) {
            return memoryCacheBytes;
        }
    }

    private TerrainResult readDiskCache(@Nonnull TerrainRequest request) {
        Path glbPath = terrainOutputPath(request);
        Path metadataPath = terrainMetadataPath(request);
        if (!Files.isRegularFile(glbPath) || !Files.isRegularFile(metadataPath)) {
            return null;
        }

        try {
            byte[] glb = Files.readAllBytes(glbPath);
            TerrainMetadata metadata = TerrainMetadata.parse(Files.readString(metadataPath));
            return new TerrainResult(glb, metadata.columns(), metadata.vertices(), metadata.triangles(), metadata.details(), "disk");
        } catch (Exception e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid terrain cache entry " + glbPath + ": " + e.getMessage());
            return null;
        }
    }

    private void writeDiskCache(@Nonnull TerrainRequest request, @Nonnull TerrainResult result) {
        Path glbPath = terrainOutputPath(request);
        Path metadataPath = terrainMetadataPath(request);
        try {
            Files.createDirectories(glbPath.getParent());
            Files.write(glbPath, result.glb());
            Files.writeString(metadataPath, result.metadataJson());
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write terrain cache entry " + glbPath);
        }
    }

    private Path mapRegionOutputPath(@Nonnull MapRegionRequest request) {
        return plugin.worldviewDir()
                .resolve("map-region")
                .resolve("tile-" + MAP_REGION_TILE_SIZE)
                .resolve(safeName(request.worldName()))
                .resolve("r" + request.radius())
                .resolve(request.centerX() + "_" + request.centerZ() + ".png");
    }

    @Nullable
    private byte[] readMapRegionMemoryCache(@Nonnull String key) {
        synchronized (mapRegionMemoryCacheLock) {
            return mapRegionMemoryCache.get(key);
        }
    }

    private void putMapRegionMemoryCache(@Nonnull String key, byte[] bytes) {
        synchronized (mapRegionMemoryCacheLock) {
            byte[] previous = mapRegionMemoryCache.put(key, bytes);
            if (previous != null) {
                mapRegionMemoryCacheBytes -= previous.length;
            }
            mapRegionMemoryCacheBytes += bytes.length;
            evictMapRegionMemoryCache();
        }
    }

    private void evictMapRegionMemoryCache() {
        while ((mapRegionMemoryCache.size() > MAX_MAP_REGION_MEMORY_CACHE_ENTRIES
                || mapRegionMemoryCacheBytes > MAX_MAP_REGION_MEMORY_CACHE_BYTES)
                && !mapRegionMemoryCache.isEmpty()) {
            Map.Entry<String, byte[]> eldest = mapRegionMemoryCache.entrySet().iterator().next();
            mapRegionMemoryCacheBytes -= eldest.getValue().length;
            mapRegionMemoryCache.remove(eldest.getKey());
        }
    }

    @Nullable
    private byte[] readMapRegionDiskCache(@Nonnull MapRegionRequest request) {
        Path path = mapRegionOutputPath(request);
        if (!Files.isRegularFile(path)) {
            return null;
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid map-region cache entry " + path + ": " + e.getMessage());
            return null;
        }
    }

    private void writeMapRegionDiskCache(@Nonnull MapRegionRequest request, byte[] bytes) {
        Path path = mapRegionOutputPath(request);
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, bytes);
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write map-region cache entry " + path);
        }
    }

    private CompletableFuture<BufferedImage> getMapTileImage(
            @Nonnull WorldMapManager mapManager,
            @Nonnull String worldName,
            int chunkX,
            int chunkZ,
            boolean allowGenerate) {
        String key = mapTileKey(worldName, chunkX, chunkZ);
        BufferedImage memoryCached = readMapTileMemoryCache(key);
        if (memoryCached != null) {
            return CompletableFuture.completedFuture(memoryCached);
        }

        BufferedImage diskCached = readMapTileDiskCache(worldName, chunkX, chunkZ);
        if (diskCached != null) {
            putMapTileMemoryCache(key, diskCached);
            return CompletableFuture.completedFuture(diskCached);
        }

        if (!allowGenerate) {
            return CompletableFuture.completedFuture(null);
        }

        CompletableFuture<BufferedImage> future = new CompletableFuture<>();
        CompletableFuture<BufferedImage> existing = pendingMapTiles.putIfAbsent(key, future);
        if (existing != null) {
            return existing;
        }

        mapManager.getImageAsync(chunkX, chunkZ)
                .whenComplete((mapImage, error) -> {
                    try {
                        if (error != null) {
                            future.completeExceptionally(error);
                            return;
                        }
                        BufferedImage tile = new BufferedImage(
                                MAP_REGION_TILE_SIZE,
                                MAP_REGION_TILE_SIZE,
                                BufferedImage.TYPE_INT_RGB);
                        drawMapRegionTile(tile, mapImage, 0, 0);
                        putMapTileMemoryCache(key, tile);
                        writeMapTileDiskCache(worldName, chunkX, chunkZ, tile);
                        future.complete(tile);
                    } catch (Exception e) {
                        future.completeExceptionally(e);
                    } finally {
                        pendingMapTiles.remove(key, future);
                    }
                });
        return future;
    }

    private static String mapTileKey(@Nonnull String worldName, int chunkX, int chunkZ) {
        return worldName + ":" + MAP_REGION_TILE_SIZE + ":" + chunkX + ":" + chunkZ;
    }

    @Nullable
    private BufferedImage readMapTileMemoryCache(@Nonnull String key) {
        synchronized (mapTileMemoryCacheLock) {
            return mapTileMemoryCache.get(key);
        }
    }

    private void putMapTileMemoryCache(@Nonnull String key, @Nonnull BufferedImage tile) {
        synchronized (mapTileMemoryCacheLock) {
            mapTileMemoryCache.put(key, tile);
            while (mapTileMemoryCache.size() > MAX_MAP_TILE_MEMORY_CACHE_ENTRIES && !mapTileMemoryCache.isEmpty()) {
                String eldest = mapTileMemoryCache.keySet().iterator().next();
                mapTileMemoryCache.remove(eldest);
            }
        }
    }

    private Path terrainMapTilePath(@Nonnull String worldName, int chunkX, int chunkZ) {
        return plugin.worldviewDir()
                .resolve("terrain")
                .resolve(FORMAT_VERSION)
                .resolve(safeName(worldName))
                .resolve("map")
                .resolve(chunkX + "_" + chunkZ + ".png");
    }

    private Path legacyMapTileOutputPath(@Nonnull String worldName, int chunkX, int chunkZ) {
        return plugin.worldviewDir()
                .resolve("map-tile")
                .resolve("tile-" + MAP_REGION_TILE_SIZE)
                .resolve(safeName(worldName))
                .resolve(chunkX + "_" + chunkZ + ".png");
    }

    private Path mapTileOutputPath(@Nonnull String worldName, int chunkX, int chunkZ) {
        return terrainMapTilePath(worldName, chunkX, chunkZ);
    }

    @Nullable
    private byte[] readTerrainMapTileDiskCache(@Nonnull TerrainMapTileRequest request) {
        for (Path path : List.of(
                terrainMapTilePath(request.worldName(), request.chunkX(), request.chunkZ()),
                legacyMapTileOutputPath(request.worldName(), request.chunkX(), request.chunkZ()))) {
            if (!Files.isRegularFile(path)) {
                continue;
            }
            try {
                return Files.readAllBytes(path);
            } catch (IOException e) {
                plugin.getLogger().at(Level.FINE).log("Ignoring invalid terrain map-tile cache entry " + path + ": " + e.getMessage());
            }
        }
        return null;
    }

    private void writeTerrainMapTileDiskCache(@Nonnull TerrainMapTileRequest request, byte[] png) {
        Path path = terrainMapTilePath(request.worldName(), request.chunkX(), request.chunkZ());
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, png);
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write terrain map-tile cache entry " + path);
        }
    }

    @Nullable
    private BufferedImage readMapTileDiskCache(@Nonnull String worldName, int chunkX, int chunkZ) {
        Path path = terrainMapTilePath(worldName, chunkX, chunkZ);
        if (!Files.isRegularFile(path)) {
            path = legacyMapTileOutputPath(worldName, chunkX, chunkZ);
        }
        if (!Files.isRegularFile(path)) {
            return null;
        }
        try {
            return ImageIO.read(path.toFile());
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Ignoring invalid map-tile cache entry " + path + ": " + e.getMessage());
            return null;
        }
    }

    private void writeMapTileDiskCache(@Nonnull String worldName, int chunkX, int chunkZ, @Nonnull BufferedImage tile) {
        Path path = mapTileOutputPath(worldName, chunkX, chunkZ);
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, MapTilePngEncoder.encode(tile));
        } catch (IOException e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to write map-tile cache entry " + path);
        }
    }

    private DiskStats scanDiskCache() {
        Path root = plugin.worldviewDir().resolve("terrain").toAbsolutePath().normalize();
        if (!Files.exists(root)) {
            return DiskStats.empty();
        }

        long files = 0;
        long bytes = 0;
        try (var paths = Files.walk(root)) {
            for (Path path : paths.toList()) {
                if (Files.isRegularFile(path) && path.getFileName().toString().endsWith(".glb")) {
                    files++;
                    bytes += Files.size(path);
                }
            }
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).log("Failed to scan terrain disk cache: " + e.getMessage());
        }
        return new DiskStats(files, bytes);
    }

    private static String moduleResourcePath(@Nonnull String requestPath) {
        if ("/npc-details.json".equals(requestPath)) {
            return "/web/npc-details.json";
        }
        if (requestPath.matches("/mob-icons/[A-Za-z0-9_.-]+\\.png")) {
            return "/web" + requestPath;
        }
        return null;
    }

    private static TerrainMapTileRequest parseTerrainMapTileRequest(@Nonnull String path) {
        String prefix = "/api/terrain/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String[] parts = path.substring(prefix.length()).split("/");
        if (parts.length != 3 || !parts[2].endsWith(".map.png")) {
            return null;
        }
        Integer chunkX = parseInt(parts[1]);
        Integer chunkZ = parseInt(parts[2].substring(0, parts[2].length() - ".map.png".length()));
        if (chunkX == null || chunkZ == null) {
            return null;
        }
        return new TerrainMapTileRequest(decode(parts[0]), chunkX, chunkZ);
    }

    private static TerrainRequest parseTerrainRequest(@Nonnull String path, boolean includeDetails) {
        String prefix = "/api/terrain/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String[] parts = path.substring(prefix.length()).split("/");
        if (parts.length != 3 || !parts[2].endsWith(".glb")) {
            return null;
        }
        Integer chunkX = parseInt(parts[1]);
        Integer chunkZ = parseInt(parts[2].substring(0, parts[2].length() - 4));
        if (chunkX == null || chunkZ == null) {
            return null;
        }
        return new TerrainRequest(decode(parts[0]), chunkX, chunkZ, includeDetails);
    }

    private static MapRegionRequest parseMapRegionRequest(@Nonnull String path) {
        String prefix = "/api/mapregion/";
        if (!path.startsWith(prefix) || !path.endsWith(".png")) {
            return null;
        }
        String[] parts = path.substring(prefix.length(), path.length() - ".png".length()).split("/");
        if (parts.length != 4) {
            return null;
        }
        Integer centerX = parseInt(parts[1]);
        Integer centerZ = parseInt(parts[2]);
        Integer radius = parseInt(parts[3]);
        if (centerX == null || centerZ == null || radius == null) {
            return null;
        }
        return new MapRegionRequest(
                decode(parts[0]),
                centerX,
                centerZ,
                Math.max(0, Math.min(MAX_MAP_REGION_RADIUS, radius)));
    }

    private static BatchTerrainRequest parseBatchTerrainRequest(@Nonnull String body) {
        String worldName = findString(WORLD_PATTERN, body, "world");
        List<ChunkCoord> chunks = new ArrayList<>();
        Matcher matcher = CHUNK_OBJECT_PATTERN.matcher(body);
        while (matcher.find()) {
            String object = matcher.group();
            if (!CHUNK_X_PATTERN.matcher(object).find() || !CHUNK_Z_PATTERN.matcher(object).find()) {
                continue;
            }
            if (chunks.size() >= MAX_BATCH_CHUNKS) {
                throw new IllegalArgumentException("batch_too_large_max_" + MAX_BATCH_CHUNKS);
            }
            chunks.add(new ChunkCoord(
                    findInt(CHUNK_X_PATTERN, object, "chunkX"),
                    findInt(CHUNK_Z_PATTERN, object, "chunkZ")));
        }
        if (chunks.isEmpty()) {
            throw new IllegalArgumentException("chunks_required");
        }
        String asset = findString(ASSET_PATTERN, body, "asset");
        if (asset == null || asset.isBlank()) {
            throw new IllegalArgumentException("asset_required");
        }
        if (!"mesh".equalsIgnoreCase(asset) && !"map".equalsIgnoreCase(asset)) {
            throw new IllegalArgumentException("asset_must_be_mesh_or_map");
        }
        return new BatchTerrainRequest(worldName, chunks, asset);
    }

    private static World findWorld(@Nonnull String worldName) {
        Universe universe = Universe.get();
        if (universe == null) {
            return null;
        }
        return universe.getWorlds().values().stream()
                .filter(world -> world.getName().equals(worldName))
                .min(Comparator.comparing(World::getName))
                .orElse(null);
    }

    private static List<PlayerSnapshot> snapshotPlayers(@Nonnull World world) {
        List<PlayerSnapshot> players = new ArrayList<>();
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Transform transform = playerRef.getTransform();
                if (transform == null) {
                    continue;
                }
                Vector3d position = transform.getPosition();
                Rotation3f transformRotation = transform.getRotation();
                PlayerLookTracker tracker = SynthWorldviewPlugin.get() == null
                        ? null
                        : SynthWorldviewPlugin.get().playerLookTracker();
                PlayerLookTracker.Snapshot look = tracker == null
                        ? null
                        : tracker.snapshot(playerRef, transformRotation);
                Rotation3f rotation = look == null ? transformRotation : look.rotation();
                PlayerSkinSnapshot skin = PlayerSkinSnapshot.from(playerRef);
                players.add(new PlayerSnapshot(
                        playerRef.getUuid().toString(),
                        playerRef.getUsername(),
                        position.x,
                        position.y,
                        position.z,
                        rotation == null ? 0.0f : rotation.yaw(),
                        rotation == null ? 0.0f : rotation.pitch(),
                        skin));
            } catch (Exception ignored) {
                // Player may disconnect while the world-thread snapshot is being copied.
            }
        }
        return players;
    }

    @Nullable
    private byte[] readOrFetchPlayerAvatar(@Nonnull String uuid, @Nullable String username, @Nullable String skinKey) {
        String cacheToken = safeName(uuid) + (skinKey == null || skinKey.isBlank() ? "" : "-" + safeName(skinKey));
        Path cachePath = plugin.worldviewDir()
                .resolve("player-avatars")
                .resolve(cacheToken + ".png");
        try {
            if (Files.isRegularFile(cachePath)) {
                long ageMs = System.currentTimeMillis() - Files.getLastModifiedTime(cachePath).toMillis();
                if (ageMs <= PLAYER_AVATAR_CACHE_TTL_MS) {
                    return Files.readAllBytes(cachePath);
                }
            }
        } catch (IOException ignored) {
        }

        if (username == null || username.isBlank()) {
            return null;
        }

        byte[] bytes = fetchPlayerAvatar(username);
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        try {
            Files.createDirectories(cachePath.getParent());
            Files.write(cachePath, bytes);
            plugin.getLogger().at(Level.INFO).log("Cached player avatar from Hyvatar: " + username + " (" + uuid + ")");
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).withCause(e).log("Unable to cache player avatar: " + username);
        }
        return bytes;
    }

    @Nullable
    private byte[] fetchPlayerAvatar(@Nonnull String username) {
        String encodedName = URLEncoder.encode(username, StandardCharsets.UTF_8);
        URI uri = URI.create(PLAYER_AVATAR_RENDER_BASE_URL + encodedName + "?size=" + PLAYER_AVATAR_SIZE);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = AVATAR_HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] body = response.body();
            if (response.statusCode() != 200 || body == null || body.length == 0 || body.length > MAX_PLAYER_AVATAR_BYTES) {
                plugin.getLogger().at(Level.FINE).log("Player avatar fetch failed for " + username
                        + ": status=" + response.statusCode()
                        + " bytes=" + (body == null ? 0 : body.length));
                return null;
            }
            return body;
        } catch (Exception e) {
            plugin.getLogger().at(Level.FINE).withCause(e).log("Player avatar fetch failed for " + username);
            return null;
        }
    }

    private MobFeedSnapshot snapshotMobs(@Nonnull World world) {
        Store<EntityStore> store = world.getEntityStore().getStore();
        Query<EntityStore> npcQuery = Archetype.of(NPCEntity.getComponentType());
        Query<EntityStore> legacyLivingQuery = Query.and(
                AllLegacyLivingEntityTypesQuery.INSTANCE,
                Archetype.of(TransformComponent.getComponentType()));
        Query<EntityStore> legacyEntityQuery = Query.and(
                AllLegacyEntityTypesQuery.INSTANCE,
                Archetype.of(TransformComponent.getComponentType()));
        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<Vector3d> playerPositions = playerPositionsForMobRadar(world);
        List<MobCandidate> candidates = new ArrayList<>();
        MobScanStats stats = new MobScanStats();
        initializeMobScanCounts(store, stats);
        Set<Integer> seenRefs = new HashSet<>();
        if (!playerPositions.isEmpty()) {
            collectMobSnapshotVisibleViewers(world, store, candidates, stats, seenRefs, playerPositions, npcRoleIndex);
            collectMobSnapshotSpatial(store, EntityModule.get().getNetworkSendableSpatialResourceType(),
                    candidates, stats, seenRefs, playerPositions, "NetworkSendableSpatial", npcRoleIndex);
            collectMobSnapshotSpatial(store, NPCPlugin.get().getNpcSpatialResource(),
                    candidates, stats, seenRefs, playerPositions, "NPCSpatial", npcRoleIndex);
            collectMobSnapshotSpatial(store, EntityModule.get().getEntitySpatialResourceType(),
                    candidates, stats, seenRefs, playerPositions, "EntitySpatial", npcRoleIndex);
            collectMobSnapshotPass(store, npcQuery, candidates, stats, seenRefs, playerPositions, "NPCEntity", npcRoleIndex);
            collectMobSnapshotPass(store, legacyLivingQuery, candidates, stats, seenRefs, playerPositions, "LegacyLivingEntity", npcRoleIndex);
            collectMobSnapshotPass(store, legacyEntityQuery, candidates, stats, seenRefs, playerPositions, "LegacyEntity", npcRoleIndex);
            collectMobSnapshotPass(store, transformQuery, candidates, stats, seenRefs, playerPositions, "TransformFallback", npcRoleIndex);
        }
        List<MobSnapshot> mobs = candidates.stream()
                .sorted(Comparator.comparingDouble(MobCandidate::distanceSq))
                .limit(MAX_MOB_SNAPSHOTS)
                .map(MobCandidate::snapshot)
                .toList();
        logMobScan(world, store, stats, mobs);
        logMobConnectSampleIfNeeded(world, playerPositions.size(), stats, mobs);
        return new MobFeedSnapshot(mobs, stats, playerPositions.size(), MOB_RADAR_RADIUS);
    }

    private String snapshotEntitiesForStream(@Nonnull World world, boolean includePlayers, boolean includeMobs) {
        CompletableFuture<String> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                List<PlayerSnapshot> players = includePlayers ? snapshotPlayers(world) : List.of();
                MobFeedSnapshot mobFeed = includeMobs ? snapshotMobs(world) : MobFeedSnapshot.empty();
                future.complete(entityFeedJson(world, players, mobFeed));
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        future.completeOnTimeout("{\"ok\":false,\"world\":\"" + escapeJson(world.getName())
                + "\",\"error\":\"entity_stream_timeout\"}", 1, TimeUnit.SECONDS);
        try {
            return future.get(1500, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Entity stream snapshot failed: " + world.getName());
            return "{\"ok\":false,\"world\":\"" + escapeJson(world.getName())
                    + "\",\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
        }
    }

    private boolean tryHandleMobIcon(@Nonnull HttpExchange exchange, @Nonnull String requestPath) throws IOException {
        Matcher matcher = MOB_ICON_PATH_PATTERN.matcher(requestPath);
        if (!matcher.matches()) {
            return false;
        }

        String fileName = matcher.group(1);
        byte[] bytes = readOrCacheGeneratedMobIcon(fileName);
        if (bytes != null) {
            writeBytes(exchange, 200, bytes, "image/png");
            return true;
        }

        String resourcePath = "/web/mob-icons/" + fileName;
        try (InputStream input = WorldviewWebServer.class.getResourceAsStream(resourcePath)) {
            if (input != null) {
                writeBytes(exchange, 200, input.readAllBytes(), "image/png");
                return true;
            }
        }

        writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
        return true;
    }

    @Nullable
    private byte[] readOrCacheGeneratedMobIcon(@Nonnull String fileName) {
        Path cachePath = plugin.worldviewDir().resolve("mob-icons").resolve(fileName);
        try {
            if (Files.isRegularFile(cachePath)) {
                return Files.readAllBytes(cachePath);
            }
        } catch (IOException ignored) {
        }

        byte[] bytes = readGeneratedMobIcon(fileName);
        if (bytes == null) {
            return null;
        }
        try {
            Files.createDirectories(cachePath.getParent());
            Files.write(cachePath, bytes);
            plugin.getLogger().at(Level.INFO).log("Cached mob icon from Hytale assets: " + fileName);
        } catch (IOException e) {
            plugin.getLogger().at(Level.FINE).withCause(e).log("Unable to cache mob icon: " + fileName);
        }
        return bytes;
    }

    @Nullable
    private byte[] readGeneratedMobIcon(@Nonnull String fileName) {
        Path looseIcon = resolveLooseGeneratedIcon(fileName);
        if (looseIcon != null) {
            try {
                return Files.readAllBytes(looseIcon);
            } catch (IOException ignored) {
            }
        }

        Path zipPath = resolveAssetsZipPath();
        if (zipPath == null) {
            return null;
        }
        String entryName = GENERATED_ICON_ENTRY_PREFIX + fileName;
        try (ZipFile zipFile = new ZipFile(zipPath.toFile())) {
            ZipEntry entry = zipFile.getEntry(entryName);
            if (entry == null || entry.isDirectory()) {
                return null;
            }
            try (InputStream input = zipFile.getInputStream(entry)) {
                return input.readAllBytes();
            }
        } catch (IOException ignored) {
            return null;
        }
    }

    @Nullable
    private Path resolveLooseGeneratedIcon(@Nonnull String fileName) {
        for (Path root : assetSearchRoots()) {
            Path candidate = root.resolve("_Assets").resolve("Common").resolve("Icons").resolve("ModelsGenerated").resolve(fileName);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
            candidate = root.resolve("Common").resolve("Icons").resolve("ModelsGenerated").resolve(fileName);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }

    @Nullable
    private Path resolveAssetsZipPath() {
        Path cached = assetsZipPath;
        if (cached != null && Files.isRegularFile(cached)) {
            return cached;
        }

        String explicit = firstNonBlank(
                System.getProperty("hytale.assets_zip"),
                System.getenv("HYTALE_ASSETS_ZIP"));
        if (explicit != null) {
            Path explicitPath = Paths.get(explicit).toAbsolutePath().normalize();
            if (Files.isRegularFile(explicitPath)) {
                assetsZipPath = explicitPath;
                return explicitPath;
            }
        }

        for (Path root : assetSearchRoots()) {
            for (Path path = root; path != null; path = path.getParent()) {
                for (Path candidate : assetsZipCandidates(path)) {
                    if (Files.isRegularFile(candidate)) {
                        assetsZipPath = candidate.toAbsolutePath().normalize();
                        plugin.getLogger().at(Level.INFO).log("Resolved Hytale Assets.zip for lazy mob icons: " + assetsZipPath);
                        return assetsZipPath;
                    }
                }
            }
        }
        return null;
    }

    private static List<Path> assetsZipCandidates(@Nonnull Path root) {
        return List.of(
                root.resolve("Assets.zip"),
                root.resolve("latest").resolve("Assets.zip"),
                root.resolve("release").resolve("latest").resolve("Assets.zip"),
                root.resolve("Client").resolve("latest").resolve("Assets.zip"),
                root.resolve("Client").resolve("release").resolve("latest").resolve("Assets.zip"),
                root.resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("release").resolve("package").resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("install").resolve("release").resolve("package").resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("Client").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("Client").resolve("release").resolve("latest").resolve("Assets.zip"));
    }

    private List<Path> assetSearchRoots() {
        LinkedHashSet<Path> roots = new LinkedHashSet<>();
        addPathIfPresent(roots, System.getProperty("synthworldview.assets_root"));
        addPathIfPresent(roots, System.getenv("SYNTH_WORLDVIEW_ASSETS_ROOT"));
        addPathIfPresent(roots, System.getProperty("hytale.assets_root"));
        addPathIfPresent(roots, System.getenv("HYTALE_ASSETS_ROOT"));
        addPathIfPresent(roots, System.getenv("VSCODE_CWD"));
        addPathIfPresent(roots, System.getenv("WORKSPACE_FOLDER"));
        addPathIfPresent(roots, System.getProperty("user.dir"));
        roots.add(Paths.get("").toAbsolutePath().normalize());
        roots.add(plugin.worldviewDir().toAbsolutePath().normalize());
        return List.copyOf(roots);
    }

    private static void addPathIfPresent(@Nonnull LinkedHashSet<Path> roots, @Nullable String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        roots.add(Paths.get(value).toAbsolutePath().normalize());
    }

    private static String entityFeedJson(@Nonnull World world,
                                         @Nonnull List<PlayerSnapshot> players,
                                         @Nonnull MobFeedSnapshot mobFeed) {
        String playerJson = players.stream()
                .map(PlayerSnapshot::toJson)
                .collect(Collectors.joining(","));
        String mobJson = mobFeed.mobs().stream()
                .map(MobSnapshot::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\""
                + ",\"intervalMs\":" + ENTITY_STREAM_INTERVAL_MS
                + ",\"players\":[" + playerJson + "]"
                + ",\"mobs\":[" + mobJson + "]"
                + ",\"mobRadar\":" + Math.round(mobFeed.radar())
                + ",\"mobRadarPlayers\":" + mobFeed.players()
                + ",\"mobSourceStats\":" + mobFeed.stats().toJson()
                + "}";
    }

    private static void writeSseEvent(@Nonnull OutputStream output,
                                      @Nonnull String event,
                                      @Nonnull String json) throws IOException {
        output.write(("event: " + event + "\n").getBytes(StandardCharsets.UTF_8));
        output.write(("data: " + json + "\n\n").getBytes(StandardCharsets.UTF_8));
        output.flush();
    }

    private static void initializeMobScanCounts(@Nonnull Store<EntityStore> store, @Nonnull MobScanStats stats) {
        stats.storeEntities = safeEntityCount(store, Archetype.of());
        stats.npcEntities = safeEntityCount(store, Archetype.of(NPCEntity.getComponentType()));
        stats.transformEntities = safeEntityCount(store, Archetype.of(TransformComponent.getComponentType()));
        stats.networkSendableEntities = safeEntityCount(store,
                Archetype.of(TransformComponent.getComponentType(), NetworkId.getComponentType()));
    }

    private static int safeEntityCount(@Nonnull Store<EntityStore> store, @Nonnull Query<EntityStore> query) {
        try {
            return store.getEntityCountFor(query);
        } catch (Exception ignored) {
            return -1;
        }
    }

    private static void collectMobSnapshotVisibleViewers(@Nonnull World world,
                                                         @Nonnull Store<EntityStore> store,
                                                         @Nonnull List<MobCandidate> candidates,
                                                         @Nonnull MobScanStats stats,
                                                         @Nonnull Set<Integer> seenRefs,
                                                         @Nonnull List<Vector3d> playerPositions,
                                                         @Nonnull NpcRoleIndex npcRoleIndex) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Ref<EntityStore> playerEntityRef = playerRef.getReference();
                if (playerEntityRef == null || !playerEntityRef.isValid()) {
                    continue;
                }
                EntityTrackerSystems.EntityViewer viewer = store.getComponent(
                        playerEntityRef,
                        EntityModule.get().getEntityViewerComponentType());
                if (viewer == null || viewer.visible == null) {
                    continue;
                }
                stats.addSource("EntityViewerVisible");
                stats.viewerVisible += viewer.visible.size();
                stats.viewerSent += viewer.sent == null ? 0 : viewer.sent.size();
                collectMobSnapshotRefs(store, viewer.visible, candidates, stats, seenRefs,
                        playerPositions, "EntityViewerVisible", npcRoleIndex);
            } catch (Exception ignored) {
                stats.errors++;
            }
        }
    }

    private static void collectMobSnapshotSpatial(
            @Nonnull Store<EntityStore> store,
            @Nonnull ResourceType<EntityStore, SpatialResource<Ref<EntityStore>, EntityStore>> resourceType,
            @Nonnull List<MobCandidate> candidates,
            @Nonnull MobScanStats stats,
            @Nonnull Set<Integer> seenRefs,
            @Nonnull List<Vector3d> playerPositions,
            @Nonnull String source,
            @Nonnull NpcRoleIndex npcRoleIndex) {
        try {
            SpatialResource<Ref<EntityStore>, EntityStore> spatial = store.getResource(resourceType);
            if (spatial == null) {
                return;
            }
            stats.addSource(source);
            stats.spatialSources++;
            stats.spatialIndexed += spatial.getSpatialStructure().size();
            for (Vector3d playerPosition : playerPositions) {
                List<Ref<EntityStore>> refs = new ArrayList<>();
                spatial.getSpatialStructure().collect(playerPosition, MOB_RADAR_RADIUS, refs);
                stats.spatialRefs += refs.size();
                collectMobSnapshotRefs(store, refs, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
            }
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static void collectMobSnapshotRefs(@Nonnull Store<EntityStore> store,
                                               @Nonnull Collection<Ref<EntityStore>> refs,
                                               @Nonnull List<MobCandidate> candidates,
                                               @Nonnull MobScanStats stats,
                                               @Nonnull Set<Integer> seenRefs,
                                               @Nonnull List<Vector3d> playerPositions,
                                               @Nonnull String source,
                                               @Nonnull NpcRoleIndex npcRoleIndex) {
        for (Ref<EntityStore> ref : refs) {
            collectMobSnapshotRef(store, ref, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
        }
    }

    private static void collectMobSnapshotRef(@Nonnull Store<EntityStore> store,
                                              @Nullable Ref<EntityStore> ref,
                                              @Nonnull List<MobCandidate> candidates,
                                              @Nonnull MobScanStats stats,
                                              @Nonnull Set<Integer> seenRefs,
                                              @Nonnull List<Vector3d> playerPositions,
                                              @Nonnull String source,
                                              @Nonnull NpcRoleIndex npcRoleIndex) {
        stats.entities++;
        try {
            if (ref == null || !ref.isValid()) {
                stats.invalidRefs++;
                return;
            }
            if (seenRefs.contains(ref.getIndex())) {
                stats.duplicates++;
                return;
            }
            if (store.getComponent(ref, PlayerRef.getComponentType()) != null) {
                stats.skippedPlayers++;
                return;
            }
            String nonMobReason = nonMobReason(store, ref);
            if (nonMobReason != null) {
                stats.addSkippedType(nonMobReason);
                stats.skippedNonMobs++;
                return;
            }
            TransformComponent transform = store.getComponent(ref, TransformComponent.getComponentType());
            if (transform == null) {
                stats.noTransform++;
                return;
            }
            Vector3d position = transform.getPosition();
            if (position == null) {
                stats.noPosition++;
                return;
            }
            double distanceSq = nearestDistanceSq(position, playerPositions);
            if (distanceSq > MOB_RADAR_RADIUS_SQ) {
                stats.skippedOutsideRadar++;
                return;
            }
            NPCEntity npc = store.getComponent(ref, NPCEntity.getComponentType());
            String type = safeMobType(store, ref, npc);
            if (isSpawnMarkerType(type)) {
                stats.addSkippedType(type);
                stats.skippedNonMobs++;
                return;
            }
            seenRefs.add(ref.getIndex());
            HealthSnapshot health = safeHealth(store, ref);
            String roleName = safeNpcRoleName(npc);
            String modelAsset = safeModelAssetId(store, ref);
            String persistentModelAsset = safePersistentModelAssetId(store, ref);
            NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
            if (liveRole != null) {
                stats.liveRoleMatches++;
            }
            String category = liveRole == null
                    ? categoryForMob(type)
                    : categoryForMob(type, liveRole.category());
            candidates.add(new MobCandidate(distanceSq, new MobSnapshot(
                    safeMobId(store, ref),
                    type,
                    safeMobRole(npc, null, type),
                    category,
                    position.x,
                    position.y,
                    position.z,
                    safeYaw(transform),
                    colorForMob(type),
                    source,
                    roleName,
                    safeNpcNameTranslationKey(npc),
                    safeNpcTypeIndex(npc),
                    safeNpcRoleIndex(npc),
                    modelAsset,
                    persistentModelAsset,
                    liveRole == null ? null : liveRole.id(),
                    liveRole == null ? null : liveRole.category(),
                    liveRole == null ? null : liveRole.pathHint(),
                    health.health(),
                    health.maxHealth())));
            stats.accepted++;
            stats.addType(type);
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static void collectMobSnapshotPass(@Nonnull Store<EntityStore> store,
                                               @Nonnull Query<EntityStore> query,
                                               @Nonnull List<MobCandidate> candidates,
                                               @Nonnull MobScanStats stats,
                                               @Nonnull Set<Integer> seenRefs,
                                               @Nonnull List<Vector3d> playerPositions,
                                               @Nonnull String source,
                                               @Nonnull NpcRoleIndex npcRoleIndex) {
        BiPredicate<ArchetypeChunk<EntityStore>, CommandBuffer<EntityStore>> collector = (chunk, ignored) -> {
            collectMobSnapshots(store, chunk, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
            return true;
        };
        store.forEachChunk(query, collector);
    }

    private static void collectMobSnapshots(@Nonnull Store<EntityStore> store,
                                            @Nonnull ArchetypeChunk<EntityStore> chunk,
                                            @Nonnull List<MobCandidate> candidates,
                                            @Nonnull MobScanStats stats,
                                            @Nonnull Set<Integer> seenRefs,
                                            @Nonnull List<Vector3d> playerPositions,
                                            @Nonnull String source,
                                            @Nonnull NpcRoleIndex npcRoleIndex) {
        stats.chunks++;
        stats.addSource(source);
        stats.addArchetype(chunk.getArchetype().toString());
        for (int index = 0; index < chunk.size(); index++) {
            stats.entities++;
            try {
                Ref<EntityStore> ref = chunk.getReferenceTo(index);
                if (ref == null || !ref.isValid()) {
                    stats.invalidRefs++;
                    continue;
                }
                if (seenRefs.contains(ref.getIndex())) {
                    stats.duplicates++;
                    continue;
                }
                if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
                    stats.skippedPlayers++;
                    continue;
                }
                if (isDefinitelyNotMob(chunk, index)) {
                    stats.skippedNonMobs++;
                    continue;
                }
                TransformComponent transform = store.getComponent(ref, TransformComponent.getComponentType());
                if (transform == null) {
                    stats.noTransform++;
                    continue;
                }
                Vector3d position = transform.getPosition();
                if (position == null) {
                    stats.noPosition++;
                    continue;
                }
                double distanceSq = nearestDistanceSq(position, playerPositions);
                if (distanceSq > MOB_RADAR_RADIUS_SQ) {
                    stats.skippedOutsideRadar++;
                    continue;
                }
                NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                Entity entity = EntityUtils.getEntity(index, chunk);
                String type = safeMobType(chunk, index, npc, entity);
                if (isSpawnMarkerType(type)) {
                    stats.addSkippedType(type);
                    stats.skippedNonMobs++;
                    continue;
                }
                seenRefs.add(ref.getIndex());
                HealthSnapshot health = safeHealth(store, ref);
                String roleName = safeNpcRoleName(npc);
                String modelAsset = safeModelAssetId(chunk, index);
                String persistentModelAsset = safePersistentModelAssetId(chunk, index);
                NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
                if (liveRole != null) {
                    stats.liveRoleMatches++;
                }
                String category = liveRole == null
                        ? categoryForMob(type)
                        : categoryForMob(type, liveRole.category());
                candidates.add(new MobCandidate(distanceSq, new MobSnapshot(
                        safeMobId(chunk, index, ref),
                        type,
                        safeMobRole(npc, entity, type),
                        category,
                        position.x,
                        position.y,
                        position.z,
                        safeYaw(transform),
                        colorForMob(type),
                        source,
                        roleName,
                        safeNpcNameTranslationKey(npc),
                        safeNpcTypeIndex(npc),
                        safeNpcRoleIndex(npc),
                        modelAsset,
                        persistentModelAsset,
                        liveRole == null ? null : liveRole.id(),
                        liveRole == null ? null : liveRole.category(),
                        liveRole == null ? null : liveRole.pathHint(),
                        health.health(),
                        health.maxHealth())));
                stats.accepted++;
                stats.addType(type);
            } catch (Exception ignored) {
                // Individual NPC refs can unload while the ECS chunk is being copied.
                stats.errors++;
            }
        }
    }

    private static List<Vector3d> playerPositionsForMobRadar(@Nonnull World world) {
        List<Vector3d> playerPositions = new ArrayList<>();
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Transform transform = playerRef.getTransform();
                if (transform != null && transform.getPosition() != null) {
                    playerPositions.add(new Vector3d(transform.getPosition()));
                }
            } catch (Exception ignored) {
            }
        }
        return playerPositions;
    }

    private void logMobScan(@Nonnull World world, @Nonnull Store<EntityStore> store,
                            @Nonnull MobScanStats stats, @Nonnull List<MobSnapshot> mobs) {
        long now = System.currentTimeMillis();
        long last = lastMobDebugLogMillis.get();
        if (now - last < 10_000L) {
            return;
        }
        if (!lastMobDebugLogMillis.compareAndSet(last, now)) {
            return;
        }

        String firstMob = mobs.isEmpty() ? "none" : mobs.stream()
                .limit(5)
                .map(mob -> mob.type() + "@" + Math.round(mob.x()) + "," + Math.round(mob.y()) + "," + Math.round(mob.z()))
                .collect(Collectors.joining(";"));
        plugin.getLogger().at(Level.INFO).log("[mob-feed] world=" + world.getName()
                + " storeEntities=" + stats.storeEntities
                + " npcEntities=" + stats.npcEntities
                + " transformEntities=" + stats.transformEntities
                + " networkSendableEntities=" + stats.networkSendableEntities
                + " chunks=" + stats.chunks
                + " entities=" + stats.entities
                + " accepted=" + stats.accepted
                + " duplicates=" + stats.duplicates
                + " players=" + stats.skippedPlayers
                + " nonMob=" + stats.skippedNonMobs
                + " outsideRadar=" + stats.skippedOutsideRadar
                + " radar=" + Math.round(MOB_RADAR_RADIUS)
                + " invalid=" + stats.invalidRefs
                + " noTransform=" + stats.noTransform
                + " noPosition=" + stats.noPosition
                + " errors=" + stats.errors
                + " viewerVisible=" + stats.viewerVisible
                + " viewerSent=" + stats.viewerSent
                + " spatialSources=" + stats.spatialSources
                + " spatialIndexed=" + stats.spatialIndexed
                + " spatialRefs=" + stats.spatialRefs
                + " types=" + stats.preview(stats.acceptedTypes)
                + " skippedTypes=" + stats.preview(stats.skippedTypes)
                + " sources=" + stats.preview(stats.sources)
                + " archetypes=" + stats.preview(stats.archetypes)
                + " first=" + firstMob
                + " nearby=" + nearbyTransformPreview(world, store));
    }

    private void logMobConnectSampleIfNeeded(@Nonnull World world, int players,
                                             @Nonnull MobScanStats stats,
                                             @Nonnull List<MobSnapshot> mobs) {
        Integer previous = lastMobSamplePlayerCounts.put(world.getName(), players);
        if (players <= 0 || (previous != null && previous >= players)) {
            return;
        }
        String nearest = mobs.stream()
                .limit(12)
                .map(mob -> mob.type()
                        + "@" + Math.round(mob.x()) + "," + Math.round(mob.y()) + "," + Math.round(mob.z())
                        + (mob.liveRoleId() == null ? "" : " role=" + mob.liveRoleId()))
                .collect(Collectors.joining(";"));
        plugin.getLogger().at(Level.INFO).log("[mob-connect-sample] world=" + world.getName()
                + " players=" + players
                + " mobs=" + mobs.size()
                + " types=" + stats.preview(stats.acceptedTypes)
                + " skippedTypes=" + stats.preview(stats.skippedTypes)
                + " sources=" + stats.preview(stats.sources)
                + " npcIndexLoaded=" + npcRoleIndex.isLoaded()
                + " npcIndexSize=" + npcRoleIndex.size()
                + " nearest=" + (nearest.isBlank() ? "none" : nearest));
    }

    private static String nearbyTransformPreview(@Nonnull World world, @Nonnull Store<EntityStore> store) {
        List<Vector3d> playerPositions = new ArrayList<>();
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Transform transform = playerRef.getTransform();
                if (transform != null && transform.getPosition() != null) {
                    playerPositions.add(new Vector3d(transform.getPosition()));
                }
            } catch (Exception ignored) {
            }
        }
        if (playerPositions.isEmpty()) {
            return "no-players";
        }

        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<NearbyCandidate> candidates = new ArrayList<>();
        store.forEachChunk(transformQuery, (chunk, ignored) -> {
            for (int index = 0; index < chunk.size(); index++) {
                TransformComponent transform = chunk.getComponent(index, TransformComponent.getComponentType());
                if (transform == null || transform.getPosition() == null) {
                    continue;
                }
                Vector3d position = transform.getPosition();
                double distanceSq = nearestDistanceSq(position, playerPositions);
                if (distanceSq > 120.0d * 120.0d) {
                    continue;
                }
                Ref<EntityStore> ref = chunk.getReferenceTo(index);
                NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                Entity entity = EntityUtils.getEntity(index, chunk);
                String type = safeMobType(chunk, index, npc, entity);
                String flags = "";
                if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
                    flags += " player";
                }
                if (isDefinitelyNotMob(chunk, index)) {
                    flags += " nonmob";
                }
                if (isSpawnMarkerType(type)) {
                    flags += " spawnmarker";
                }
                candidates.add(new NearbyCandidate(
                        ref == null ? -1 : ref.getIndex(),
                        type,
                        Math.sqrt(distanceSq),
                        position.x,
                        position.y,
                        position.z,
                        flags.trim()));
            }
            return true;
        });

        if (candidates.isEmpty()) {
            return "none-within-120";
        }
        return candidates.stream()
                .sorted(Comparator.comparingDouble(NearbyCandidate::distance))
                .limit(12)
                .map(NearbyCandidate::summary)
                .collect(Collectors.joining(";"));
    }

    private String mobDebugJson(@Nonnull World world) {
        Store<EntityStore> store = world.getEntityStore().getStore();
        MobScanStats stats = new MobScanStats();
        initializeMobScanCounts(store, stats);
        collectMobDebugViewerStats(world, store, stats);
        collectMobDebugSpatialStats(store, EntityModule.get().getNetworkSendableSpatialResourceType(), stats);
        collectMobDebugSpatialStats(store, NPCPlugin.get().getNpcSpatialResource(), stats);
        collectMobDebugSpatialStats(store, EntityModule.get().getEntitySpatialResourceType(), stats);
        List<Vector3d> playerPositions = playerPositionsForMobRadar(world);
        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<NearbyDebugCandidate> candidates = new ArrayList<>();
        store.forEachChunk(transformQuery, (chunk, ignored) -> {
            for (int index = 0; index < chunk.size(); index++) {
                try {
                    TransformComponent transform = chunk.getComponent(index, TransformComponent.getComponentType());
                    if (transform == null || transform.getPosition() == null) {
                        continue;
                    }
                    Vector3d position = transform.getPosition();
                    double distanceSq = playerPositions.isEmpty()
                            ? 0.0d
                            : nearestDistanceSq(position, playerPositions);
                    Ref<EntityStore> ref = chunk.getReferenceTo(index);
                    NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                    Entity entity = EntityUtils.getEntity(index, chunk);
                    String type = safeMobType(chunk, index, npc, entity);
                    String roleName = safeNpcRoleName(npc);
                    String modelAsset = safeModelAssetId(chunk, index);
                    String persistentModelAsset = safePersistentModelAssetId(chunk, index);
                    NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
                    String reason = debugMobReason(chunk, index, type, playerPositions, distanceSq);
                    candidates.add(new NearbyDebugCandidate(
                            ref == null ? -1 : ref.getIndex(),
                            type,
                            reason,
                            Math.sqrt(distanceSq),
                            position.x,
                            position.y,
                            position.z,
                            npc != null,
                            chunk.getComponent(index, PlayerRef.getComponentType()) != null,
                            roleName,
                            modelAsset,
                            persistentModelAsset,
                            liveRole == null ? null : liveRole.id(),
                            chunk.getArchetype().toString()));
                } catch (Exception ignoredCandidate) {
                }
            }
            return true;
        });

        String candidateJson = candidates.stream()
                .sorted(Comparator.comparingDouble(NearbyDebugCandidate::distance))
                .limit(96)
                .map(NearbyDebugCandidate::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\""
                + ",\"players\":" + playerPositions.size()
                + ",\"radar\":" + Math.round(MOB_RADAR_RADIUS)
                + ",\"sourceStats\":" + stats.toJson()
                + ",\"candidates\":[" + candidateJson + "]}";
    }

    private static void collectMobDebugViewerStats(@Nonnull World world,
                                                   @Nonnull Store<EntityStore> store,
                                                   @Nonnull MobScanStats stats) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Ref<EntityStore> playerEntityRef = playerRef.getReference();
                if (playerEntityRef == null || !playerEntityRef.isValid()) {
                    continue;
                }
                EntityTrackerSystems.EntityViewer viewer = store.getComponent(
                        playerEntityRef,
                        EntityModule.get().getEntityViewerComponentType());
                if (viewer == null || viewer.visible == null) {
                    continue;
                }
                stats.addSource("EntityViewerVisible");
                stats.viewerVisible += viewer.visible.size();
                stats.viewerSent += viewer.sent == null ? 0 : viewer.sent.size();
            } catch (Exception ignored) {
                stats.errors++;
            }
        }
    }

    private static void collectMobDebugSpatialStats(
            @Nonnull Store<EntityStore> store,
            @Nonnull ResourceType<EntityStore, SpatialResource<Ref<EntityStore>, EntityStore>> resourceType,
            @Nonnull MobScanStats stats) {
        try {
            SpatialResource<Ref<EntityStore>, EntityStore> spatial = store.getResource(resourceType);
            if (spatial == null) {
                return;
            }
            stats.spatialSources++;
            stats.spatialIndexed += spatial.getSpatialStructure().size();
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static String debugMobReason(@Nonnull ArchetypeChunk<EntityStore> chunk,
                                         int index,
                                         @Nonnull String type,
                                         @Nonnull List<Vector3d> playerPositions,
                                         double distanceSq) {
        if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
            return "player";
        }
        String nonMobReason = nonMobReason(chunk, index);
        if (nonMobReason != null) {
            return "technical_" + nonMobReason;
        }
        if (isSpawnMarkerType(type)) {
            return "technical_marker";
        }
        if (playerPositions.isEmpty()) {
            return "no_player_anchor";
        }
        if (distanceSq > MOB_RADAR_RADIUS_SQ) {
            return "outside_radar";
        }
        return "accepted";
    }

    private static double nearestDistanceSq(@Nonnull Vector3d position, @Nonnull List<Vector3d> playerPositions) {
        double best = Double.MAX_VALUE;
        for (Vector3d playerPosition : playerPositions) {
            double dx = position.x - playerPosition.x;
            double dy = position.y - playerPosition.y;
            double dz = position.z - playerPosition.z;
            double distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < best) {
                best = distanceSq;
            }
        }
        return best;
    }

    private static boolean isDefinitelyNotMob(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        return nonMobReason(chunk, index) != null;
    }

    @Nullable
    private static String nonMobReason(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        if (chunk.getComponent(index, ItemComponent.getComponentType()) != null) {
            return "item";
        }
        if (chunk.getComponent(index, ProjectileComponent.getComponentType()) != null) {
            return "projectile";
        }
        if (chunk.getComponent(index, BlockEntity.getComponentType()) != null) {
            return "block_entity";
        }
        return null;
    }

    @Nullable
    private static String nonMobReason(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        if (store.getComponent(ref, ItemComponent.getComponentType()) != null) {
            return "item";
        }
        if (store.getComponent(ref, ProjectileComponent.getComponentType()) != null) {
            return "projectile";
        }
        if (store.getComponent(ref, BlockEntity.getComponentType()) != null) {
            return "block_entity";
        }
        return null;
    }

    private static boolean isDefinitelyNotMob(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        return nonMobReason(store, ref) != null;
    }

    private static boolean isSpawnMarkerType(@Nonnull String type) {
        String normalized = type.toLowerCase();
        return normalized.contains("spawn_marker")
                || normalized.contains("spawnmark")
                || normalized.contains("spawn_mark")
                || normalized.contains("path_marker")
                || normalized.contains("pathmark")
                || normalized.contains("path_mark");
    }

    private static String safeMobType(@Nonnull ArchetypeChunk<EntityStore> chunk,
                                      int index,
                                      NPCEntity npc,
                                      Entity entity) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
            try {
                String type = npc.getNPCTypeId();
                if (type != null && !type.isBlank()) {
                    return type;
                }
            } catch (Exception ignored) {
            }
        }
        String modelType = safeModelType(chunk, index);
        if (modelType != null) {
            return modelType;
        }
        return safeEntityType(entity);
    }

    private static String safeMobType(@Nonnull Store<EntityStore> store,
                                      @Nonnull Ref<EntityStore> ref,
                                      NPCEntity npc) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
            try {
                String type = npc.getNPCTypeId();
                if (type != null && !type.isBlank()) {
                    return type;
                }
            } catch (Exception ignored) {
            }
        }
        String modelType = safeModelType(store, ref);
        return modelType == null ? "LivingEntity" : modelType;
    }

    @Nullable
    private static String safeModelType(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            ModelComponent modelComponent = chunk.getComponent(index, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String modelAssetId = modelComponent.getModel().getModelAssetId();
                String type = labelFromAssetId(modelAssetId);
                if (type != null) {
                    return type;
                }
                type = labelFromAssetId(modelComponent.getModel().getModel());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        try {
            PersistentModel persistentModel = chunk.getComponent(index, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String type = labelFromAssetId(persistentModel.getModelReference().getModelAssetId());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    private static String labelFromAssetId(String assetId) {
        if (assetId == null || assetId.isBlank()) {
            return null;
        }
        String normalized = assetId.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < normalized.length()) {
            normalized = normalized.substring(slash + 1);
        }
        int colon = normalized.lastIndexOf(':');
        if (colon >= 0 && colon + 1 < normalized.length()) {
            normalized = normalized.substring(colon + 1);
        }
        if (normalized.endsWith(".json")) {
            normalized = normalized.substring(0, normalized.length() - ".json".length());
        }
        normalized = normalized.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private static String safeMobRole(NPCEntity npc, Entity entity, @Nonnull String fallback) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
        }
        return fallback;
    }

    private static String safeMobId(@Nonnull ArchetypeChunk<EntityStore> chunk,
                                    int index,
                                    @Nonnull Ref<EntityStore> ref) {
        try {
            UUIDComponent uuidComponent = chunk.getComponent(index, UUIDComponent.getComponentType());
            if (uuidComponent != null && uuidComponent.getUuid() != null) {
                return uuidComponent.getUuid().toString();
            }
        } catch (Exception ignored) {
        }
        return "idx-" + ref.getIndex();
    }

    private static String safeMobId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            UUIDComponent uuidComponent = store.getComponent(ref, UUIDComponent.getComponentType());
            if (uuidComponent != null && uuidComponent.getUuid() != null) {
                return uuidComponent.getUuid().toString();
            }
        } catch (Exception ignored) {
        }
        return "idx-" + ref.getIndex();
    }

    @Nullable
    private static String safeNpcNameTranslationKey(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            Role role = npc.getRole();
            String translationKey = role == null ? null : role.getNameTranslationKey();
            if (translationKey != null && !translationKey.isBlank()) {
                return translationKey;
            }
        } catch (Exception ignored) {
        }
        String roleName = safeNpcRoleName(npc);
        return roleName == null ? null : "server.npcRoles." + roleName + ".name";
    }

    @Nullable
    private static NpcRoleIndex.Entry liveNpcEntry(@Nonnull NpcRoleIndex npcRoleIndex,
                                                  @Nullable String type,
                                                  @Nullable String role,
                                                  @Nullable String modelAsset,
                                                  @Nullable String persistentModelAsset) {
        List<String> candidates = new ArrayList<>();
        if (type != null) candidates.add(type);
        if (role != null) candidates.add(role);
        String modelType = labelFromAssetId(modelAsset);
        if (modelType != null) candidates.add(modelType);
        String persistentModelType = labelFromAssetId(persistentModelAsset);
        if (persistentModelType != null) candidates.add(persistentModelType);
        for (String candidate : candidates) {
            NpcRoleIndex.Entry entry = npcRoleIndex.resolve(candidate);
            if (entry != null) {
                return entry;
            }
        }
        return null;
    }

    @Nullable
    private static String safeModelType(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            ModelComponent modelComponent = store.getComponent(ref, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String modelAssetId = modelComponent.getModel().getModelAssetId();
                String type = labelFromAssetId(modelAssetId);
                if (type != null) {
                    return type;
                }
                type = labelFromAssetId(modelComponent.getModel().getModel());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        try {
            PersistentModel persistentModel = store.getComponent(ref, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String type = labelFromAssetId(persistentModel.getModelReference().getModelAssetId());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    private static String safeNpcRoleName(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            String roleName = npc.getRoleName();
            return roleName == null || roleName.isBlank() ? null : roleName;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    private static Integer safeNpcTypeIndex(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            int value = npc.getNPCTypeIndex();
            return value < 0 ? null : value;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    private static Integer safeNpcRoleIndex(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            int value = npc.getRoleIndex();
            return value < 0 ? null : value;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    private static Float safeYaw(@Nonnull TransformComponent transform) {
        try {
            Rotation3f rotation = transform.getRotation();
            return rotation == null || !Float.isFinite(rotation.yaw()) ? null : rotation.yaw();
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    private static String safeModelAssetId(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            ModelComponent modelComponent = chunk.getComponent(index, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String assetId = modelComponent.getModel().getModelAssetId();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
                assetId = modelComponent.getModel().getModel();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    private static String safeModelAssetId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            ModelComponent modelComponent = store.getComponent(ref, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String assetId = modelComponent.getModel().getModelAssetId();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
                assetId = modelComponent.getModel().getModel();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    private static String safePersistentModelAssetId(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            PersistentModel persistentModel = chunk.getComponent(index, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String assetId = persistentModel.getModelReference().getModelAssetId();
                return assetId == null || assetId.isBlank() ? null : assetId;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    private static String safePersistentModelAssetId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            PersistentModel persistentModel = store.getComponent(ref, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String assetId = persistentModel.getModelReference().getModelAssetId();
                return assetId == null || assetId.isBlank() ? null : assetId;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static HealthSnapshot safeHealth(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            EntityStatMap statMap = store.getComponent(ref, EntityStatMap.getComponentType());
            if (statMap == null) {
                return HealthSnapshot.empty();
            }
            EntityStatValue health = statMap.get(DefaultEntityStatTypes.getHealth());
            if (health == null) {
                health = statMap.get("health");
            }
            if (health == null) {
                return HealthSnapshot.empty();
            }
            return new HealthSnapshot((double) health.get(), (double) health.getMax());
        } catch (Exception ignored) {
            return HealthSnapshot.empty();
        }
    }

    private static String safeEntityType(Entity entity) {
        if (entity == null) {
            return "LivingEntity";
        }
        try {
            String identifier = EntityModule.get().getIdentifier(entity.getClass());
            if (identifier != null && !identifier.isBlank()) {
                return identifier;
            }
        } catch (Exception ignored) {
        }
        String simpleName = entity.getClass().getSimpleName();
        return simpleName == null || simpleName.isBlank() ? "LivingEntity" : simpleName;
    }

    private static String categoryForMob(@Nonnull String type) {
        return categoryForMob(type, null);
    }

    private static String categoryForMob(@Nonnull String type, @Nullable String liveCategory) {
        if (liveCategory != null) {
            String normalizedCategory = liveCategory.toLowerCase();
            if (normalizedCategory.contains("undead") || normalizedCategory.contains("aggressive")
                    || normalizedCategory.contains("elemental")) {
                return "hostile";
            }
            if (normalizedCategory.contains("livestock")) {
                return "livestock";
            }
            if (normalizedCategory.contains("critter")) {
                return "critter";
            }
            if (normalizedCategory.contains("flying") || normalizedCategory.contains("avian")) {
                return "flying";
            }
            if (normalizedCategory.contains("swimming") || normalizedCategory.contains("fish")) {
                return "swimming";
            }
            if (normalizedCategory.contains("intelligent")) {
                return "npc";
            }
        }
        String normalized = type.toLowerCase();
        if (normalized.contains("boss") || normalized.contains("giant") || normalized.contains("rex")
                || normalized.contains("dragon") || normalized.contains("guardian")) {
            return "boss";
        }
        if (normalized.contains("skeleton") || normalized.contains("zombie") || normalized.contains("ghoul")
                || normalized.contains("undead") || normalized.contains("goblin") || normalized.contains("outlander")
                || normalized.contains("trork") || normalized.contains("yeti") || normalized.contains("spider")
                || normalized.contains("scarak") || normalized.contains("scorpion") || normalized.contains("void")
                || normalized.contains("hound") || normalized.contains("wolf") || normalized.contains("bear")) {
            return "hostile";
        }
        if (normalized.contains("kweebec") || normalized.contains("feran") || normalized.contains("klops")
                || normalized.contains("tuluk") || normalized.contains("slothian") || normalized.contains("bramblekin")
                || normalized.contains("elf") || normalized.contains("merchant") || normalized.contains("npc")) {
            return "npc";
        }
        if (normalized.contains("cow") || normalized.contains("pig") || normalized.contains("boar")
                || normalized.contains("bison") || normalized.contains("chicken") || normalized.contains("horse")
                || normalized.contains("goat") || normalized.contains("warthog") || normalized.contains("sheep")) {
            return "livestock";
        }
        if (normalized.contains("frog") || normalized.contains("mouse") || normalized.contains("rat")
                || normalized.contains("rabbit") || normalized.contains("squirrel") || normalized.contains("gecko")
                || normalized.contains("meerkat")) {
            return "critter";
        }
        if (normalized.contains("tetrabird") || normalized.contains("bird") || normalized.contains("duck")
                || normalized.contains("hawk") || normalized.contains("raven")
                || normalized.contains("crow") || normalized.contains("bat") || normalized.contains("owl")
                || normalized.contains("vulture") || normalized.contains("sparrow")) {
            return "flying";
        }
        if (normalized.contains("fish") || normalized.contains("shark") || normalized.contains("puffer")
                || normalized.contains("crocodile") || normalized.contains("swimming")) {
            return "swimming";
        }
        if (normalized.contains("deer") || normalized.contains("fox") || normalized.contains("penguin")) {
            return "passive";
        }
        return "unknown";
    }

    private static String colorForMob(@Nonnull String type) {
        String category = categoryForMob(type);
        return switch (category) {
            case "hostile" -> "#ff5d6c";
            case "npc" -> "#7ec8ff";
            case "boss" -> "#d189ff";
            case "livestock" -> "#ffd36a";
            case "critter" -> "#8ee58b";
            case "flying" -> "#b8d8ff";
            case "swimming" -> "#62d4e7";
            case "passive" -> "#a7e06f";
            default -> fallbackMobColor(type);
        };
    }

    private static String fallbackMobColor(@Nonnull String type) {
        int hash = type.hashCode();
        int hue = Math.floorMod(hash, 360);
        return "hsl(" + hue + ",70%,58%)";
    }

    private static Integer parseInt(@Nonnull String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static double round3(double value) {
        return Math.round(value * 1000.0d) / 1000.0d;
    }

    private static String findString(@Nonnull Pattern pattern, @Nonnull String body, @Nonnull String fieldName) {
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find()) {
            throw new IllegalArgumentException(fieldName + "_required");
        }
        return matcher.group(1);
    }

    private static Integer findInt(@Nonnull Pattern pattern, @Nonnull String body, @Nonnull String fieldName) {
        Matcher matcher = pattern.matcher(body);
        if (!matcher.find()) {
            throw new IllegalArgumentException(fieldName + "_required");
        }
        return Integer.parseInt(matcher.group(1));
    }

    private static String decode(@Nonnull String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static boolean queryFlag(@Nonnull HttpExchange exchange, @Nonnull String name, boolean defaultValue) {
        String query = exchange.getRequestURI().getRawQuery();
        if (query == null || query.isBlank()) {
            return defaultValue;
        }
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            if (!name.equals(decode(rawKey))) {
                continue;
            }
            String value = equals >= 0 ? decode(pair.substring(equals + 1)) : "true";
            if (value.isBlank()) {
                return defaultValue;
            }
            String normalized = value.toLowerCase();
            return normalized.equals("1")
                    || normalized.equals("true")
                    || normalized.equals("yes")
                    || normalized.equals("on");
        }
        return defaultValue;
    }

    @Nullable
    private static String queryParam(@Nonnull HttpExchange exchange, @Nonnull String name) {
        String query = exchange.getRequestURI().getRawQuery();
        if (query == null || query.isBlank()) {
            return null;
        }
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            if (!name.equals(decode(rawKey))) {
                continue;
            }
            return equals >= 0 ? decode(pair.substring(equals + 1)) : "";
        }
        return null;
    }

    private static String safeName(@Nonnull String value) {
        return value.replaceAll("[^A-Za-z0-9_.-]", "_");
    }

    @Nullable
    private static String firstNonBlank(@Nullable String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String contentType(@Nonnull String resourcePath) {
        if (resourcePath.endsWith(".html")) return "text/html; charset=utf-8";
        if (resourcePath.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (resourcePath.endsWith(".json")) return "application/json; charset=utf-8";
        if (resourcePath.endsWith(".css")) return "text/css; charset=utf-8";
        if (resourcePath.endsWith(".png")) return "image/png";
        if (resourcePath.endsWith(".jpg") || resourcePath.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private static void writeJson(@Nonnull HttpExchange exchange, int status, @Nonnull String json) throws IOException {
        writeBytes(exchange, status, json.getBytes(StandardCharsets.UTF_8), "application/json; charset=utf-8");
    }

    private static void writeText(@Nonnull HttpExchange exchange, int status, @Nonnull String text,
                                  @Nonnull String contentType) throws IOException {
        writeBytes(exchange, status, text.getBytes(StandardCharsets.UTF_8), contentType);
    }

    private static void writeBytes(@Nonnull HttpExchange exchange, int status, byte[] bytes,
                                   @Nonnull String contentType) throws IOException {
        writeCacheableBytes(exchange, status, bytes, contentType, "no-cache");
    }

    private static void writeCacheableBytes(@Nonnull HttpExchange exchange, int status, byte[] bytes,
                                            @Nonnull String contentType, @Nonnull String cacheControl) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Cache-Control", cacheControl);
        addCors(exchange);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static void addCors(@Nonnull HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
    }

    private static String escapeJson(@Nonnull String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    public record Metrics(
            long singleRequests,
            long batchRequests,
            long generatedChunks,
            long memoryCacheHits,
            long diskCacheHits,
            long coalescedRequests,
            long failedGenerations,
            int activeGenerations,
            int pendingRequests,
            int maxConcurrentGenerations,
            int memoryCacheEntries,
            long memoryCacheBytes,
            int maxMemoryCacheEntries,
            long maxMemoryCacheBytes,
            long diskCacheFiles,
            long diskCacheBytes) {
    }

    public record MemoryCacheStats(int entries, long bytes) {
    }

    private record TerrainRequest(String worldName, int chunkX, int chunkZ, boolean includeDetails) {
        String key() {
            return worldName + ":" + chunkX + ":" + chunkZ + ":" + includeDetails;
        }
    }

    private record MapRegionRequest(String worldName, int centerX, int centerZ, int radius) {
        String key() {
            return worldName + ":" + MAP_REGION_TILE_SIZE + ":" + centerX + ":" + centerZ + ":" + radius;
        }
    }

    private record MapRegionResult(byte[] bytes, String source) {
        MapRegionResult withSource(@Nonnull String source) {
            return new MapRegionResult(bytes, source);
        }
    }

    private record MapRegionGeneration(byte[] bytes, boolean complete) {
    }

    private record TerrainMapTileRequest(String worldName, int chunkX, int chunkZ) {
        String key() {
            return worldName + ":" + chunkX + ":" + chunkZ;
        }
    }

    private record MapTileTerrainResult(byte[] png, String source) {
    }

    private record BatchMapTileResult(int chunkX, int chunkZ, @Nullable MapTileTerrainResult tile, @Nullable String error) {
    }

    private record BatchTerrainRequest(String worldName, List<ChunkCoord> chunks, String asset) {
        boolean mapAsset() {
            return "map".equalsIgnoreCase(asset);
        }
    }

    private record ChunkCoord(int chunkX, int chunkZ) {
    }

    private record PlayerSnapshot(String uuid, String name, double x, double y, double z, float yaw, float pitch,
                                  @Nullable PlayerSkinSnapshot skin) {
        String toJson() {
            return "{\"uuid\":\"" + escapeJson(uuid) + "\""
                    + ",\"name\":\"" + escapeJson(name) + "\""
                    + ",\"avatarUrl\":\"" + escapeJson(avatarUrl()) + "\""
                    + (skin == null ? "" : ",\"skin\":" + skin.toJson())
                    + ",\"x\":" + x
                    + ",\"y\":" + y
                    + ",\"z\":" + z
                    + ",\"yaw\":" + yaw
                    + ",\"pitch\":" + pitch
                    + "}";
        }

        private String avatarUrl() {
            String avatarToken = safeName(uuid) + (skin == null ? "" : "-" + safeName(skin.key()));
            return "/api/player-avatar/" + avatarToken + ".png?name="
                    + URLEncoder.encode(name, StandardCharsets.UTF_8);
        }
    }

    private record PlayerSkinSnapshot(
            String key,
            String bodyCharacteristic,
            String underwear,
            String face,
            String eyes,
            String ears,
            String mouth,
            String facialHair,
            String haircut,
            String eyebrows,
            String pants,
            String overpants,
            String undertop,
            String overtop,
            String shoes,
            String headAccessory,
            String faceAccessory,
            String earAccessory,
            String skinFeature,
            String gloves,
            String cape) {
        @Nullable
        static PlayerSkinSnapshot from(@Nonnull PlayerRef playerRef) {
            try {
                Ref<EntityStore> ref = playerRef.getReference();
                if (ref == null || !ref.isValid()) {
                    return null;
                }
                PlayerSkinComponent skinComponent = ref.getStore().getComponent(ref, PlayerSkinComponent.getComponentType());
                if (skinComponent == null || skinComponent.getPlayerSkin() == null) {
                    return null;
                }
                PlayerSkin skin = skinComponent.getPlayerSkin();
                return fromSkin(skin);
            } catch (Exception ignored) {
                return null;
            }
        }

        private static PlayerSkinSnapshot fromSkin(@Nonnull PlayerSkin skin) {
            String data = String.join("|",
                    value(skin.bodyCharacteristic),
                    value(skin.underwear),
                    value(skin.face),
                    value(skin.eyes),
                    value(skin.ears),
                    value(skin.mouth),
                    value(skin.facialHair),
                    value(skin.haircut),
                    value(skin.eyebrows),
                    value(skin.pants),
                    value(skin.overpants),
                    value(skin.undertop),
                    value(skin.overtop),
                    value(skin.shoes),
                    value(skin.headAccessory),
                    value(skin.faceAccessory),
                    value(skin.earAccessory),
                    value(skin.skinFeature),
                    value(skin.gloves),
                    value(skin.cape));
            return new PlayerSkinSnapshot(
                    Integer.toUnsignedString(data.hashCode(), 36),
                    value(skin.bodyCharacteristic),
                    value(skin.underwear),
                    value(skin.face),
                    value(skin.eyes),
                    value(skin.ears),
                    value(skin.mouth),
                    value(skin.facialHair),
                    value(skin.haircut),
                    value(skin.eyebrows),
                    value(skin.pants),
                    value(skin.overpants),
                    value(skin.undertop),
                    value(skin.overtop),
                    value(skin.shoes),
                    value(skin.headAccessory),
                    value(skin.faceAccessory),
                    value(skin.earAccessory),
                    value(skin.skinFeature),
                    value(skin.gloves),
                    value(skin.cape));
        }

        private static String value(@Nullable String value) {
            return value == null ? "" : value;
        }

        String toJson() {
            return "{\"key\":\"" + escapeJson(key) + "\""
                    + skinField("bodyCharacteristic", bodyCharacteristic)
                    + skinField("underwear", underwear)
                    + skinField("face", face)
                    + skinField("eyes", eyes)
                    + skinField("ears", ears)
                    + skinField("mouth", mouth)
                    + skinField("facialHair", facialHair)
                    + skinField("haircut", haircut)
                    + skinField("eyebrows", eyebrows)
                    + skinField("pants", pants)
                    + skinField("overpants", overpants)
                    + skinField("undertop", undertop)
                    + skinField("overtop", overtop)
                    + skinField("shoes", shoes)
                    + skinField("headAccessory", headAccessory)
                    + skinField("faceAccessory", faceAccessory)
                    + skinField("earAccessory", earAccessory)
                    + skinField("skinFeature", skinFeature)
                    + skinField("gloves", gloves)
                    + skinField("cape", cape)
                    + "}";
        }

        private static String skinField(@Nonnull String name, @Nullable String value) {
            return value == null || value.isBlank()
                    ? ""
                    : ",\"" + name + "\":\"" + escapeJson(value) + "\"";
        }
    }

    private record WorldTimeSnapshot(
            int hour,
            double dayProgress,
            int moonPhase,
            double sunlightFactor,
            String dateTime,
            double sunX,
            double sunY,
            double sunZ) {

        static WorldTimeSnapshot from(@Nonnull WorldTimeResource time) {
            Vector3d sunDirection = time.getSunDirection();
            return new WorldTimeSnapshot(
                    time.getCurrentHour(),
                    time.getDayProgress(),
                    time.getMoonPhase(),
                    time.getSunlightFactor(),
                    time.getGameDateTime() == null ? "" : time.getGameDateTime().toString(),
                    sunDirection == null ? 0 : sunDirection.x,
                    sunDirection == null ? 1 : sunDirection.y,
                    sunDirection == null ? 0 : sunDirection.z);
        }

        String toJson(@Nonnull String worldName) {
            return "{\"ok\":true"
                    + ",\"world\":\"" + escapeJson(worldName) + "\""
                    + ",\"hour\":" + hour
                    + ",\"dayProgress\":" + round3(dayProgress)
                    + ",\"phase\":\"" + dayPhase(dayProgress) + "\""
                    + ",\"moonPhase\":" + moonPhase
                    + ",\"sunlightFactor\":" + round3(sunlightFactor)
                    + ",\"dateTime\":\"" + escapeJson(dateTime) + "\""
                    + ",\"sunDirection\":{\"x\":" + round3(sunX)
                    + ",\"y\":" + round3(sunY)
                    + ",\"z\":" + round3(sunZ)
                    + "}}";
        }

        private static String dayPhase(double progress) {
            if (progress < 0.08 || progress >= 0.92) return "midnight";
            if (progress < 0.20) return "night";
            if (progress < 0.32) return "sunrise";
            if (progress < 0.46) return "morning";
            if (progress < 0.56) return "noon";
            if (progress < 0.70) return "afternoon";
            if (progress < 0.82) return "sunset";
            return "night";
        }

        private static double round3(double value) {
            return Math.round(value * 1000.0d) / 1000.0d;
        }
    }

    private record MobFeedSnapshot(List<MobSnapshot> mobs, MobScanStats stats, int players, double radar) {
        static MobFeedSnapshot empty() {
            return new MobFeedSnapshot(List.of(), new MobScanStats(), 0, MOB_RADAR_RADIUS);
        }

        String toJson(@Nonnull String worldName) {
            String mobJson = mobs.stream()
                    .map(MobSnapshot::toJson)
                    .collect(Collectors.joining(","));
            return "{\"ok\":true"
                    + ",\"world\":\"" + escapeJson(worldName) + "\""
                    + ",\"max\":" + MAX_MOB_SNAPSHOTS
                    + ",\"radar\":" + Math.round(radar)
                    + ",\"players\":" + players
                    + ",\"mobs\":[" + mobJson + "]"
                    + ",\"sourceStats\":" + stats.toJson()
                    + "}";
        }
    }

    private record MobSnapshot(
            String id,
            String type,
            String label,
            String category,
            double x,
            double y,
            double z,
            Float yaw,
            String color,
            String source,
            String role,
            String nameTranslationKey,
            Integer npcTypeIndex,
            Integer roleIndex,
            String modelAsset,
            String persistentModelAsset,
            String liveRoleId,
            String liveRoleCategory,
            String liveRolePath,
            Double health,
            Double maxHealth) {
        String toJson() {
            return "{\"id\":\"" + escapeJson(id) + "\""
                    + ",\"type\":\"" + escapeJson(type) + "\""
                    + ",\"label\":\"" + escapeJson(label) + "\""
                    + ",\"category\":\"" + escapeJson(category) + "\""
                    + ",\"x\":" + x
                    + ",\"y\":" + y
                    + ",\"z\":" + z
                    + (yaw == null ? "" : ",\"yaw\":" + yaw)
                    + ",\"color\":\"" + escapeJson(color) + "\""
                    + ",\"source\":\"" + escapeJson(source) + "\""
                    + (role == null ? "" : ",\"role\":\"" + escapeJson(role) + "\"")
                    + (nameTranslationKey == null ? "" : ",\"nameTranslationKey\":\"" + escapeJson(nameTranslationKey) + "\"")
                    + (npcTypeIndex == null ? "" : ",\"npcTypeIndex\":" + npcTypeIndex)
                    + (roleIndex == null ? "" : ",\"roleIndex\":" + roleIndex)
                    + (modelAsset == null ? "" : ",\"modelAsset\":\"" + escapeJson(modelAsset) + "\"")
                    + (persistentModelAsset == null ? "" : ",\"persistentModelAsset\":\"" + escapeJson(persistentModelAsset) + "\"")
                    + (liveRoleId == null ? "" : ",\"liveRoleId\":\"" + escapeJson(liveRoleId) + "\"")
                    + (liveRoleCategory == null ? "" : ",\"liveRoleCategory\":\"" + escapeJson(liveRoleCategory) + "\"")
                    + (liveRolePath == null ? "" : ",\"liveRolePath\":\"" + escapeJson(liveRolePath) + "\"")
                    + (health == null ? "" : ",\"health\":" + round3(health))
                    + (maxHealth == null ? "" : ",\"maxHealth\":" + round3(maxHealth))
                    + "}";
        }
    }

    private record HealthSnapshot(Double health, Double maxHealth) {
        static HealthSnapshot empty() {
            return new HealthSnapshot(null, null);
        }
    }

    private record MobCandidate(double distanceSq, MobSnapshot snapshot) {
    }

    private record NearbyCandidate(int id, String type, double distance, double x, double y, double z, String flags) {
        String summary() {
            return type + "#" + id
                    + " d=" + Math.round(distance)
                    + " @" + Math.round(x) + "," + Math.round(y) + "," + Math.round(z)
                    + (flags.isBlank() ? "" : " [" + flags + "]");
        }
    }

    private record NearbyDebugCandidate(
            int id,
            String type,
            String reason,
            double distance,
            double x,
            double y,
            double z,
            boolean npc,
            boolean player,
            @Nullable String role,
            @Nullable String modelAsset,
            @Nullable String persistentModelAsset,
            @Nullable String liveRoleId,
            String archetype) {
        String toJson() {
            return "{\"id\":" + id
                    + ",\"type\":\"" + escapeJson(type) + "\""
                    + ",\"reason\":\"" + escapeJson(reason) + "\""
                    + ",\"distance\":" + round3(distance)
                    + ",\"x\":" + round3(x)
                    + ",\"y\":" + round3(y)
                    + ",\"z\":" + round3(z)
                    + ",\"npc\":" + npc
                    + ",\"player\":" + player
                    + (role == null ? "" : ",\"role\":\"" + escapeJson(role) + "\"")
                    + (modelAsset == null ? "" : ",\"modelAsset\":\"" + escapeJson(modelAsset) + "\"")
                    + (persistentModelAsset == null ? "" : ",\"persistentModelAsset\":\"" + escapeJson(persistentModelAsset) + "\"")
                    + (liveRoleId == null ? "" : ",\"liveRoleId\":\"" + escapeJson(liveRoleId) + "\"")
                    + ",\"archetype\":\"" + escapeJson(MobScanStats.shorten(archetype)) + "\""
                    + "}";
        }
    }

    private static final class MobScanStats {
        private final LinkedHashMap<String, Integer> sources = new LinkedHashMap<>();
        private final LinkedHashMap<String, Integer> archetypes = new LinkedHashMap<>();
        private final LinkedHashMap<String, Integer> acceptedTypes = new LinkedHashMap<>();
        private final LinkedHashMap<String, Integer> skippedTypes = new LinkedHashMap<>();
        private int chunks;
        private int entities;
        private int accepted;
        private int duplicates;
        private int skippedPlayers;
        private int skippedNonMobs;
        private int skippedOutsideRadar;
        private int invalidRefs;
        private int noTransform;
        private int noPosition;
        private int errors;
        private int liveRoleMatches;
        private int storeEntities;
        private int npcEntities;
        private int transformEntities;
        private int networkSendableEntities;
        private int viewerVisible;
        private int viewerSent;
        private int spatialSources;
        private int spatialIndexed;
        private int spatialRefs;

        private void addArchetype(@Nonnull String archetype) {
            archetypes.merge(shorten(archetype), 1, Integer::sum);
        }

        private void addSource(@Nonnull String source) {
            sources.merge(source, 1, Integer::sum);
        }

        private void addType(@Nonnull String type) {
            acceptedTypes.merge(type, 1, Integer::sum);
        }

        private void addSkippedType(@Nonnull String type) {
            skippedTypes.merge(type, 1, Integer::sum);
        }

        private String preview(@Nonnull LinkedHashMap<String, Integer> values) {
            if (values.isEmpty()) {
                return "none";
            }
            return values.entrySet().stream()
                    .limit(MAX_MOB_DEBUG_SUMMARY_ITEMS)
                    .map(entry -> entry.getKey() + "=" + entry.getValue())
                    .collect(Collectors.joining("|"));
        }

        private String toJson() {
            return "{\"source\":\"" + escapeJson(preview(sources)) + "\""
                    + ",\"storeEntities\":" + storeEntities
                    + ",\"npcEntities\":" + npcEntities
                    + ",\"transformEntities\":" + transformEntities
                    + ",\"networkSendableEntities\":" + networkSendableEntities
                    + ",\"chunks\":" + chunks
                    + ",\"entities\":" + entities
                    + ",\"accepted\":" + accepted
                    + ",\"duplicates\":" + duplicates
                    + ",\"players\":" + skippedPlayers
                    + ",\"nonMob\":" + skippedNonMobs
                    + ",\"outsideRadar\":" + skippedOutsideRadar
                    + ",\"invalid\":" + invalidRefs
                    + ",\"noTransform\":" + noTransform
                    + ",\"noPosition\":" + noPosition
                    + ",\"errors\":" + errors
                    + ",\"liveRoleMatches\":" + liveRoleMatches
                    + ",\"viewerVisible\":" + viewerVisible
                    + ",\"viewerSent\":" + viewerSent
                    + ",\"spatialSources\":" + spatialSources
                    + ",\"spatialIndexed\":" + spatialIndexed
                    + ",\"spatialRefs\":" + spatialRefs
                    + ",\"types\":\"" + escapeJson(preview(acceptedTypes)) + "\""
                    + ",\"skippedTypes\":\"" + escapeJson(preview(skippedTypes)) + "\""
                    + ",\"archetypes\":\"" + escapeJson(preview(archetypes)) + "\""
                    + "}";
        }

        private static String shorten(@Nonnull String value) {
            String compact = value
                    .replace("com.hypixel.hytale.server.core.", "")
                    .replace("com.hypixel.hytale.server.", "")
                    .replace("com.hypixel.hytale.", "");
            return compact.length() <= 140 ? compact : compact.substring(0, 137) + "...";
        }
    }

    private record TerrainResult(byte[] glb, int columns, int vertices, int triangles, int details, String source) {
        static TerrainResult generated(TerrainSnapshot snapshot, TerrainMesh mesh, byte[] glb) {
            int details = mesh.detail().vertexCount() == 0 ? 0 : snapshot.details().length;
            return new TerrainResult(
                    glb,
                    snapshot.nonEmptyColumns(),
                    mesh.vertexCount(),
                    mesh.triangleCount(),
                    details,
                    "generated");
        }

        TerrainResult withSource(@Nonnull String source) {
            return new TerrainResult(glb, columns, vertices, triangles, details, source);
        }

        String metadataJson() {
            return "{\"format\":\"" + FORMAT_VERSION + "\""
                    + ",\"columns\":" + columns
                    + ",\"vertices\":" + vertices
                    + ",\"triangles\":" + triangles
                    + ",\"details\":" + details
                    + "}";
        }
    }

    private record BatchTerrainResult(int chunkX, int chunkZ, TerrainResult terrain, String error) {
    }

    private record TerrainBatchSummary(
            int ok,
            int errors,
            int generated,
            int disk,
            int memory,
            long bytes,
            long columns,
            long vertices,
            long triangles,
            long details) {
    }

    private record TerrainMetadata(int columns, int vertices, int triangles, int details) {
        private static final Pattern COLUMNS_PATTERN = Pattern.compile("\"columns\"\\s*:\\s*(-?\\d+)");
        private static final Pattern VERTICES_PATTERN = Pattern.compile("\"vertices\"\\s*:\\s*(-?\\d+)");
        private static final Pattern TRIANGLES_PATTERN = Pattern.compile("\"triangles\"\\s*:\\s*(-?\\d+)");
        private static final Pattern DETAILS_META_PATTERN = Pattern.compile("\"details\"\\s*:\\s*(-?\\d+)");

        static TerrainMetadata parse(@Nonnull String json) {
            return new TerrainMetadata(
                    findInt(COLUMNS_PATTERN, json, "columns"),
                    findInt(VERTICES_PATTERN, json, "vertices"),
                    findInt(TRIANGLES_PATTERN, json, "triangles"),
                    findInt(DETAILS_META_PATTERN, json, "details"));
        }
    }

    private record DiskStats(long files, long bytes) {
        static DiskStats empty() {
            return new DiskStats(0, 0);
        }
    }
}
