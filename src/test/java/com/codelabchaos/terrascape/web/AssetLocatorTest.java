package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

/**
 * Covers construction and the local mob-icon cache hit. Loose-file and Assets.zip resolution walk
 * the filesystem via the plugin data dir and are runtime concerns.
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
}
