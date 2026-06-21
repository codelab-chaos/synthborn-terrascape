package com.codelabchaos.terrascape.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TerrascapeConfigTest {
    @TempDir
    Path tempDir;

    @Test
    void loadCreatesDocumentedDefaultFile() throws IOException {
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);

        assertTrue(Files.isRegularFile(tempDir.resolve(TerrascapeConfig.FILE_NAME)));
        String text = Files.readString(config.configPath());
        assertTrue(text.contains("# HTTP"));
        assertTrue(text.contains("folders.terrainCache=terrain"));
        assertEquals("127.0.0.1", config.http().host());
        assertEquals(5960, config.http().port());
        assertFalse(config.features().mobDebugEndpoint());
        assertFalse(config.security().hasAdminToken());
        assertTrue(text.contains("cors.enabled=false"));
        assertFalse(config.cors().enabled());
        assertTrue(config.cors().allowedOrigins().isEmpty());
        assertFalse(config.cors().allows("https://map.example.com"));
    }

    @Test
    void parsesCorsAllowlistAsAnArray() {
        Properties properties = new Properties();
        properties.setProperty("cors.enabled", "true");
        properties.setProperty("cors.allowedOrigins", "https://map.example.com, https://admin.example.com:8443");

        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve(TerrascapeConfig.FILE_NAME),
                tempDir,
                properties);

        assertTrue(config.cors().enabled());
        assertTrue(config.cors().allows("https://map.example.com"));
        assertTrue(config.cors().allows("https://admin.example.com:8443"));
        assertFalse(config.cors().allows("https://evil.example"));
    }

    @Test
    void corsDisabledByDefaultEvenWithOriginsListed() {
        Properties properties = new Properties();
        properties.setProperty("cors.allowedOrigins", "https://map.example.com");

        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve(TerrascapeConfig.FILE_NAME),
                tempDir,
                properties);

        assertFalse(config.cors().enabled());
        assertFalse(config.cors().allows("https://map.example.com"));
    }

    @Test
    void propertiesResolveRelativeFoldersAndAllowlistedWorlds() {
        Properties properties = new Properties();
        properties.setProperty("http.port", "6001");
        properties.setProperty("worlds.allowlist", "default, arena");
        properties.setProperty("folders.terrainCache", "cache/terrain");
        properties.setProperty("features.clientTelemetry", "false");
        properties.setProperty("security.adminToken", "secret-token");
        properties.setProperty("mesh.maxBatchChunks", "48");
        properties.setProperty("cache.memoryTerrainBytes", "256MiB");

        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve(TerrascapeConfig.FILE_NAME),
                tempDir,
                properties);

        assertEquals(6001, config.http().port());
        assertTrue(config.worlds().allows("default"));
        assertTrue(config.worlds().allows("arena"));
        assertFalse(config.worlds().allows("private"));
        assertEquals(tempDir.resolve("cache/terrain").toAbsolutePath().normalize(), config.folders().terrainCacheDir());
        assertFalse(config.features().clientTelemetry());
        assertTrue(config.security().hasAdminToken());
        assertEquals("secret-token", config.security().adminToken());
        assertEquals(48, config.mesh().maxBatchChunks());
        assertEquals(256L * 1024L * 1024L, config.cache().memoryTerrainBytes());
    }

    @Test
    void systemPropertiesOverrideFileValues() {
        Properties properties = new Properties();
        properties.setProperty("http.port", "6001");
        System.setProperty("terrascape.http.port", "7002");
        try {
            TerrascapeConfig config = TerrascapeConfig.fromProperties(
                    tempDir.resolve(TerrascapeConfig.FILE_NAME),
                    tempDir,
                    properties);
            assertEquals(7002, config.http().port());
        } finally {
            System.clearProperty("terrascape.http.port");
        }
    }

    @Test
    void parsesByteSizesForAdminFriendlyValues() {
        assertEquals(1024L, TerrascapeConfig.parseBytes("1KiB"));
        assertEquals(2L * 1024L * 1024L, TerrascapeConfig.parseBytes("2M"));
        assertEquals(3L * 1024L * 1024L * 1024L, TerrascapeConfig.parseBytes("3 gb"));
    }
}
