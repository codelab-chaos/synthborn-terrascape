package com.codelabchaos.terrascape.config;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
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
        @Nonnull Folders folders,
        @Nonnull Mesh mesh,
        @Nonnull Cache cache,
        @Nonnull Features features,
        @Nonnull MapView mapView,
        @Nonnull Entities entities,
        @Nonnull Validation validation,
        @Nonnull Access access,
        @Nonnull Cors cors,
        @Nonnull Rcon rcon
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
                string(properties, "http.host", "TERRASCAPE_HOST", "127.0.0.1"),
                integer(properties, "http.port", "TERRASCAPE_PORT", 5960, 1, 65535));
        Worlds worlds = new Worlds(stringSet(properties, "worlds.allowlist", null, Set.of()));
        Folders folders = new Folders(
                path(base, string(properties, "folders.terrainCache", null, "terrain")),
                path(base, string(properties, "folders.mapRegionCache", null, "map-region")),
                path(base, string(properties, "folders.samples", null, "samples")),
                path(base, string(properties, "folders.playerAvatars", null, "player-avatars")),
                path(base, string(properties, "folders.mobIcons", null, "mob-icons")),
                optionalPath(string(properties, "folders.assetsRoot", "TERRASCAPE_ASSETS_ROOT", null)),
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
                bool(properties, "features.experimentalDetails", "TERRASCAPE_EXPERIMENTAL_DETAILS", true),
                bool(properties, "features.clientTelemetry", null, true),
                bool(properties, "features.playerAvatars", null, true),
                bool(properties, "features.lazyMobIcons", null, true),
                bool(properties, "features.mobDebugEndpoint", null, false),
                bool(properties, "features.entityStream", null, true),
                bool(properties, "features.metricsEndpoint", null, true));
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
        Validation validation = new Validation(
                bool(properties, "validation.smokeTokensEnabled", "TERRASCAPE_VALIDATION_SMOKE_TOKENS_ENABLED", false));
        Access access = new Access(
                string(properties, "access.mode", "TERRASCAPE_ACCESS_MODE", "public"),
                stringAllowBlank(properties, "access.debugToken", "TERRASCAPE_ACCESS_DEBUG_TOKEN", ""),
                Duration.ofHours(integer(properties, "access.mapTokenTtlHours", null, 24, 1, 8760)),
                Duration.ofHours(integer(properties, "access.adminMapTokenTtlHours", null, 4, 1, 8760)),
                stringAllowBlankAnyEnv(properties, "access.publicBaseUrl", "",
                        "TERRASCAPE_PUBLIC_BASE_URL", "TERRASCAPE_PUBLIC_URL"));
        Cors cors = new Cors(
                bool(properties, "cors.enabled", "TERRASCAPE_CORS_ENABLED", false),
                stringSet(properties, "cors.allowedOrigins", "TERRASCAPE_CORS_ORIGINS", Set.of()));
        Rcon rcon = new Rcon(
                bool(properties, "rcon.enabled", "TERRASCAPE_RCON_ENABLED", false),
                string(properties, "rcon.host", "TERRASCAPE_RCON_HOST", "127.0.0.1"),
                integer(properties, "rcon.port", "TERRASCAPE_RCON_PORT", 25578, 1, 65535),
                stringAllowBlank(properties, "rcon.password", "TERRASCAPE_RCON_PASSWORD", ""),
                bool(properties, "rcon.allowRemote", "TERRASCAPE_RCON_ALLOW_REMOTE", false));
        return new TerrascapeConfig(configPath.toAbsolutePath().normalize(), http, worlds, folders, mesh, cache, features, mapView, entities, validation, access, cors, rcon);
    }

    public static void writeDefaultFile(@Nonnull Path configPath) throws IOException {
        Files.createDirectories(configPath.getParent());
        try (OutputStream output = Files.newOutputStream(configPath)) {
            output.write(defaultFileText().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    public static String defaultFileText() {
        return """
                # Terrascape server configuration
                # Restart the Hytale server after changing this file.
                # System properties with matching names and documented environment variables override file values.

                # HTTP
                http.host=127.0.0.1
                http.port=5960

                # Worlds
                # Blank means every loaded world is visible. Use comma-separated world names to restrict.
                worlds.allowlist=

                # Cross-Origin Resource Sharing (CORS)
                # Off by default - the bundled viewer is same-origin and needs no CORS.
                # Enable only to let browser apps on other domains call these APIs.
                # cors.allowedOrigins is a comma-separated list of exact origins
                # (scheme + host + port), e.g. https://map.example.com,https://admin.example.com:8443
                # Use * to allow any origin (not recommended once credentials are involved).
                cors.enabled=false
                cors.allowedOrigins=

                # RCON (remote command endpoint) - OFF by default.
                # Opt-in HTTP/JSON endpoint that runs server commands. Security is fail-closed:
                # when enabled, rcon.password is REQUIRED or the endpoint refuses to start.
                # Every command request must send the password as X-SynthRCON-Token or
                # Authorization: Bearer. Map access tokens do not authorize RCON.
                # Browser clients use /api/rcon/command with an admin-scoped map user token instead.
                # Bound to localhost unless rcon.allowRemote=true.
                rcon.enabled=false
                rcon.host=127.0.0.1
                rcon.port=25578
                rcon.password=
                rcon.allowRemote=false

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
                features.metricsEndpoint=true

                # Access
                # access.mode=public lets anyone view the map. restricted requires a generated
                # per-user map token for the viewer and read-only map APIs.
                # Optional static bearer token for ops/debug endpoints and monitoring.
                # Prefer generated per-user map tokens for the browser. Browser command execution
                # uses admin-scoped map user tokens, not this static token.
                # Send as Authorization: Bearer <token> or X-Terrascape-Debug-Token: <token>.
                # This is independent from rcon.password below.
                access.mode=public
                access.debugToken=
                access.mapTokenTtlHours=24
                access.adminMapTokenTtlHours=4
                # Optional public URL used in generated /terrascape maplink output.
                # Set this to a DNS/custom domain when you do not want copied links,
                # chat history, or streams to expose the numeric server IP.
                # Example: access.publicBaseUrl=http://apex-test:7656
                access.publicBaseUrl=

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

                # Validation
                # Off by default. Enable only on dedicated validation servers to allow
                # /terrascape smoketoken to mint synthetic scoped map tokens over console/RCON.
                validation.smokeTokensEnabled=false
                """;
    }

    public void ensureRuntimeDirectories() throws IOException {
        Files.createDirectories(folders.terrainCacheDir());
        Files.createDirectories(folders.mapRegionCacheDir());
        Files.createDirectories(folders.samplesDir());
        Files.createDirectories(folders.playerAvatarsDir());
        Files.createDirectories(folders.mobIconsDir());
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

    private static String stringAllowBlankAnyEnv(
            @Nonnull Properties properties,
            @Nonnull String key,
            @Nonnull String fallback,
            @Nonnull String... envNames
    ) {
        String value = override(key, null);
        if (value != null) return value;
        for (String envName : envNames) {
            value = System.getenv(envName);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
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
            boolean entityStream,
            boolean metricsEndpoint
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

    public record Validation(boolean smokeTokensEnabled) {
    }

    public record Access(
            @Nonnull String mode,
            @Nonnull String debugToken,
            @Nonnull Duration mapTokenTtl,
            @Nonnull Duration adminMapTokenTtl,
            @Nonnull String publicBaseUrl
    ) {
        public boolean restricted() {
            return "restricted".equalsIgnoreCase(mode);
        }

        public boolean hasDebugToken() {
            return !debugToken.isBlank();
        }

        public boolean hasDebugCredential() {
            return hasDebugToken();
        }

        public boolean matchesDebugToken(@Nullable String credential) {
            return matchesDebugCredential(credential);
        }

        public boolean matchesDebugCredential(@Nullable String credential) {
            if (credential == null || credential.isBlank() || debugToken.isBlank()) {
                return false;
            }
            return MessageDigest.isEqual(
                    debugToken.getBytes(StandardCharsets.UTF_8),
                    credential.getBytes(StandardCharsets.UTF_8));
        }
    }

    public record Cors(boolean enabled, @Nonnull Set<String> allowedOrigins) {
        /** True if CORS is enabled and the given request Origin is on the allowlist. */
        public boolean allows(@Nonnull String origin) {
            return enabled && (allowedOrigins.contains("*") || allowedOrigins.contains(origin));
        }
    }

    /**
     * Opt-in RCON command endpoint (off by default). Maps to the shared
     * {@code com.codelabchaos.rcon} core; the security schema is enforced there.
     * Terrascape's reserved default port is {@code 25578}.
     */
    public record Rcon(boolean enabled, @Nonnull String host, int port, @Nonnull String password, boolean allowRemote) {
        public boolean hasPassword() {
            return !password.isBlank();
        }
    }
}
