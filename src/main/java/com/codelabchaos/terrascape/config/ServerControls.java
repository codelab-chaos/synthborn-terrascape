package com.codelabchaos.terrascape.config;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Admin-facing, server-driven client controls loaded from a flat {@code server-config.json}.
 *
 * <p>The shipped default lives at {@code /server-config.json} in the jar (all options enabled, no
 * restrictions) and is also the validation schema. On first run it is copied into the mod data dir
 * so admins have a real file to edit; edits are imported on the next server start.
 *
 * <p>Load policy:
 * <ul>
 *   <li><b>Malformed JSON</b> (cannot parse) → hard error: load fails so the problem is obvious.</li>
 *   <li><b>Missing file</b>, <b>missing keys</b>, <b>unknown keys</b>, or <b>wrong-typed values</b>
 *       → warn on startup and fall back to the bundled default per key; the server still starts.</li>
 * </ul>
 *
 * <p>Two governed kinds: <b>toggles</b> ({@code <name>Enabled} booleans) and <b>ranges</b>
 * ({@code <name>Options} allowlist + {@code <name>Default}, optional {@code <name>Enabled}).
 * Mesh promotion pacing is always locked to its normalized server default because exposing it
 * to browsers can create unsafe render workloads.
 */
public final class ServerControls {

    public static final String FILE_NAME = "server-config.json";
    private static final String RESOURCE_PATH = "/server-config.json";

    private static final Gson GSON = new Gson();

    /** On/off feature toggles (config key is {@code <name>Enabled}). */
    private static final List<String> TOGGLES = List.of("showMobs", "showPlayers", "mapTiles", "autoStream");

    /** Dropdown controls published as {@code {enabled, options, default}}. */
    private static final List<String> SELECTS = List.of("mobUpdateRate", "playerUpdateRate");

    /** Slider controls published as {@code {enabled, min, max, default}}. */
    private static final List<String> SLIDERS = List.of(
            "chunksLoadedAtOnce", "spawnPerFrame", "spawnBudgetMs", "streamRadius",
            "mapTileRadius", "tilesLoadedAtOnce");

    private final JsonObject cfg;
    private final JsonObject defaults;

    private ServerControls(@Nonnull JsonObject cfg, @Nonnull JsonObject defaults) {
        this.cfg = cfg;
        this.defaults = defaults;
    }

    /**
     * Loads {@code server-config.json} from the data dir, copying the bundled default out on first run.
     *
     * @param warn sink for non-fatal startup warnings (missing file/keys, unknown keys, wrong types)
     * @throws IOException if the file is present but cannot be read or parsed (malformed JSON)
     */
    @Nonnull
    public static ServerControls load(@Nonnull Path dataDirectory, @Nonnull Consumer<String> warn) throws IOException {
        String defaultText = readBundledDefault();
        JsonObject defaults = JsonParser.parseString(defaultText).getAsJsonObject();
        Path file = dataDirectory.resolve(FILE_NAME);

        if (Files.notExists(file)) {
            warn.accept(FILE_NAME + " not found; writing defaults to " + file);
            Files.writeString(file, defaultText);
            return new ServerControls(defaults, defaults);
        }

        JsonObject parsed;
        try {
            JsonElement element = JsonParser.parseString(Files.readString(file));
            if (!element.isJsonObject()) {
                throw new IOException("Invalid " + FILE_NAME + " at " + file + ": expected a JSON object");
            }
            parsed = element.getAsJsonObject();
        } catch (JsonSyntaxException e) {
            throw new IOException("Malformed " + FILE_NAME + " at " + file + ": " + e.getMessage(), e);
        }

        validate(parsed, defaults, warn);
        return new ServerControls(parsed, defaults);
    }

    /** JSON object published to the client under {@code clientControls} in {@code /api/worlds}. */
    @Nonnull
    public String toClientJson() {
        JsonObject out = new JsonObject();
        for (String toggle : TOGGLES) {
            out.addProperty(toggle, boolAt(toggle + "Enabled", true));
        }
        for (String select : SELECTS) {
            out.add(select, selectJson(select));
        }
        for (String slider : SLIDERS) {
            out.add(slider, sliderJson(slider));
        }
        return GSON.toJson(out);
    }

    public boolean showMobs() {
        return boolAt("showMobsEnabled", true);
    }

    public boolean showPlayers() {
        return boolAt("showPlayersEnabled", true);
    }

    public boolean mapTiles() {
        return boolAt("mapTilesEnabled", true);
    }

    private JsonObject selectJson(@Nonnull String name) {
        JsonObject out = new JsonObject();
        out.addProperty("enabled", boolAt(name + "Enabled", true));
        out.add("options", pick(name + "Options"));
        out.add("default", pick(name + "Default"));
        return out;
    }

