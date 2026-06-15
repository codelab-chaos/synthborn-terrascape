package com.codelabchaos.terrascape.config;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Properties;
import java.util.Set;

public record TerrascapeConfig(
        @Nonnull Path configPath,
        @Nonnull Http http,
        @Nonnull Worlds worlds,
        @Nonnull Security security,
        @Nonnull Folders folders,
        @Nonnull Mesh mesh,
        @Nonnull Cache cache,
        @Nonnull Features features,
        @Nonnull MapView mapView,
        @Nonnull Entities entities
) {
    public static final String FILE_NAME = "terrascape.properties";
    public static final String DEFAULT_TERRAIN_FORMAT_VERSION = "v26";

    public static TerrascapeConfig load(@Nonnull Path dataDirectory) throws IOException {
        Files.createDirectories(dataDirectory);
        Path configPath = dataDirectory.resolve(FILE_NAME);
        if (Files.notExists(configPath)) {
            writeDefaultFile(configPath);
        }

        Properties properties = new Properties();
        try (InputStream input = Files.newInputStream(configPath)) {
            properties.load(input);
        }
        return fromProperties(configPath, dataDirectory, properties);
    }

    public static TerrascapeConfig fromProperties(
            @Nonnull Path configPath,
            @Nonnull Path dataDirectory,
            @Nonnull Properties properties
    ) {
        Path base = dataDirectory.toAbsolutePath().normalize();
        Http http = new Http(
                string(properties, "http.host", "SYNTH_TERRASCAPE_HOST", "127.0.0.1"),
                integer(properties, "http.port", "SYNTH_TERRASCAPE_PORT", 5960, 1, 65535));
        Worlds worlds = new Worlds(stringSet(properties, "worlds.allowlist", null, Set.of()));
        Security security = new Security(stringAllowBlank(properties, "security.adminToken", "SYNTH_TERRASCAPE_ADMIN_TOKEN", ""));
        Folders folders = new Folders(
                path(base, string(properties, "folders.terrainCache", null, "terrain")),
                path(base, string(properties, "folders.mapRegionCache", null, "map-region")),
                path(base, string(properties, "folders.samples", null, "samples")),
                path(base, string(properties, "folders.playerAvatars", null, "player-avatars")),
                path(base, string(properties, "folders.mobIcons", null, "mob-icons")),
                optionalPath(string(properties, "folders.assetsRoot", "SYNTH_TERRASCAPE_ASSETS_ROOT", null)),
                optionalPath(firstNonBlank(
                        override("folders.assetsZip", null),
                        System.getProperty("hytale.assets_zip"),
                        System.getenv("HYTALE_ASSETS_ZIP"),
                        properties.getProperty("folders.assetsZip"))));
        Mesh mesh = new Mesh(
                string(properties, "mesh.terrainFormatVersion", null, DEFAULT_TERRAIN_FORMAT_VERSION),
                durationSeconds(properties, "mesh.terrainTimeoutSeconds", null, 15, 1, 300),
                durationSeconds(properties, "mesh.batchTerrainTimeoutSeconds", null, 45, 1, 600),
                integer(properties, "mesh.maxBatchChunks", null, 16, 1, 256),
                integer(properties, "mesh.maxConcurrentGenerations", null, 1, 1, 16));
        Cache cache = new Cache(
                integer(properties, "cache.memoryTerrainEntries", null, 128, 0, 100_000),
                bytes(properties, "cache.memoryTerrainBytes", null, 128L * 1024L * 1024L, 0, Long.MAX_VALUE),
                integer(properties, "cache.memoryMapRegionEntries", null, 16, 0, 100_000),
                bytes(properties, "cache.memoryMapRegionBytes", null, 64L * 1024L * 1024L, 0, Long.MAX_VALUE),
                integer(properties, "cache.memoryMapTileEntries", null, 20_000, 0, 1_000_000));
        Features features = new Features(
                bool(properties, "features.experimentalDetails", "SYNTH_TERRASCAPE_EXPERIMENTAL_DETAILS", true),
                bool(properties, "features.clientTelemetry", null, true),
                bool(properties, "features.playerAvatars", null, true),
                bool(properties, "features.lazyMobIcons", null, true),
                bool(properties, "features.mobDebugEndpoint", null, false),
                bool(properties, "features.entityStream", null, true));
        MapView mapView = new MapView(
                integer(properties, "map.tileSize", null, 32, 1, 512),
                integer(properties, "map.maxRegionRadius", null, 108, 0, 512),
                integer(properties, "map.generateRadius", null, 20, 0, 512));
        Entities entities = new Entities(
                integer(properties, "entities.maxMobSnapshots", null, 256, 0, 10_000),
                decimal(properties, "entities.mobRadarRadius", null, 500.0d, 0.0d, 100_000.0d),
                durationMillis(properties, "entities.streamIntervalMillis", null, 1000, 100, 60_000),
                integer(properties, "entities.playerAvatarSize", null, 64, 16, 512),
                bytes(properties, "entities.maxPlayerAvatarBytes", null, 512L * 1024L, 0, 10L * 1024L * 1024L),
                durationSeconds(properties, "entities.playerAvatarCacheTtlSeconds", null, 12 * 60 * 60, 0, 30 * 24 * 60 * 60));
        return new TerrascapeConfig(configPath.toAbsolutePath().normalize(), http, worlds, security, folders, mesh, cache, features, mapView, entities);
    }

    public static void writeDefaultFile(@Nonnull Path configPath) throws IOException {
        Files.createDirectories(configPath.getParent());
        try (OutputStream output = Files.newOutputStream(configPath)) {
            output.write(defaultFileText().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    public static String defaultFileText() {
        return """
                # SynthTerrascape server configuration
                # Restart the Hytale server after changing this file.
                # System properties with matching names and documented environment variables override file values.

                # HTTP
                http.host=127.0.0.1
                http.port=5960

                # Worlds
                # Blank means every loaded world is visible. Use comma-separated world names to restrict.
                worlds.allowlist=

                # Security
                # Optional bearer token for admin/debug web endpoints.
                # Send as Authorization: Bearer <token> or X-Terrascape-Admin-Token: <token>.
                security.adminToken=

                # Folders
                # Relative paths are resolved under this plugin's data folder.
                folders.terrainCache=terrain
                folders.mapRegionCache=map-region
                folders.samples=samples
                folders.playerAvatars=player-avatars
                folders.mobIcons=mob-icons
                folders.assetsRoot=
                folders.assetsZip=

                # Mesh generation
                mesh.terrainFormatVersion=v26
                mesh.terrainTimeoutSeconds=15
                mesh.batchTerrainTimeoutSeconds=45
                mesh.maxBatchChunks=16
                mesh.maxConcurrentGenerations=1

                # In-memory caches
                cache.memoryTerrainEntries=128
                cache.memoryTerrainBytes=128MiB
                cache.memoryMapRegionEntries=16
                cache.memoryMapRegionBytes=64MiB
                cache.memoryMapTileEntries=20000

                # Features
                features.experimentalDetails=true
                features.clientTelemetry=true
                features.playerAvatars=true
                features.lazyMobIcons=true
                features.mobDebugEndpoint=false
                features.entityStream=true

                # Map tiles
                map.tileSize=32
                map.maxRegionRadius=108
                map.generateRadius=20

                # Live entities
                entities.maxMobSnapshots=256
                entities.mobRadarRadius=500
                entities.streamIntervalMillis=1000
                entities.playerAvatarSize=64
                entities.maxPlayerAvatarBytes=512KiB
                entities.playerAvatarCacheTtlSeconds=43200
                """;
    }

    private static String string(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, @Nullable String fallback) {
        return firstNonBlank(override(key, env), properties.getProperty(key), fallback);
    }

    private static String stringAllowBlank(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, @Nonnull String fallback) {
        String value = override(key, env);
        if (value != null) return value;
        value = properties.getProperty(key);
        return value == null ? fallback : value.trim();
    }

    private static int integer(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, int fallback, int min, int max) {
        String value = string(properties, key, env, null);
        if (value == null) return fallback;
        try {
            int parsed = Integer.parseInt(value.trim());
            return Math.max(min, Math.min(max, parsed));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private static double decimal(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, double fallback, double min, double max) {
        String value = string(properties, key, env, null);
        if (value == null) return fallback;
        try {
            double parsed = Double.parseDouble(value.trim());
            if (!Double.isFinite(parsed)) return fallback;
            return Math.max(min, Math.min(max, parsed));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private static boolean bool(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, boolean fallback) {
        String value = string(properties, key, env, null);
        if (value == null) return fallback;
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "1", "true", "yes", "on", "enabled" -> true;
            case "0", "false", "no", "off", "disabled" -> false;
            default -> fallback;
        };
    }

    private static Duration durationSeconds(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, long fallback, long min, long max) {
        return Duration.ofSeconds(integer(properties, key, env, (int) fallback, (int) min, (int) max));
    }

    private static Duration durationMillis(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, long fallback, long min, long max) {
        return Duration.ofMillis(integer(properties, key, env, (int) fallback, (int) min, (int) max));
    }

    private static long bytes(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, long fallback, long min, long max) {
        String value = string(properties, key, env, null);
        if (value == null) return fallback;
        try {
            long parsed = parseBytes(value);
            return Math.max(min, Math.min(max, parsed));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    public static long parseBytes(@Nonnull String value) {
        String compact = value.trim().replace("_", "").replace(" ", "").toLowerCase(Locale.ROOT);
        long multiplier = 1;
        for (String suffix : new String[]{"kib", "kb", "k"}) {
            if (compact.endsWith(suffix)) {
                multiplier = 1024L;
                compact = compact.substring(0, compact.length() - suffix.length());
                return Math.multiplyExact(Long.parseLong(compact), multiplier);
            }
        }
        for (String suffix : new String[]{"mib", "mb", "m"}) {
            if (compact.endsWith(suffix)) {
                multiplier = 1024L * 1024L;
                compact = compact.substring(0, compact.length() - suffix.length());
                return Math.multiplyExact(Long.parseLong(compact), multiplier);
            }
        }
        for (String suffix : new String[]{"gib", "gb", "g"}) {
            if (compact.endsWith(suffix)) {
                multiplier = 1024L * 1024L * 1024L;
                compact = compact.substring(0, compact.length() - suffix.length());
                return Math.multiplyExact(Long.parseLong(compact), multiplier);
            }
        }
        return Long.parseLong(compact);
    }

    private static Set<String> stringSet(@Nonnull Properties properties, @Nonnull String key, @Nullable String env, @Nonnull Set<String> fallback) {
        String value = string(properties, key, env, null);
        if (value == null || value.isBlank()) return fallback;
        LinkedHashSet<String> values = new LinkedHashSet<>();
        Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .forEach(values::add);
        return Set.copyOf(values);
    }

    private static Path path(@Nonnull Path base, @Nonnull String value) {
        Path path = Path.of(value);
        if (!path.isAbsolute()) {
            path = base.resolve(path);
        }
        return path.toAbsolutePath().normalize();
    }

    @Nullable
    private static Path optionalPath(@Nullable String value) {
        if (value == null || value.isBlank()) return null;
        return Path.of(value).toAbsolutePath().normalize();
    }

    @Nullable
    private static String override(@Nonnull String key, @Nullable String env) {
        String property = System.getProperty("terrascape." + key);
        if (property == null || property.isBlank()) {
            property = System.getProperty(key);
        }
        if ((property == null || property.isBlank()) && env != null) {
            property = System.getenv(env);
        }
        return property == null || property.isBlank() ? null : property;
    }

    @Nullable
    private static String firstNonBlank(@Nullable String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    public record Http(@Nonnull String host, int port) {
    }

    public record Worlds(@Nonnull Set<String> allowlist) {
        public boolean allows(@Nonnull String worldName) {
            return allowlist.isEmpty() || allowlist.contains(worldName);
        }
    }

    public record Security(@Nonnull String adminToken) {
        public boolean hasAdminToken() {
            return !adminToken.isBlank();
        }
    }

    public record Folders(
            @Nonnull Path terrainCacheDir,
            @Nonnull Path mapRegionCacheDir,
            @Nonnull Path samplesDir,
            @Nonnull Path playerAvatarsDir,
            @Nonnull Path mobIconsDir,
            @Nullable Path assetsRoot,
            @Nullable Path assetsZip
    ) {
    }

    public record Mesh(
            @Nonnull String terrainFormatVersion,
            @Nonnull Duration terrainTimeout,
            @Nonnull Duration batchTerrainTimeout,
            int maxBatchChunks,
            int maxConcurrentGenerations
    ) {
    }

    public record Cache(
            int memoryTerrainEntries,
            long memoryTerrainBytes,
            int memoryMapRegionEntries,
            long memoryMapRegionBytes,
            int memoryMapTileEntries
    ) {
    }

    public record Features(
            boolean experimentalDetails,
            boolean clientTelemetry,
            boolean playerAvatars,
            boolean lazyMobIcons,
            boolean mobDebugEndpoint,
            boolean entityStream
    ) {
    }

    public record MapView(int tileSize, int maxRegionRadius, int generateRadius) {
    }

    public record Entities(
            int maxMobSnapshots,
            double mobRadarRadius,
            @Nonnull Duration streamInterval,
            int playerAvatarSize,
            long maxPlayerAvatarBytes,
            @Nonnull Duration playerAvatarCacheTtl
    ) {
    }
}
