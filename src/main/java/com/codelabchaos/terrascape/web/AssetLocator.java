package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.config.TerrascapeConfig;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.logging.Level;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Locates Hytale asset sources and serves generated mob icons from them: a TTL-free on-disk cache,
 * loose extracted icon files, or the bundled {@code Assets.zip} (resolved by probing common
 * install layouts). The resolved zip path is memoized.
 */
final class AssetLocator {
    private static final String GENERATED_ICON_ENTRY_PREFIX = "Common/Icons/ModelsGenerated/";

    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;
    private volatile Path assetsZipPath;

    AssetLocator(@Nonnull TerrascapeConfig config, @Nullable TerrascapePlugin plugin) {
        this.config = config;
        this.plugin = plugin;
    }

    @Nullable
    byte[] readOrCacheGeneratedMobIcon(@Nonnull String fileName) {
        Path cachePath = config.folders().mobIconsDir().resolve(fileName);
        try {
            if (Files.isRegularFile(cachePath)) {
                return Files.readAllBytes(cachePath);
            }
        } catch (IOException ignored) {
        }

        byte[] bytes = readGeneratedMobIcon(fileName);
        if (bytes == null) {
            return null;
        }
        try {
            Files.createDirectories(cachePath.getParent());
            Files.write(cachePath, bytes);
            log(Level.INFO, "Cached mob icon from Hytale assets: " + fileName, null);
        } catch (IOException e) {
            log(Level.FINE, "Unable to cache mob icon: " + fileName, e);
        }
        return bytes;
    }

    @Nullable
    private byte[] readGeneratedMobIcon(@Nonnull String fileName) {
        Path looseIcon = resolveLooseGeneratedIcon(fileName);
        if (looseIcon != null) {
            try {
                return Files.readAllBytes(looseIcon);
            } catch (IOException ignored) {
            }
        }

        if (!config.features().lazyMobIcons()) {
            return null;
        }
        Path zipPath = resolveAssetsZipPath();
        if (zipPath == null) {
            return null;
        }
        String entryName = GENERATED_ICON_ENTRY_PREFIX + fileName;
        try (ZipFile zipFile = new ZipFile(zipPath.toFile())) {
            ZipEntry entry = zipFile.getEntry(entryName);
            if (entry == null || entry.isDirectory()) {
                return null;
            }
            try (InputStream input = zipFile.getInputStream(entry)) {
                return input.readAllBytes();
            }
        } catch (IOException ignored) {
            return null;
        }
    }

    @Nullable
    private Path resolveLooseGeneratedIcon(@Nonnull String fileName) {
        for (Path root : assetSearchRoots()) {
            Path candidate = root.resolve("_Assets").resolve("Common").resolve("Icons").resolve("ModelsGenerated").resolve(fileName);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
            candidate = root.resolve("Common").resolve("Icons").resolve("ModelsGenerated").resolve(fileName);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }

    @Nullable
    private Path resolveAssetsZipPath() {
        Path cached = assetsZipPath;
        if (cached != null && Files.isRegularFile(cached)) {
            return cached;
        }

        Path explicit = config.folders().assetsZip();
        if (explicit != null) {
            if (Files.isRegularFile(explicit)) {
                assetsZipPath = explicit;
                return explicit;
            }
        }

        for (Path root : assetSearchRoots()) {
            for (Path path = root; path != null; path = path.getParent()) {
                for (Path candidate : assetsZipCandidates(path)) {
                    if (Files.isRegularFile(candidate)) {
                        assetsZipPath = candidate.toAbsolutePath().normalize();
                        log(Level.INFO, "Resolved Hytale Assets.zip for lazy mob icons: " + assetsZipPath, null);
                        return assetsZipPath;
                    }
                }
            }
        }
        return null;
    }

    private static List<Path> assetsZipCandidates(@Nonnull Path root) {
        return List.of(
                root.resolve("Assets.zip"),
                root.resolve("jar").resolve("Assets.zip"),
                root.resolve("latest").resolve("Assets.zip"),
                root.resolve("release").resolve("latest").resolve("Assets.zip"),
                root.resolve("Client").resolve("latest").resolve("Assets.zip"),
                root.resolve("Client").resolve("release").resolve("latest").resolve("Assets.zip"),
                root.resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("release").resolve("package").resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("install").resolve("release").resolve("package").resolve("game").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("Client").resolve("latest").resolve("Assets.zip"),
                root.resolve("Hytale-API").resolve("Client").resolve("release").resolve("latest").resolve("Assets.zip"));
    }

    private List<Path> assetSearchRoots() {
        LinkedHashSet<Path> roots = new LinkedHashSet<>();
        if (config.folders().assetsRoot() != null) {
            roots.add(config.folders().assetsRoot());
        }
        addPathIfPresent(roots, System.getProperty("terrascape.assets_root"));
        addPathIfPresent(roots, System.getenv("TERRASCAPE_ASSETS_ROOT"));
        addPathIfPresent(roots, System.getProperty("hytale.assets_root"));
        addPathIfPresent(roots, System.getenv("HYTALE_ASSETS_ROOT"));
        addPathIfPresent(roots, System.getenv("VSCODE_CWD"));
        addPathIfPresent(roots, System.getenv("WORKSPACE_FOLDER"));
        addPathIfPresent(roots, System.getProperty("user.dir"));
        roots.add(Paths.get("").toAbsolutePath().normalize());
        if (plugin != null) {
            roots.add(plugin.terrascapeDir().toAbsolutePath().normalize());
        }
        return List.copyOf(roots);
    }

    private void log(@Nonnull Level level, @Nonnull String message, @Nullable Throwable cause) {
        if (plugin == null) {
            return;
        }
        if (cause == null) {
            plugin.getLogger().at(level).log(message);
        } else {
            plugin.getLogger().at(level).withCause(cause).log(message);
        }
    }

    private static void addPathIfPresent(@Nonnull LinkedHashSet<Path> roots, @Nullable String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        roots.add(Paths.get(value).toAbsolutePath().normalize());
    }
}
