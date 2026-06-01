import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import com.hypixel.hytale.server.npc.entities.NPCEntity;
import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import com.sun.net.httpserver.HttpExchange;
import javax.annotation.Nullable;
import java.awt.image.BufferedImage;
import java.io.IOException;
    private static final int MAX_BATCH_CHUNKS = 8;
    private static final int MAP_REGION_TILE_SIZE = 64;
    private static final int MAX_MAP_REGION_RADIUS = 18;
    private static final Duration MAP_REGION_TIMEOUT = Duration.ofSeconds(20);
    private static final int MAX_CONCURRENT_GENERATIONS = 1;
        this.server.createContext("/api/terrain", this::handleTerrain);
        this.server.createContext("/api/mapregion", this::handleMapRegion);
        this.server.createContext("/", this::handleStatic);

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
            byte[] bytes = generateMapRegion(world, request).get(MAP_REGION_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            if (bytes.length == 0) {
                writeJson(exchange, 500, "{\"ok\":false,\"error\":\"map_region_empty\"}");
                return;
            }
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        } catch (Exception e) {
            plugin.getLogger().at(Level.WARNING).withCause(e).log("Map region request failed: " + request);
            writeJson(exchange, 500, "{\"ok\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void handleTerrain(@Nonnull HttpExchange exchange) throws IOException {

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

    private CompletableFuture<byte[]> generateMapRegion(@Nonnull World world, @Nonnull MapRegionRequest request) {
        WorldMapManager mapManager = world.getWorldMapManager();
        if (mapManager == null || !mapManager.isWorldMapEnabled()) {
            return CompletableFuture.completedFuture(new byte[0]);
        }

        int chunkCount = request.radius() * 2 + 1;
        int outputSize = chunkCount * MAP_REGION_TILE_SIZE;
        BufferedImage composite = new BufferedImage(outputSize, outputSize, BufferedImage.TYPE_INT_RGB);
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        int minChunkX = request.centerX() - request.radius();
        int minChunkZ = request.centerZ() - request.radius();

        for (int dz = 0; dz < chunkCount; dz++) {
            for (int dx = 0; dx < chunkCount; dx++) {
                int chunkX = minChunkX + dx;
                int chunkZ = minChunkZ + dz;
                int outputX = dx * MAP_REGION_TILE_SIZE;
                int outputY = dz * MAP_REGION_TILE_SIZE;
                futures.add(mapManager.getImageAsync(chunkX, chunkZ)
                        .thenAccept(mapImage -> drawMapTile(composite, mapImage, outputX, outputY)));
            }
        }

        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                .thenApply(ignored -> MapPngEncoder.encode(composite))
                .exceptionally(e -> {
                    plugin.getLogger().at(Level.WARNING).withCause(e).log("Failed to generate map region " + request);
                    return new byte[0];
                });
    }

    private static void drawMapTile(@Nonnull BufferedImage composite, @Nullable MapImage mapImage,
                                    int outputX, int outputY) {
        if (mapImage == null || mapImage.data == null || mapImage.width <= 0 || mapImage.height <= 0) {
            return;
        }
        MapPngEncoder.drawMapImage(composite, mapImage, outputX, outputY, MAP_REGION_TILE_SIZE);
    }

    private static World findWorld(@Nonnull String worldName) {

    private record MapRegionRequest(String worldName, int centerX, int centerZ, int radius) {
    }

    private record ChunkCoord(int chunkX, int chunkZ) {
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            addCors(exchange);
            exchange.sendResponseHeaders(200, bytes.length);
                                    int outputX, int outputY) {
        if (mapImage == null || mapImage.data == null || mapImage.width <= 0 || mapImage.height <= 0) {
        if (mapImage == null || mapImage.palette == null || mapImage.packedIndices == null
                || mapImage.width <= 0 || mapImage.height <= 0) {
            return;
        }
        MapPngEncoder.drawMapImage(composite, mapImage, outputX, outputY, MAP_REGION_TILE_SIZE);
        synchronized (composite) {
            MapPngEncoder.drawMapImage(composite, mapImage, outputX, outputY, MAP_REGION_TILE_SIZE);
        }
    }