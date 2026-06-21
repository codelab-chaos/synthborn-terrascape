package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.PlayerLookTracker;
import com.codelabchaos.terrascape.access.AccessGate;
import com.codelabchaos.terrascape.access.AccessTokens;
import com.codelabchaos.terrascape.config.ServerControls;

import static com.codelabchaos.terrascape.web.Json.escapeJson;
import static com.codelabchaos.terrascape.web.Json.findInt;
import static com.codelabchaos.terrascape.web.Json.findString;
import static com.codelabchaos.terrascape.web.HttpResponses.acceptsGzip;
import static com.codelabchaos.terrascape.web.HttpResponses.contentType;
import static com.codelabchaos.terrascape.web.HttpResponses.gzip;
import static com.codelabchaos.terrascape.web.HttpResponses.writeBytes;
import static com.codelabchaos.terrascape.web.HttpResponses.writeCacheableBytes;
import static com.codelabchaos.terrascape.web.HttpResponses.writeJson;
import static com.codelabchaos.terrascape.web.HttpResponses.writeText;
import static com.codelabchaos.terrascape.web.QueryParams.decode;
import static com.codelabchaos.terrascape.web.QueryParams.firstNonBlank;
import static com.codelabchaos.terrascape.web.QueryParams.queryFlag;
import static com.codelabchaos.terrascape.web.QueryParams.queryParam;
import static com.codelabchaos.terrascape.web.QueryParams.safeName;
import static com.codelabchaos.terrascape.web.MobTaxonomy.categoryForMob;
import static com.codelabchaos.terrascape.web.MobTaxonomy.colorForMob;
import static com.codelabchaos.terrascape.web.MobTaxonomy.fallbackMobColor;
import static com.codelabchaos.terrascape.web.MobTaxonomy.isSpawnMarkerType;
import static com.codelabchaos.terrascape.web.MobTaxonomy.labelFromAssetId;
import static com.codelabchaos.terrascape.web.EntityFields.*;
import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.codelabchaos.terrascape.terrain.GltfWriter;
import com.codelabchaos.terrascape.terrain.TerrainDetail;
import com.codelabchaos.terrascape.terrain.TerrainMesh;
import com.codelabchaos.terrascape.terrain.TerrainMesher;
import com.codelabchaos.terrascape.terrain.TerrainSampler;
import com.codelabchaos.terrascape.terrain.TerrainSnapshot;
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

public final class TerrascapeWebServer {
    private static final int MAP_REGION_TILE_SIZE = 32;
    private static final String MAP_REGION_CACHE_CONTROL = "public, max-age=31536000, immutable";
    // Per-chunk map tiles and meshes are served from the server cache via predictable URLs; let
    // the browser HTTP-cache them too (moderate TTL balances staleness on changing worlds; dirty
    // chunks will need explicit busting later).
    private static final String MAP_TILE_CACHE_CONTROL = "public, max-age=43200";
    private static final String MESH_CACHE_CONTROL = "public, max-age=43200";
    private static final Duration MAP_REGION_TIMEOUT = Duration.ofSeconds(60);
    private static final int MAP_REGION_GENERATE_RADIUS = 20;
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
    static final int MAX_MOB_DEBUG_SUMMARY_ITEMS = 32;
    static final int MAX_MOB_SNAPSHOTS = 256;
    static final double MOB_RADAR_RADIUS = 500.0d;
    static final double MOB_RADAR_RADIUS_SQ = MOB_RADAR_RADIUS * MOB_RADAR_RADIUS;
    private static final long ENTITY_STREAM_INTERVAL_MS = 1000L;
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

