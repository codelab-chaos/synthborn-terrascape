package com.codelabchaos.terrascape.config;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerControlsTest {
    @TempDir
    Path tempDir;

    private final List<String> warnings = new ArrayList<>();

    private ServerControls load() throws IOException {
        return ServerControls.load(tempDir, warnings::add);
    }

    private Path file() {
        return tempDir.resolve(ServerControls.FILE_NAME);
    }

    @Test
    void firstRunWritesDefaultsAndWarns() throws IOException {
        ServerControls controls = load();

        assertTrue(Files.isRegularFile(file()));
        assertTrue(warnings.stream().anyMatch(w -> w.contains("not found")));
        // Bundled defaults have everything enabled.
        assertTrue(controls.showMobs());
        assertTrue(controls.showPlayers());
        assertTrue(controls.mapTiles());
    }

    @Test
    void reloadingTheWrittenDefaultFileProducesNoWarnings() throws IOException {
        load();             // first run writes the default file
        warnings.clear();
        load();             // second run reads a complete, valid file

        assertTrue(warnings.isEmpty(), () -> "unexpected warnings: " + warnings);
    }

    @Test
    void editedToggleIsHonored() throws IOException {
        load();             // write defaults
        String edited = Files.readString(file()).replace("\"showMobsEnabled\": true", "\"showMobsEnabled\": false");
        Files.writeString(file(), edited);
        warnings.clear();

        ServerControls controls = load();
        assertFalse(controls.showMobs());
        assertTrue(controls.showPlayers());
        assertTrue(warnings.isEmpty(), () -> "unexpected warnings: " + warnings);
    }

    @Test
    void unknownKeyIsWarnedAndIgnored() throws IOException {
        Files.writeString(file(), "{\"bogusKey\": 1}");
        load();
        assertTrue(warnings.stream().anyMatch(w -> w.contains("unknown key") && w.contains("bogusKey")));
    }

    @Test
    void missingKeyWarnsAndFallsBackToDefault() throws IOException {
        Files.writeString(file(), "{}"); // every key missing
        ServerControls controls = load();
        assertTrue(warnings.stream().anyMatch(w -> w.contains("missing key") && w.contains("showMobsEnabled")));
        assertTrue(controls.showMobs()); // default
    }

    @Test
    void wrongTypeWarnsAndFallsBackToDefault() throws IOException {
        Files.writeString(file(), "{\"showMobsEnabled\": \"yes\"}");
        ServerControls controls = load();
        assertTrue(warnings.stream().anyMatch(w -> w.contains("wrong type") && w.contains("showMobsEnabled")));
        assertTrue(controls.showMobs()); // string is rejected, default wins
    }

    @Test
    void malformedJsonIsAHardError() throws IOException {
        Files.writeString(file(), "{ not valid json");
        assertThrows(IOException.class, this::load);
    }

    @Test
    void nonObjectJsonIsAHardError() throws IOException {
        Files.writeString(file(), "[1, 2, 3]");
        assertThrows(IOException.class, this::load);
    }

    @Test
    void clientJsonExposesTogglesSelectsAndSliders() throws IOException {
        ServerControls controls = load();
        JsonObject out = JsonParser.parseString(controls.toClientJson()).getAsJsonObject();

        // toggle → boolean
        assertTrue(out.get("showMobs").getAsBoolean());
        // select → {enabled, options[], default}
        JsonObject mobRate = out.getAsJsonObject("mobUpdateRate");
        assertTrue(mobRate.get("enabled").getAsBoolean());
        assertTrue(mobRate.get("options").isJsonArray());
        assertEquals(0.2, mobRate.get("default").getAsDouble());
        // slider → {enabled, min, max, default}
        JsonObject chunks = out.getAsJsonObject("chunksLoadedAtOnce");
        assertEquals(1, chunks.get("min").getAsInt());
        assertEquals(12, chunks.get("max").getAsInt());
        assertEquals(4, chunks.get("default").getAsInt());
    }

    @Test
    void rangeEnabledLockIsAKnownKey() throws IOException {
        load(); // write defaults
        String edited = Files.readString(file())
                .replace("\"mobUpdateRateOptions\"", "\"mobUpdateRateEnabled\": false,\n  \"mobUpdateRateOptions\"");
        Files.writeString(file(), edited);
        warnings.clear();

        ServerControls controls = load();
        // The optional <select>Enabled lock must not be flagged as unknown.
        assertTrue(warnings.stream().noneMatch(w -> w.contains("unknown key")),
                () -> "unexpected warnings: " + warnings);
        JsonObject out = JsonParser.parseString(controls.toClientJson()).getAsJsonObject();
        assertFalse(out.getAsJsonObject("mobUpdateRate").get("enabled").getAsBoolean());
    }
}
