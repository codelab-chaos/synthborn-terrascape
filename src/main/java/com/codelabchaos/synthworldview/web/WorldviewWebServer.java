package com.codelabchaos.synthworldview.web;

import com.codelabchaos.synthworldview.SynthWorldviewPlugin;
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
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.math.vector.Transform;
import com.hypixel.hytale.server.core.entity.Entity;
import com.hypixel.hytale.server.core.entity.EntityUtils;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.entity.entities.ProjectileComponent;
import com.hypixel.hytale.server.core.modules.entity.EntityModule;
import com.hypixel.hytale.server.core.modules.entity.component.ModelComponent;
import com.hypixel.hytale.server.core.modules.entity.component.PersistentModel;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.modules.time.TimeModule;
import com.hypixel.hytale.server.core.modules.time.WorldTimeResource;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.npc.entities.NPCEntity;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.joml.Vector3d;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
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

public final class WorldviewWebServer {
    private static final String FORMAT_VERSION = "v10";
    private static final boolean LOD_ENABLED = false;
    private static final Duration TERRAIN_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration BATCH_TERRAIN_TIMEOUT = Duration.ofSeconds(45);
    private static final int MAX_BATCH_CHUNKS = 8;
    private static final int MAX_CONCURRENT_GENERATIONS = 1;
    private static final int MAX_MEMORY_CACHE_ENTRIES = 128;
    private static final long MAX_MEMORY_CACHE_BYTES = 128L * 1024L * 1024L;
    private static final int MAX_MOB_SNAPSHOTS = 256;
    private static final double MOB_RADAR_RADIUS = 500.0d;
    private static final double MOB_RADAR_RADIUS_SQ = MOB_RADAR_RADIUS * MOB_RADAR_RADIUS;
    private static final Pattern WORLD_PATTERN = Pattern.compile("\"world\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern LOD_PATTERN = Pattern.compile("\"lod\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_OBJECT_PATTERN = Pattern.compile("\\{[^{}]*}");
    private static final Pattern CHUNK_X_PATTERN = Pattern.compile("\"chunkX\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_Z_PATTERN = Pattern.compile("\"chunkZ\"\\s*:\\s*(-?\\d+)");

    private final SynthWorldviewPlugin plugin;
    private final String host;
    private final int port;
    private final boolean experimentalDetailsEnabled;
    private final HttpServer server;
    private final Semaphore generationPermits = new Semaphore(MAX_CONCURRENT_GENERATIONS);
    private final ConcurrentHashMap<String, CompletableFuture<TerrainResult>> pendingTerrain = new ConcurrentHashMap<>();
    private final Object memoryCacheLock = new Object();
    private final LinkedHashMap<String, TerrainResult> memoryCache = new LinkedHashMap<>(32, 0.75f, true);
    private long memoryCacheBytes;
    private final AtomicInteger activeGenerations = new AtomicInteger();
    private final AtomicLong singleRequests = new AtomicLong();
    private final AtomicLong batchRequests = new AtomicLong();
    private final AtomicLong generatedChunks = new AtomicLong();
    private final AtomicLong memoryCacheHits = new AtomicLong();
    private final AtomicLong diskCacheHits = new AtomicLong();
    private final AtomicLong coalescedRequests = new AtomicLong();
    private final AtomicLong failedGenerations = new AtomicLong();
    private final AtomicLong lastMobDebugLogMillis = new AtomicLong();

    public WorldviewWebServer(@Nonnull SynthWorldviewPlugin plugin, @Nonnull String host, int port,
                              boolean experimentalDetailsEnabled) throws IOException {
        this.plugin = plugin;
        this.host = host;
        this.port = port;
        this.experimentalDetailsEnabled = experimentalDetailsEnabled;
        this.server = HttpServer.create(new InetSocketAddress(host, port), 0);
        this.server.createContext("/api/worlds", this::handleWorlds);
        this.server.createContext("/api/players", this::handlePlayers);
        this.server.createContext("/api/time", this::handleTime);
        this.server.createContext("/api/mobs", this::handleMobs);
        this.server.createContext("/api/terrain", this::handleTerrain);
        this.server.createContext("/", this::handleStatic);
        this.server.setExecutor(Executors.newFixedThreadPool(4, runnable -> {
            Thread thread = new Thread(runnable, "SynthWorldview-http");
            thread.setDaemon(true);
            return thread;
        }));
    }

    public void start() {
        server.start();
        plugin.getLogger().at(Level.INFO).log("SynthWorldview listening on http://" + host + ":" + port);
    }

    public void stop() {
        server.stop(0);
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
                + "},\"worlds\":[" + worlds + "]}");
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
        writeJson(exchange, 410, "{\"ok\":false,\"error\":\"mob_feed_disabled\"}");
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

        TerrainRequest request = parseTerrainRequest(exchange.getRequestURI().getPath(), experimentalDetailsEnabled);
        if (request == null) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb\"}");
            return;
        }
        if (!LOD_ENABLED && request.lod() > 0) {
            writeJson(exchange, 410, "{\"ok\":false,\"error\":\"lod_disabled\"}");
            return;
        }

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            singleRequests.incrementAndGet();
            TerrainResult result = generateTerrain(world, request);

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
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Terrain request failed: " + request);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
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
        if (!LOD_ENABLED && request.lod() > 0) {
            writeJson(exchange, 410, "{\"ok\":false,\"error\":\"lod_disabled\"}");
            return;
        }

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            batchRequests.incrementAndGet();
            List<BatchTerrainResult> results = generateTerrainBatch(world, request);
            StringBuilder json = new StringBuilder(256 + results.size() * 256);
            json.append("{\"ok\":true,\"maxBatchChunks\":").append(MAX_BATCH_CHUNKS).append(",\"chunks\":[");
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
                        TerrainMesh mesh = TerrainMesher.mesh(snapshot, request.includeDetails(), request.lod());
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
                        request.lod(),
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

    private void handleStatic(@Nonnull HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeText(exchange, 405, "method not allowed", "text/plain; charset=utf-8");
            return;
        }

        String requestPath = exchange.getRequestURI().getPath();
        String resourcePath = switch (requestPath) {
            case "/", "/index.html" -> "/web/index.html";
            case "/app.js" -> "/web/app.js";
            case "/styles.css" -> "/web/styles.css";
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
                .resolve("lod-" + request.lod() + (request.includeDetails() ? "-details" : ""))
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
        if (!requestPath.matches("/[A-Za-z0-9_-]+\\.js")) {
            return null;
        }
        return "/web" + requestPath;
    }

    private static TerrainRequest parseTerrainRequest(@Nonnull String path, boolean includeDetails) {
        String prefix = "/api/terrain/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String[] parts = path.substring(prefix.length()).split("/");
        if (parts.length != 4 || !parts[3].endsWith(".glb")) {
            return null;
        }
        Integer lod = parseInt(parts[1]);
        Integer chunkX = parseInt(parts[2]);
        Integer chunkZ = parseInt(parts[3].substring(0, parts[3].length() - 4));
        if (lod == null || chunkX == null || chunkZ == null) {
            return null;
        }
        return new TerrainRequest(decode(parts[0]), lod, chunkX, chunkZ, includeDetails);
    }

    private static BatchTerrainRequest parseBatchTerrainRequest(@Nonnull String body) {
        String worldName = findString(WORLD_PATTERN, body, "world");
        Integer lod = findInt(LOD_PATTERN, body, "lod");
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
        return new BatchTerrainRequest(worldName, lod, chunks);
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
                Rotation3f rotation = transform.getRotation();
                players.add(new PlayerSnapshot(
                        playerRef.getUuid().toString(),
                        playerRef.getUsername(),
                        position.x,
                        position.y,
                        position.z,
                        rotation == null ? 0.0f : rotation.yaw()));
            } catch (Exception ignored) {
                // Player may disconnect while the world-thread snapshot is being copied.
            }
        }
        return players;
    }

    private List<MobSnapshot> snapshotMobs(@Nonnull World world) {
        Store<EntityStore> store = world.getEntityStore().getStore();
        Query<EntityStore> npcQuery = Archetype.of(NPCEntity.getComponentType());
        List<Vector3d> playerPositions = playerPositionsForMobRadar(world);
        List<MobCandidate> candidates = new ArrayList<>();
        MobScanStats stats = new MobScanStats();
        Set<Integer> seenRefs = new HashSet<>();
        BiPredicate<ArchetypeChunk<EntityStore>, CommandBuffer<EntityStore>> collector = (chunk, ignored) -> {
            collectMobSnapshots(store, chunk, candidates, stats, seenRefs, playerPositions);
            return true;
        };
        if (!playerPositions.isEmpty()) {
            store.forEachChunk(npcQuery, collector);
        }
        List<MobSnapshot> mobs = candidates.stream()
                .sorted(Comparator.comparingDouble(MobCandidate::distanceSq))
                .limit(MAX_MOB_SNAPSHOTS)
                .map(MobCandidate::snapshot)
                .toList();
        logMobScan(world, store, stats, mobs);
        return mobs;
    }

    private static void collectMobSnapshots(@Nonnull Store<EntityStore> store,
                                            @Nonnull ArchetypeChunk<EntityStore> chunk,
                                            @Nonnull List<MobCandidate> candidates,
                                            @Nonnull MobScanStats stats,
                                            @Nonnull Set<Integer> seenRefs,
                                            @Nonnull List<Vector3d> playerPositions) {
        stats.chunks++;
        stats.addArchetype(chunk.getArchetype().toString());
        for (int index = 0; index < chunk.size(); index++) {
            stats.entities++;
            try {
                Ref<EntityStore> ref = chunk.getReferenceTo(index);
                if (ref == null || !ref.isValid()) {
                    stats.invalidRefs++;
                    continue;
                }
                if (!seenRefs.add(ref.getIndex())) {
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
                    stats.skippedNonMobs++;
                    continue;
                }
                candidates.add(new MobCandidate(distanceSq, new MobSnapshot(
                        Integer.toString(ref.getIndex()),
                        type,
                        safeMobRole(npc, entity, type),
                        position.x,
                        position.y,
                        position.z,
                        colorForMob(type))));
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
        if (mobs.isEmpty() && now - last < 5_000L) {
            return;
        }
        if (!lastMobDebugLogMillis.compareAndSet(last, now) && mobs.isEmpty()) {
            return;
        }

        String firstMob = mobs.isEmpty() ? "none" : mobs.stream()
                .limit(5)
                .map(mob -> mob.type() + "@" + Math.round(mob.x()) + "," + Math.round(mob.y()) + "," + Math.round(mob.z()))
                .collect(Collectors.joining(";"));
        plugin.getLogger().at(Level.INFO).log("[mob-feed] world=" + world.getName()
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
                + " types=" + stats.preview(stats.acceptedTypes)
                + " archetypes=" + stats.preview(stats.archetypes)
                + " first=" + firstMob
                + " nearby=" + nearbyTransformPreview(world, store));
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
        return chunk.getComponent(index, ItemComponent.getComponentType()) != null
                || chunk.getComponent(index, ProjectileComponent.getComponentType()) != null
                || chunk.getComponent(index, BlockEntity.getComponentType()) != null;
    }

    private static boolean isSpawnMarkerType(@Nonnull String type) {
        String normalized = type.toLowerCase();
        return normalized.contains("spawn_marker")
                || normalized.contains("spawnmark")
                || normalized.contains("spawn_mark");
    }

    private static String safeMobType(@Nonnull ArchetypeChunk<EntityStore> chunk,
                                      int index,
                                      NPCEntity npc,
                                      Entity entity) {
        if (npc != null) {
            try {
                String type = npc.getNPCTypeId();
                if (type != null && !type.isBlank()) {
                    return type;
                }
            } catch (Exception ignored) {
            }
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
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

    private static String colorForMob(@Nonnull String type) {
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

    private static String safeName(@Nonnull String value) {
        return value.replaceAll("[^A-Za-z0-9_.-]", "_");
    }

    private static String contentType(@Nonnull String resourcePath) {
        if (resourcePath.endsWith(".html")) return "text/html; charset=utf-8";
        if (resourcePath.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (resourcePath.endsWith(".css")) return "text/css; charset=utf-8";
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
        exchange.getResponseHeaders().set("Content-Type", contentType);
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

    private record TerrainRequest(String worldName, int lod, int chunkX, int chunkZ, boolean includeDetails) {
        String key() {
            return worldName + ":" + lod + ":" + chunkX + ":" + chunkZ + ":" + includeDetails;
        }
    }

    private record BatchTerrainRequest(String worldName, int lod, List<ChunkCoord> chunks) {
    }

    private record ChunkCoord(int chunkX, int chunkZ) {
    }

    private record PlayerSnapshot(String uuid, String name, double x, double y, double z, float yaw) {
        String toJson() {
            return "{\"uuid\":\"" + escapeJson(uuid) + "\""
                    + ",\"name\":\"" + escapeJson(name) + "\""
                    + ",\"x\":" + x
                    + ",\"y\":" + y
                    + ",\"z\":" + z
                    + ",\"yaw\":" + yaw
                    + "}";
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

    private record MobSnapshot(String id, String type, String label, double x, double y, double z, String color) {
        String toJson() {
            return "{\"id\":\"" + escapeJson(id) + "\""
                    + ",\"type\":\"" + escapeJson(type) + "\""
                    + ",\"label\":\"" + escapeJson(label) + "\""
                    + ",\"x\":" + x
                    + ",\"y\":" + y
                    + ",\"z\":" + z
                    + ",\"color\":\"" + escapeJson(color) + "\""
                    + "}";
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

    private static final class MobScanStats {
        private final LinkedHashMap<String, Integer> archetypes = new LinkedHashMap<>();
        private final LinkedHashMap<String, Integer> acceptedTypes = new LinkedHashMap<>();
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

        private void addArchetype(@Nonnull String archetype) {
            archetypes.merge(shorten(archetype), 1, Integer::sum);
        }

        private void addType(@Nonnull String type) {
            acceptedTypes.merge(type, 1, Integer::sum);
        }

        private String preview(@Nonnull LinkedHashMap<String, Integer> values) {
            if (values.isEmpty()) {
                return "none";
            }
            return values.entrySet().stream()
                    .limit(6)
                    .map(entry -> entry.getKey() + "=" + entry.getValue())
                    .collect(Collectors.joining("|"));
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