    private final TerrascapePlugin plugin;
    private final TerrascapeConfig config;
    private final AccessGate accessGate;
    private final CorsPolicy cors;
    private final ServerControls serverControls;
    private final String host;
    private final int port;
    private final boolean experimentalDetailsEnabled;
    private final NpcRoleIndex npcRoleIndex;
    private final HttpServer server;
    private final ExecutorService staticHttpExecutor = Executors.newFixedThreadPool(STATIC_HTTP_THREADS, runnable -> {
        Thread thread = new Thread(runnable, "Terrascape-http-static");
        thread.setDaemon(true);
        return thread;
    });
    private final ExecutorService apiHttpExecutor = Executors.newFixedThreadPool(API_HTTP_THREADS, runnable -> {
        Thread thread = new Thread(runnable, "Terrascape-http-api");
        thread.setDaemon(true);
        return thread;
    });
    private final Semaphore generationPermits;
    private final ConcurrentHashMap<String, CompletableFuture<TerrainResult>> pendingTerrain = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<MapRegionResult>> pendingMapRegions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<BufferedImage>> pendingMapTiles = new ConcurrentHashMap<>();
    private final MeshCache meshCache;
    private final MapRegionCache mapRegionCache;
    private final MapTileCache mapTileCache;
    private final AvatarService avatarService;
    private final AssetLocator assetLocator;
    private final MobScanner mobScanner;
    private final AtomicInteger activeGenerations = new AtomicInteger();
    private final AtomicLong singleRequests = new AtomicLong();
    private final AtomicLong batchRequests = new AtomicLong();
    private final AtomicLong generatedChunks = new AtomicLong();
    private final AtomicLong coalescedRequests = new AtomicLong();
    private final AtomicLong failedGenerations = new AtomicLong();

    public TerrascapeWebServer(
            @Nonnull TerrascapePlugin plugin,
            @Nonnull TerrascapeConfig config,
            @Nonnull NpcRoleIndex npcRoleIndex
    ) throws IOException {
        this.plugin = plugin;
        this.config = config;
        this.accessGate = new AccessGate(plugin.accessTokens(), () -> config.access().restricted());
        this.cors = new CorsPolicy(config.cors());
        this.meshCache = new MeshCache(config, plugin);
        this.mapRegionCache = new MapRegionCache(config, plugin);
        this.mapTileCache = new MapTileCache(config, plugin);
        this.avatarService = new AvatarService(config, plugin);
        this.assetLocator = new AssetLocator(config, plugin);
        this.mobScanner = new MobScanner(config, plugin, npcRoleIndex);
        this.serverControls = ServerControls.load(config.configPath().getParent(),
                message -> plugin.getLogger().at(Level.WARNING).log(message));
        this.host = config.http().host();
        this.port = config.http().port();
        this.experimentalDetailsEnabled = config.features().experimentalDetails();
        this.npcRoleIndex = npcRoleIndex;
        this.generationPermits = new Semaphore(config.mesh().maxConcurrentGenerations());
        this.server = HttpServer.create(new InetSocketAddress(host, port), 0);
        this.server.createContext("/api/worlds", onApi(this::handleWorlds));
        this.server.createContext("/api/players", onApi(this::handlePlayers));
        this.server.createContext("/api/player-avatar", onApi(this::handlePlayerAvatar));
        this.server.createContext("/api/time", onApi(this::handleTime));
        this.server.createContext("/api/metrics", onApi(this::handleMetrics));
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
        plugin.getLogger().at(Level.INFO).log("Terrascape listening on http://" + host + ":" + port);
    }

    public void stop() {
        server.stop(0);
        staticHttpExecutor.shutdownNow();
        apiHttpExecutor.shutdownNow();
    }