    private JsonObject sliderJson(@Nonnull String name) {
        if (name.equals("spawnPerFrame") || name.equals("spawnBudgetMs")) {
            return lockedPromotionSliderJson(name);
        }
        JsonObject out = new JsonObject();
        out.addProperty("enabled", boolAt(name + "Enabled", true));
        out.add("min", pick(name + "Min"));
        out.add("max", pick(name + "Max"));
        out.add("default", pick(name + "Default"));
        return out;
    }

    private JsonObject lockedPromotionSliderJson(@Nonnull String name) {
        int hardA = defaults.get(name + "Min").getAsInt();
        int hardB = defaults.get(name + "Max").getAsInt();
        int hardMin = Math.min(hardA, hardB);
        int hardMax = Math.max(hardA, hardB);
        int configuredA = clampToInt(finiteNumberAt(name + "Min", hardMin), hardMin, hardMax);
        int configuredB = clampToInt(finiteNumberAt(name + "Max", hardMax), hardMin, hardMax);
        int min = Math.min(configuredA, configuredB);
        int max = Math.max(configuredA, configuredB);
        int value = clampToInt(finiteNumberAt(name + "Default",
                defaults.get(name + "Default").getAsDouble()), min, max);

        JsonObject out = new JsonObject();
        // These two experimental pacing values are server-owned. The bundled range is the hard
        // safety envelope; configured bounds may narrow it but cannot expand it.
        out.addProperty("enabled", false);
        out.addProperty("min", min);
        out.addProperty("max", max);
        out.addProperty("default", value);
        return out;
    }

    private double finiteNumberAt(@Nonnull String key, double fallback) {
        JsonElement value = pick(key);
        if (!isNumber(value)) return fallback;
        double number = value.getAsDouble();
        return Double.isFinite(number) ? number : fallback;
    }

    private static int clampToInt(double value, int min, int max) {
        long rounded = Math.round(value);
        return (int) Math.min(max, Math.max(min, rounded));
    }

    /** Returns the configured value for a key, falling back to the default when absent or wrong-typed. */
    private JsonElement pick(@Nonnull String key) {
        JsonElement def = defaults.get(key);
        if (cfg.has(key) && !cfg.get(key).isJsonNull() && def != null && sameShape(cfg.get(key), def)) {
            return cfg.get(key);
        }
        return def;
    }

    private boolean boolAt(@Nonnull String key, boolean fallback) {
        if (isBoolean(cfg.get(key))) {
            return cfg.get(key).getAsBoolean();
        }
        if (isBoolean(defaults.get(key))) {
            return defaults.get(key).getAsBoolean();
        }
        return fallback;
    }

    private static void validate(@Nonnull JsonObject cfg, @Nonnull JsonObject defaults, @Nonnull Consumer<String> warn) {
        Set<String> known = knownKeys(defaults);
        for (String key : cfg.keySet()) {
            if (!known.contains(key)) {
                warn.accept(FILE_NAME + ": unknown key '" + key + "' (ignored)");
            }
        }
        for (String key : defaults.keySet()) {
            if (!cfg.has(key)) {
                warn.accept(FILE_NAME + ": missing key '" + key + "'; using default");
            } else if (!sameShape(cfg.get(key), defaults.get(key))) {
                warn.accept(FILE_NAME + ": key '" + key + "' has the wrong type; using default");
            }
        }
    }

    /** Default keys plus the optional {@code <range>Enabled} locks that admins may add. */
    @Nonnull
    private static Set<String> knownKeys(@Nonnull JsonObject defaults) {
        Set<String> known = new LinkedHashSet<>(defaults.keySet());
        for (String select : SELECTS) {
            known.add(select + "Enabled");
        }
        for (String slider : SLIDERS) {
            known.add(slider + "Enabled");
        }
        return known;
    }

    private static boolean sameShape(@Nonnull JsonElement actual, @Nonnull JsonElement expected) {
        if (expected.isJsonArray()) {
            return actual.isJsonArray();
        }
        if (isBoolean(expected)) {
            return isBoolean(actual);
        }
        if (isNumber(expected)) {
            return isNumber(actual);
        }
        return true;
    }

    private static boolean isBoolean(JsonElement element) {
        return element != null && element.isJsonPrimitive() && element.getAsJsonPrimitive().isBoolean();
    }

    private static boolean isNumber(JsonElement element) {
        return element != null && element.isJsonPrimitive() && element.getAsJsonPrimitive().isNumber();
    }

    @Nonnull
    private static String readBundledDefault() throws IOException {
        try (InputStream input = ServerControls.class.getResourceAsStream(RESOURCE_PATH)) {
            if (input == null) {
                throw new IOException("Bundled " + RESOURCE_PATH + " is missing from the jar");
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
