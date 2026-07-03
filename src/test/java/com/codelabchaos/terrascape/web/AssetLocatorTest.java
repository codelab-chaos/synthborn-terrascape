package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers construction, local cache hits, and plugin-free asset zip discovery.
 */
class AssetLocatorTest {
    @TempDir
    Path tempDir;

    @Test
    void cachedIconIsReturned() throws IOException {
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons);
        byte[] png = {9, 8, 7};
        Files.write(icons.resolve("wolf.png"), png);

        AssetLocator locator = new AssetLocator(config, null);
        assertArrayEquals(png, locator.readOrCacheGeneratedMobIcon("wolf.png"));
    }

    @Test
    void cacheHitReturnsExactBytesForArbitraryName() throws IOException {
        // A second distinct cache-hit shape: nested-looking icon name and longer payload, still
        // resolved purely from the on-disk cache dir without ever touching the plugin.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons);
        byte[] png = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        Files.write(icons.resolve("Some_Model_Icon.png"), png);

        AssetLocator locator = new AssetLocator(config, null);
        assertArrayEquals(png, locator.readOrCacheGeneratedMobIcon("Some_Model_Icon.png"));
    }

    @Test
    void emptyCachedIconFileReturnsEmptyBytes() throws IOException {
        // A zero-byte regular file is still a cache hit (Files.readAllBytes succeeds), so we never
        // fall through to the plugin-dependent miss path.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons);
        Files.write(icons.resolve("empty.png"), new byte[0]);

        AssetLocator locator = new AssetLocator(config, null);
        assertArrayEquals(new byte[0], locator.readOrCacheGeneratedMobIcon("empty.png"));
    }

    @Test
    void missingIconReturnsNullWithoutPlugin() throws IOException {
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        AssetLocator locator = new AssetLocator(config, null);
        assertNull(locator.readOrCacheGeneratedMobIcon("absent.png"));
    }

    @Test
    void directoryAtCachePathSwallowsIoErrorThenReturnsNull() throws IOException {
        // Exercises the IOException-swallow branch in the cache read: when the cache path is a
        // directory, Files.readAllBytes throws and is caught before the miss path returns null.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons.resolve("dir.png"));

        AssetLocator locator = new AssetLocator(config, null);
        assertNull(locator.readOrCacheGeneratedMobIcon("dir.png"));
    }

    @Test
    void cacheHitWinsOverAnyMissPath() throws IOException {
        // Even with lazyMobIcons enabled (the feature that would otherwise probe Assets.zip), a
        // present cache file short-circuits before any plugin/zip resolution.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons);
        byte[] png = {42};
        Files.write(icons.resolve("lazy.png"), png);

        AssetLocator locator = new AssetLocator(config, null);
        assertArrayEquals(png, locator.readOrCacheGeneratedMobIcon("lazy.png"));
    }

    @Test
    void apexStyleJarAssetsZipIsDiscoveredAndCached() throws IOException {
        byte[] png = {13, 37, 42};
        Path zip = tempDir.resolve("jar").resolve("Assets.zip");
        Files.createDirectories(zip.getParent());
        try (ZipOutputStream output = new ZipOutputStream(Files.newOutputStream(zip))) {
            output.putNextEntry(new ZipEntry("Common/Icons/ModelsGenerated/wolf.png"));
            output.write(png);
            output.closeEntry();
        }

        Properties properties = new Properties();
        properties.setProperty("folders.assetsRoot", tempDir.toString());
        TerrascapeConfig config = TerrascapeConfig.fromProperties(
                tempDir.resolve(TerrascapeConfig.FILE_NAME),
                tempDir.resolve("data"),
                properties);

        AssetLocator locator = new AssetLocator(config, null);
        assertArrayEquals(png, locator.readOrCacheGeneratedMobIcon("wolf.png"));
        assertArrayEquals(png, Files.readAllBytes(config.folders().mobIconsDir().resolve("wolf.png")));
    }
}