    private HttpHandler onStatic(@Nonnull HttpHandler handler) {
        return exchange -> staticHttpExecutor.execute(() -> {
            try {
                if (!gatePassed(exchange)) {
                    writeAccessRequiredPage(exchange);
                    return;
                }
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
                // Answer CORS preflight centrally and without auth — preflight carries no credentials
                // and must succeed for the real request to be sent.
                if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                    cors.applyPreflight(exchange);
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }
                cors.apply(exchange);
                if (!gatePassed(exchange)) {
                    writeJson(exchange, 401, "{\"ok\":false,\"error\":\"access_required\"}");
                    return;
                }
                handler.handle(exchange);
            } catch (IOException error) {
                plugin.getLogger().at(Level.WARNING).withCause(error).log(
                        "API request failed: " + exchange.getRequestURI().getPath());
            }
        });
    }

    /**
     * Outer access check shared by every endpoint. Passes when restricted mode is off, when the
     * request carries a valid access token, or when a configured admin token is presented (so
     * server-side monitoring keeps working in restricted mode).
     */
    private boolean gatePassed(@Nonnull HttpExchange exchange) {
        return accessGate.authorize(exchange) || adminTokenMatches(exchange);
    }

    private void writeAccessRequiredPage(@Nonnull HttpExchange exchange) throws IOException {
        String html = "<!doctype html><meta charset=\"utf-8\">"
                + "<title>Terrascape - access required</title>"
                + "<body style=\"font-family:system-ui,sans-serif;background:#0d1117;color:#c9d1d9;"
                + "display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0\">"
                + "<div style=\"text-align:center;max-width:30rem;padding:2rem\">"
                + "<h1 style=\"font-size:1.25rem\">Access required</h1>"
                + "<p>This map is in restricted mode. Ask a server admin for an access link, then run "
                + "<code>/terrascape maplink</code> in-game to generate your own.</p></div></body>";
        writeText(exchange, 401, html, "text/html; charset=utf-8");
    }

    public String address() {
        return "http://" + host + ":" + port;
    }

    public Metrics metrics() {
        DiskStats diskStats = meshCache.scanDisk();
        return new Metrics(
                singleRequests.get(),
                batchRequests.get(),
                generatedChunks.get(),
                meshCache.memoryHits(),
                meshCache.diskHits(),
                coalescedRequests.get(),
                failedGenerations.get(),
                activeGenerations.get(),
                pendingTerrain.size(),
                config.mesh().maxConcurrentGenerations(),
                meshCache.memorySize(),
                meshCache.memoryBytes(),
                config.cache().memoryTerrainEntries(),
                config.cache().memoryTerrainBytes(),
                diskStats.files(),
                diskStats.bytes());
    }

    public MemoryCacheStats clearMemoryCache() {
        return meshCache.clear();
    }

    /** Clears the in-memory map tile cache; returns the number of tile entries evicted. */
    public int clearMapTileCache() {
        return mapTileCache.clear();
    }

    private void handleWorlds(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }

        Universe universe = Universe.get();
        String worlds = universe == null ? "" : universe.getWorlds().values().stream()
                .map(World::getName)
                .filter(config.worlds()::allows)
                .sorted()
                .map(name -> "{\"name\":\"" + escapeJson(name) + "\"}")
                .collect(Collectors.joining(","));
        writeJson(exchange, 200, "{\"ok\":true,\"features\":{\"experimentalDetails\":" + experimentalDetailsEnabled
                + ",\"terrainFormatVersion\":\"" + config.mesh().terrainFormatVersion() + "\""
                + "},\"clientControls\":" + serverControls.toClientJson()
                + ",\"worlds\":[" + worlds + "]}");
    }

    private void handleClientLog(@Nonnull HttpExchange exchange) throws IOException {
        if (!config.features().clientTelemetry()) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"client_telemetry_disabled\"}");
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
        if (!serverControls.showPlayers()) {
            writeJson(exchange, 200, "{\"ok\":true,\"players\":[]}");
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
        if (!config.features().playerAvatars()) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }
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
        byte[] bytes = avatarService.readOrFetch(uuid, username, skinKey);
        if (bytes == null || bytes.length == 0) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }

        writeCacheableBytes(exchange, 200, bytes, "image/png", "public, max-age=43200");
    }

    private void handleMetrics(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"ok\":false,\"error\":\"method_not_allowed\"}");
            return;
        }
        if (!config.features().metricsEndpoint()) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"metrics_disabled\"}");
            return;
        }
        com.sun.management.OperatingSystemMXBean os =
                (com.sun.management.OperatingSystemMXBean) java.lang.management.ManagementFactory.getOperatingSystemMXBean();
        java.lang.management.MemoryUsage heap =
                java.lang.management.ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        int threads = java.lang.management.ManagementFactory.getThreadMXBean().getThreadCount();
        writeJson(exchange, 200, "{\"ok\":true"
                + ",\"processCpuLoad\":" + os.getProcessCpuLoad()
                + ",\"systemCpuLoad\":" + os.getCpuLoad()
                + ",\"availableProcessors\":" + os.getAvailableProcessors()
                + ",\"heapUsedBytes\":" + heap.getUsed()
                + ",\"heapMaxBytes\":" + heap.getMax()
                + ",\"heapCommittedBytes\":" + heap.getCommitted()
                + ",\"threads\":" + threads
                + ",\"timestampMs\":" + System.currentTimeMillis()
                + "}");
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
        if (!serverControls.showMobs()) {
            writeJson(exchange, 200, "{\"ok\":true,\"mobs\":[]}");
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
                future.complete(mobScanner.snapshotMobs(world));
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
        if (!config.features().mobDebugEndpoint()) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"mob_debug_disabled\"}");
            return;
        }
        if (!isAdminAuthorized(exchange)) {
            writeJson(exchange, 403, "{\"ok\":false,\"error\":\"admin_authorization_required\"}");
            return;
        }
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
                future.complete(mobScanner.mobDebugJson(world));
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
        if (!config.features().entityStream()) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"entity_stream_disabled\"}");
            return;
        }
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
                    Thread.sleep(config.entities().streamInterval().toMillis());
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
            exchange.getResponseHeaders().set("X-Terrascape-Map-Region-Chunks", Integer.toString(chunkCount));
            exchange.getResponseHeaders().set("X-Terrascape-Map-Region-Tile-Size", Integer.toString(config.mapView().tileSize()));
            exchange.getResponseHeaders().set("X-Terrascape-Map-Region-Millis", Long.toString(elapsedMillis));
            exchange.getResponseHeaders().set("X-Terrascape-Map-Region-Cache", result.source());
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.getResponseHeaders().set("Cache-Control", MAP_REGION_CACHE_CONTROL);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(bytes);
            }
            plugin.getLogger().at(Level.INFO).log("map-region world=" + world.getName()
                    + " center=" + request.centerX() + "," + request.centerZ()
                    + " radius=" + request.radius()
                    + " chunks=" + (chunkCount * chunkCount)
                    + " pixels=" + (chunkCount * config.mapView().tileSize()) + "x" + (chunkCount * config.mapView().tileSize())
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

        TerrainRequest request = parseTerrainRequest(
                exchange.getRequestURI().getPath(),
                exchange.getRequestURI().getRawQuery(),
                experimentalDetailsEnabled);
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
            exchange.getResponseHeaders().set("Cache-Control", MESH_CACHE_CONTROL);
            exchange.getResponseHeaders().set("X-Terrascape-Columns", Integer.toString(result.columns()));
            exchange.getResponseHeaders().set("X-Terrascape-Vertices", Integer.toString(result.vertices()));
            exchange.getResponseHeaders().set("X-Terrascape-Triangles", Integer.toString(result.triangles()));
            exchange.getResponseHeaders().set("X-Terrascape-Details", Integer.toString(result.details()));
            if (!result.detailKeys().isBlank()) {
                exchange.getResponseHeaders().set("X-Terrascape-Detail-Keys", result.detailKeys());
            }
            exchange.getResponseHeaders().set("X-Terrascape-Cache", result.source());
            byte[] body = result.glb();
            if (acceptsGzip(exchange)) {
                body = gzip(body);
                exchange.getResponseHeaders().set("Content-Encoding", "gzip");
            }
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(body);
            }
            plugin.getLogger().at(Level.FINE).log("terrain-single world=" + world.getName()
                    + " chunk=" + request.chunkX() + "," + request.chunkZ()
                    + " cache=" + result.source()
                    + " bytes=" + result.glb().length
                    + " columns=" + result.columns()
                    + " vertices=" + result.vertices()
                    + " triangles=" + result.triangles()
                    + " details=" + result.details()
                    + (result.detailKeys().isBlank() ? "" : " detailKeys=" + result.detailKeys())
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
            exchange.getResponseHeaders().set("Cache-Control", MAP_TILE_CACHE_CONTROL);
            exchange.getResponseHeaders().set("X-Terrascape-Cache", result.source());
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
        json.append("{\"ok\":true,\"asset\":\"map\",\"maxBatchChunks\":").append(config.mesh().maxBatchChunks()).append(",\"chunks\":[");
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
        byte[] diskCached = mapTileCache.readTerrainDisk(request);
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
        mapTileCache.writeTerrainDisk(request, png);
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
            request = parseBatchTerrainRequest(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8), config.mesh().maxBatchChunks());
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
            json.append("{\"ok\":true,\"asset\":\"mesh\",\"maxBatchChunks\":").append(config.mesh().maxBatchChunks()).append(",\"chunks\":[");
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
        TerrainResult memoryCached = meshCache.readMemory(key);
        if (memoryCached != null) {
            return memoryCached.withSource("memory");
        }

        TerrainResult diskCached = meshCache.readDisk(request);
        if (diskCached != null) {
            meshCache.putMemory(key, diskCached);
            return diskCached.withSource("disk");
        }

        CompletableFuture<TerrainResult> future = new CompletableFuture<>();
        CompletableFuture<TerrainResult> existing = pendingTerrain.putIfAbsent(key, future);
        if (existing != null) {
            coalescedRequests.incrementAndGet();
            return existing.get(config.mesh().terrainTimeout().toMillis(), TimeUnit.MILLISECONDS);
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
                TerrainSnapshot snapshot = TerrainSampler.sample(
                        world,
                        request.chunkX(),
                        request.chunkZ(),
                        request.hasCosmeticDetails(),
                        request.visualDetailMode());
                CompletableFuture.runAsync(() -> {
                    try {
                        TerrainMesh mesh = request.cosmeticsOnly()
                                ? TerrainMesher.cosmeticMesh(snapshot)
                                : TerrainMesher.mesh(snapshot, request.includeDetails());
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
        TerrainResult result = future.get(config.mesh().terrainTimeout().toMillis(), TimeUnit.MILLISECONDS);
        meshCache.putMemory(key, result);
        meshCache.writeDisk(request, result);
        return result;
    }

    private List<BatchTerrainResult> generateTerrainBatch(@Nonnull World world, @Nonnull BatchTerrainRequest request) throws Exception {
        List<BatchTerrainResult> results = new ArrayList<>(request.chunks().size());
        long deadline = System.nanoTime() + config.mesh().batchTerrainTimeout().toNanos();
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
                        experimentalDetailsEnabled,
                        false,
                        false,
                        TerrainSampler.VisualDetailMode.BASIC);
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
        String key = request.key(config.mapView().tileSize());
        byte[] memoryCached = mapRegionCache.readMemory(key);
        if (memoryCached != null) {
            return new MapRegionResult(memoryCached, "memory");
        }

        byte[] diskCached = mapRegionCache.readDisk(request);
        if (diskCached != null) {
            mapRegionCache.putMemory(key, diskCached);
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
                mapRegionCache.putMemory(key, bytes);
                mapRegionCache.writeDisk(request, bytes);
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
        int tileSize = config.mapView().tileSize();
        int outputSize = chunkCount * tileSize;
        BufferedImage composite = new BufferedImage(outputSize, outputSize, BufferedImage.TYPE_INT_ARGB);
        List<CompletableFuture<Void>> futures = new ArrayList<>(chunkCount * chunkCount);
        int minChunkX = request.centerX() - request.radius();
        int minChunkZ = request.centerZ() - request.radius();
        AtomicInteger missingCacheOnlyTiles = new AtomicInteger();

        for (int dz = 0; dz < chunkCount; dz++) {
            for (int dx = 0; dx < chunkCount; dx++) {
                int chunkX = minChunkX + dx;
                int chunkZ = minChunkZ + dz;
                int outputX = dx * tileSize;
                int outputY = dz * tileSize;
                boolean allowGenerate = Math.max(
                        Math.abs(chunkX - request.centerX()),
                        Math.abs(chunkZ - request.centerZ())) <= config.mapView().generateRadius();
                futures.add(getMapTileImage(mapManager, world.getName(), chunkX, chunkZ, allowGenerate)
                        .thenAccept(tile -> {
                            if (tile == null) {
                                missingCacheOnlyTiles.incrementAndGet();
                                return;
                            }
                            drawCachedMapRegionTile(composite, tile, outputX, outputY, tileSize);
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

    private void drawMapRegionTile(@Nonnull BufferedImage composite, @Nullable MapImage mapImage,
                                   int outputX, int outputY) {
        if (mapImage == null || mapImage.palette == null || mapImage.packedIndices == null
                || mapImage.width <= 0 || mapImage.height <= 0) {
            return;
        }
        synchronized (composite) {
            MapTilePngEncoder.drawMapImage(composite, mapImage, outputX, outputY, config.mapView().tileSize());
        }
    }

    private static void drawCachedMapRegionTile(@Nonnull BufferedImage composite, @Nullable BufferedImage tile,
                                                int outputX, int outputY, int tileSize) {
        if (tile == null) {
            return;
        }
        synchronized (composite) {
            Graphics2D graphics = composite.createGraphics();
            try {
                graphics.drawImage(tile, outputX, outputY, tileSize, tileSize, null);
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
            case "/dist/terrascape.js" -> "/web/dist/terrascape.js";
            case "/styles.css" -> "/web/styles.css";
            case "/textures/waternormals.jpg" -> "/web/textures/waternormals.jpg";
            default -> moduleResourcePath(requestPath);
        };

        if (resourcePath == null) {
            writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
            return;
        }

        try (InputStream input = TerrascapeWebServer.class.getResourceAsStream(resourcePath)) {
            if (input == null) {
                writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
                return;
            }
            byte[] bytes = input.readAllBytes();
            writeBytes(exchange, 200, bytes, contentType(resourcePath));
        }
    }

    private CompletableFuture<BufferedImage> getMapTileImage(
            @Nonnull WorldMapManager mapManager,
            @Nonnull String worldName,
            int chunkX,
            int chunkZ,
            boolean allowGenerate) {
        String key = mapTileCache.key(worldName, chunkX, chunkZ);
        BufferedImage memoryCached = mapTileCache.readMemory(key);
        if (memoryCached != null) {
            return CompletableFuture.completedFuture(memoryCached);
        }

        BufferedImage diskCached = mapTileCache.readDisk(worldName, chunkX, chunkZ);
        if (diskCached != null) {
            mapTileCache.putMemory(key, diskCached);
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
                                config.mapView().tileSize(),
                                config.mapView().tileSize(),
                                BufferedImage.TYPE_INT_RGB);
                        drawMapRegionTile(tile, mapImage, 0, 0);
                        mapTileCache.putMemory(key, tile);
                        mapTileCache.writeDisk(worldName, chunkX, chunkZ, tile);
                        future.complete(tile);
                    } catch (Exception e) {
                        future.completeExceptionally(e);
                    } finally {
                        pendingMapTiles.remove(key, future);
                    }
                });
        return future;
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

    private static TerrainRequest parseTerrainRequest(@Nonnull String path, @Nullable String rawQuery, boolean includeDetails) {
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
        String cosmeticsParam = queryParam(rawQuery, "cosmetics");
        boolean cosmeticsOnly = includeDetails && "only".equalsIgnoreCase(cosmeticsParam);
        boolean includeCosmetics = includeDetails && (cosmeticsOnly || queryFlag(rawQuery, "cosmetics"));
        TerrainSampler.VisualDetailMode visualDetailMode = TerrainSampler.VisualDetailMode.fromQuery(queryParam(rawQuery, "visualDetail"));
        return new TerrainRequest(decode(parts[0]), chunkX, chunkZ, includeDetails, includeCosmetics, cosmeticsOnly, visualDetailMode);
    }

    private MapRegionRequest parseMapRegionRequest(@Nonnull String path) {
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
                Math.max(0, Math.min(config.mapView().maxRegionRadius(), radius)));
    }

    private static BatchTerrainRequest parseBatchTerrainRequest(@Nonnull String body, int maxBatchChunks) {
        String worldName = findString(WORLD_PATTERN, body, "world");
        List<ChunkCoord> chunks = new ArrayList<>();
        Matcher matcher = CHUNK_OBJECT_PATTERN.matcher(body);
        while (matcher.find()) {
            String object = matcher.group();
            if (!CHUNK_X_PATTERN.matcher(object).find() || !CHUNK_Z_PATTERN.matcher(object).find()) {
                continue;
            }
            if (chunks.size() >= maxBatchChunks) {
                throw new IllegalArgumentException("batch_too_large_max_" + maxBatchChunks);
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

    private World findWorld(@Nonnull String worldName) {
        if (!config.worlds().allows(worldName)) {
            return null;
        }
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
                PlayerLookTracker tracker = TerrascapePlugin.get() == null
                        ? null
                        : TerrascapePlugin.get().playerLookTracker();
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


    private String snapshotEntitiesForStream(@Nonnull World world, boolean includePlayers, boolean includeMobs) {
        CompletableFuture<String> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                List<PlayerSnapshot> players = includePlayers ? snapshotPlayers(world) : List.of();
                MobFeedSnapshot mobFeed = includeMobs ? mobScanner.snapshotMobs(world) : MobFeedSnapshot.empty();
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
        byte[] bytes = assetLocator.readOrCacheGeneratedMobIcon(fileName);
        if (bytes != null) {
            writeBytes(exchange, 200, bytes, "image/png");
            return true;
        }

        String resourcePath = "/web/mob-icons/" + fileName;
        try (InputStream input = TerrascapeWebServer.class.getResourceAsStream(resourcePath)) {
            if (input != null) {
                writeBytes(exchange, 200, input.readAllBytes(), "image/png");
                return true;
            }
        }

        writeText(exchange, 404, "not found", "text/plain; charset=utf-8");
        return true;
    }

    private String entityFeedJson(@Nonnull World world,
                                  @Nonnull List<PlayerSnapshot> players,
                                  @Nonnull MobFeedSnapshot mobFeed) {
        String playerJson = players.stream()
                .map(PlayerSnapshot::toJson)
                .collect(Collectors.joining(","));
        String mobJson = mobFeed.mobs().stream()
                .map(MobSnapshot::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\""
                + ",\"intervalMs\":" + config.entities().streamInterval().toMillis()
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



    private static Integer parseInt(@Nonnull String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean isAdminRequest(@Nonnull HttpExchange exchange) {
        String expected = config.security().adminToken();
        if (expected.isBlank()) {
            return true;
        }
        return adminTokenMatches(exchange);
    }

    /**
     * Authorizes an admin-only endpoint. Satisfied by the shared admin token (the existing
     * mechanism, which also treats a blank/unconfigured token as open) or by a session whose access
     * token carries the {@link AccessTokens#SCOPE_ADMIN} scope — i.e. one minted by a player holding
     * {@code terrascape.admin}. This is how a web client's API permissions follow the player's
     * in-game permissions without sharing a static token.
     */
    private boolean isAdminAuthorized(@Nonnull HttpExchange exchange) {
        return isAdminRequest(exchange) || AccessGate.hasScope(exchange, AccessTokens.SCOPE_ADMIN);
    }

    /**
     * Strict admin-token check: true only when an admin token is configured <i>and</i> presented.
     * Unlike {@link #isAdminRequest} it does not treat a blank/unconfigured token as a match, so it
     * is safe to use as an access-gate bypass.
     */
    private boolean adminTokenMatches(@Nonnull HttpExchange exchange) {
        String expected = config.security().adminToken();
        if (expected.isBlank()) {
            return false;
        }
        String headerToken = exchange.getRequestHeaders().getFirst("X-Terrascape-Admin-Token");
        if (expected.equals(headerToken)) {
            return true;
        }
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        return authorization != null && authorization.equals("Bearer " + expected);
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

}
