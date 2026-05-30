package com.codelabchaos.synthworldview.web;

import com.codelabchaos.synthworldview.SynthWorldviewPlugin;
import com.codelabchaos.synthworldview.terrain.GltfWriter;
import com.codelabchaos.synthworldview.terrain.TerrainMesh;
import com.codelabchaos.synthworldview.terrain.TerrainMesher;
import com.codelabchaos.synthworldview.terrain.TerrainSampler;
import com.codelabchaos.synthworldview.terrain.TerrainSnapshot;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.annotation.Nonnull;
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
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public final class WorldviewWebServer {
    private static final Duration TERRAIN_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration BATCH_TERRAIN_TIMEOUT = Duration.ofSeconds(45);
    private static final int MAX_BATCH_CHUNKS = 16;
    private static final Pattern WORLD_PATTERN = Pattern.compile("\"world\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern LOD_PATTERN = Pattern.compile("\"lod\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_OBJECT_PATTERN = Pattern.compile("\\{[^{}]*}");
    private static final Pattern CHUNK_X_PATTERN = Pattern.compile("\"chunkX\"\\s*:\\s*(-?\\d+)");
    private static final Pattern CHUNK_Z_PATTERN = Pattern.compile("\"chunkZ\"\\s*:\\s*(-?\\d+)");

    private final SynthWorldviewPlugin plugin;
    private final String host;
    private final int port;
    private final HttpServer server;

    public WorldviewWebServer(@Nonnull SynthWorldviewPlugin plugin, @Nonnull String host, int port) throws IOException {
        this.plugin = plugin;
        this.host = host;
        this.port = port;
        this.server = HttpServer.create(new InetSocketAddress(host, port), 0);
        this.server.createContext("/api/worlds", this::handleWorlds);
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
        writeJson(exchange, 200, "{\"ok\":true,\"worlds\":[" + worlds + "]}");
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

        TerrainRequest request = parseTerrainRequest(exchange.getRequestURI().getPath());
        if (request == null) {
            writeJson(exchange, 400, "{\"ok\":false,\"error\":\"expected_/api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb\"}");
            return;
        }

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
            TerrainResult result = generateTerrain(world, request);
            Path output = terrainOutputPath(request);
            Files.createDirectories(output.getParent());
            Files.write(output, result.glb());

            exchange.getResponseHeaders().set("Content-Type", "model/gltf-binary");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            addCors(exchange);
            exchange.getResponseHeaders().set("X-Worldview-Columns", Integer.toString(result.snapshot().nonEmptyColumns()));
            exchange.getResponseHeaders().set("X-Worldview-Vertices", Integer.toString(result.mesh().vertexCount()));
            exchange.getResponseHeaders().set("X-Worldview-Triangles", Integer.toString(result.mesh().triangleCount()));
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

        World world = findWorld(request.worldName());
        if (world == null) {
            writeJson(exchange, 404, "{\"ok\":false,\"error\":\"unknown_world\"}");
            return;
        }

        try {
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
                    TerrainRequest terrainRequest = new TerrainRequest(request.worldName(), request.lod(), result.chunkX(), result.chunkZ());
                    Path output = terrainOutputPath(terrainRequest);
                    Files.createDirectories(output.getParent());
                    Files.write(output, terrain.glb());

                    json.append(",\"columns\":").append(terrain.snapshot().nonEmptyColumns())
                            .append(",\"vertices\":").append(terrain.mesh().vertexCount())
                            .append(",\"triangles\":").append(terrain.mesh().triangleCount())
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
        CompletableFuture<TerrainResult> future = new CompletableFuture<>();
        world.execute(() -> {
            try {
                TerrainSnapshot snapshot = TerrainSampler.sample(world, request.chunkX(), request.chunkZ());
                TerrainMesh mesh = TerrainMesher.mesh(snapshot);
                future.complete(new TerrainResult(snapshot, mesh, GltfWriter.writeGlb(mesh)));
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        return future.get(TERRAIN_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
    }

    private List<BatchTerrainResult> generateTerrainBatch(@Nonnull World world, @Nonnull BatchTerrainRequest request) throws Exception {
        CompletableFuture<List<BatchTerrainResult>> future = new CompletableFuture<>();
        world.execute(() -> {
            List<BatchTerrainResult> results = new ArrayList<>(request.chunks().size());
            for (ChunkCoord chunk : request.chunks()) {
                try {
                    TerrainSnapshot snapshot = TerrainSampler.sample(world, chunk.chunkX(), chunk.chunkZ());
                    TerrainMesh mesh = TerrainMesher.mesh(snapshot);
                    results.add(new BatchTerrainResult(
                            chunk.chunkX(),
                            chunk.chunkZ(),
                            new TerrainResult(snapshot, mesh, GltfWriter.writeGlb(mesh)),
                            null));
                } catch (Exception e) {
                    results.add(new BatchTerrainResult(chunk.chunkX(), chunk.chunkZ(), null, e.getMessage()));
                }
            }
            future.complete(results);
        });
        return future.get(BATCH_TERRAIN_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
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
            default -> null;
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
                .resolve(safeWorld)
                .resolve("lod-" + request.lod())
                .resolve(request.chunkX() + "_" + request.chunkZ() + ".glb");
    }

    private static TerrainRequest parseTerrainRequest(@Nonnull String path) {
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
        return new TerrainRequest(decode(parts[0]), lod, chunkX, chunkZ);
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

    private record TerrainRequest(String worldName, int lod, int chunkX, int chunkZ) {
    }

    private record BatchTerrainRequest(String worldName, int lod, List<ChunkCoord> chunks) {
    }

    private record ChunkCoord(int chunkX, int chunkZ) {
    }

    private record TerrainResult(TerrainSnapshot snapshot, TerrainMesh mesh, byte[] glb) {
    }

    private record BatchTerrainResult(int chunkX, int chunkZ, TerrainResult terrain, String error) {
    }
}
