package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.config.TerrascapeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers construction and the local-cache paths. The external Hyvatar fetch (network) and its
 * failure logging are runtime concerns, exercised elsewhere.
 */
class AvatarServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void missingUsernameWithoutCacheReturnsNull() throws IOException {
        AvatarService service = new AvatarService(TerrascapeConfig.load(tempDir), null);
        // No cached file and no username → returns null before any fetch (no plugin touched).
        assertNull(service.readOrFetch("uuid-1", null, null));
    }

    @Test
    void freshCachedAvatarIsReturned() throws IOException {
        TerrascapeConfig config = TerrascapeConfig.load(tempDir);
        Path avatars = config.folders().playerAvatarsDir();
        Files.createDirectories(avatars);
        byte[] png = {1, 2, 3, 4};
        Files.write(avatars.resolve("uuid-2.png"), png);

        AvatarService service = new AvatarService(config, null);
        assertArrayEquals(png, service.readOrFetch("uuid-2", "Steve", null));
    }
}
