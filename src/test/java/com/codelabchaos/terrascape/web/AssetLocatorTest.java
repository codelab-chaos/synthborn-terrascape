package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Covers construction and the local mob-icon cache hit.
 *
 * <p>Plugin-constructability verdict: the loose-file and {@code Assets.zip} resolution paths are
 * NOT unit-testable. They route through {@code assetSearchRoots()}, which dereferences
 * {@code plugin.terrascapeDir()} (and {@code plugin.getLogger()} on the zip-resolved branch). The
 * {@code TerrascapePlugin} that would supply those cannot be constructed or subclassed in a test:
 * its super constructor {@code PluginBase(PluginInit)} calls {@code HytaleServer.get().getEventBus()}
 * (verified via {@code javap -c} on Server-0.5.4.jar), which NPEs without a running engine server.
 * Standing up a real {@code HytaleServer} singleton is the engine-bound runtime path this suite is
 * told to skip. So only the plugin-free on-disk cache hit is exercised here; every cache-miss path
 * reaches {@code plugin} and is therefore a runtime concern.
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
    void cacheMissReachesPluginAndIsRuntimeBound() throws IOException {
        // Documents the engine boundary: with no cached file, the very first miss step
        // (resolveLooseGeneratedIcon -> assetSearchRoots) dereferences the null plugin. A real
        // plugin cannot be constructed in a unit test (see class javadoc), so this remains a
        // runtime concern; we assert the boundary rather than fake it.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        AssetLocator locator = new AssetLocator(config, null);
        assertThrows(NullPointerException.class, () -> locator.readOrCacheGeneratedMobIcon("absent.png"));
    }

    @Test
    void directoryAtCachePathSwallowsIoErrorThenReachesPlugin() throws IOException {
        // Exercises the IOException-swallow branch in the cache read: when the cache path is a
        // directory, Files.readAllBytes throws and is caught, after which the miss path again
        // reaches the null plugin. Confirms the catch is taken (no IOException escapes) before the
        // documented runtime boundary.
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path icons = config.folders().mobIconsDir();
        Files.createDirectories(icons.resolve("dir.png"));

        AssetLocator locator = new AssetLocator(config, null);
        assertThrows(NullPointerException.class, () -> locator.readOrCacheGeneratedMobIcon("dir.png"));
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
}
