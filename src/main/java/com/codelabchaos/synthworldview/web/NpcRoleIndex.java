package com.codelabchaos.synthworldview.web;

import com.hypixel.hytale.server.npc.AllNPCsLoadedEvent;
import com.hypixel.hytale.server.npc.asset.builder.BuilderInfo;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.nio.file.Path;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Live NPC role index populated from Hytale's loaded NPC registry.
 *
 * <p>This mirrors the SynthOverseer pattern: keep a tiny id -> source path map from
 * {@link AllNPCsLoadedEvent}, then let richer consumers decide how much detail to read.
 * Worldview uses it to confirm map-card role ids against the running server instead of
 * relying only on the generated asset snapshot.
 */
public final class NpcRoleIndex {
    private static final Logger LOG = Logger.getLogger(NpcRoleIndex.class.getName());

    private volatile Map<String, Entry> entries = Map.of();
    private volatile Map<String, String> lowerToCanonical = Map.of();

    public void subscribe(@Nonnull com.hypixel.hytale.event.EventRegistry registry) {
        registry.register(AllNPCsLoadedEvent.class, this::onAllNPCsLoaded);
    }

    private void onAllNPCsLoaded(@Nonnull AllNPCsLoadedEvent event) {
        Int2ObjectMap<BuilderInfo> loaded = event.getLoadedNPCs();
        Map<String, Entry> next = new LinkedHashMap<>(loaded.size());
        int withPath = 0;
        int withoutPath = 0;
        for (BuilderInfo info : loaded.values()) {
            String id = info.getKeyName();
            if (id == null || id.isBlank()) {
                continue;
            }
            Path path = info.getPath();
            if (path == null) {
                withoutPath++;
            } else {
                withPath++;
            }
            next.put(id, new Entry(id, path, categoryFromPath(path)));
        }

        Map<String, String> lower = new LinkedHashMap<>(next.size());
        for (String id : next.keySet()) {
            lower.put(id.toLowerCase(Locale.ROOT), id);
        }
        entries = Collections.unmodifiableMap(next);
        lowerToCanonical = Collections.unmodifiableMap(lower);
        LOG.info("[worldview-npc-index] indexed " + next.size() + " NPC ids ("
                + withPath + " with source path, " + withoutPath + " path-less)");
    }

    public int size() {
        return entries.size();
    }

    public boolean isLoaded() {
        return !entries.isEmpty();
    }

    @Nullable
    public Entry resolve(@Nullable String candidate) {
        String id = canonicalize(candidate);
        return id == null ? null : entries.get(id);
    }

    @Nullable
    public String canonicalize(@Nullable String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return null;
        }
        Map<String, Entry> snap = entries;
        if (snap.containsKey(candidate)) {
            return candidate;
        }
        String lower = candidate.toLowerCase(Locale.ROOT);
        String exact = lowerToCanonical.get(lower);
        if (exact != null) {
            return exact;
        }
        String stripped = stripRuntimeSuffix(candidate);
        if (!stripped.equals(candidate)) {
            exact = lowerToCanonical.get(stripped.toLowerCase(Locale.ROOT));
            if (exact != null) {
                return exact;
            }
        }
        return null;
    }

    @Nullable
    private static String categoryFromPath(@Nullable Path path) {
        if (path == null) {
            return null;
        }
        String value = path.toString().replace('\\', '/');
        int rolesIdx = value.lastIndexOf("/NPC/Roles/");
        if (rolesIdx < 0) {
            return null;
        }
        String after = value.substring(rolesIdx + "/NPC/Roles/".length());
        int lastSlash = after.lastIndexOf('/');
        return lastSlash < 0 ? null : after.substring(0, lastSlash);
    }

    @Nonnull
    private static String stripRuntimeSuffix(@Nonnull String value) {
        return value
                .replaceAll("(?i)_Wander$", "")
                .replaceAll("(?i)_Patrol$", "");
    }

    public record Entry(@Nonnull String id, @Nullable Path path, @Nullable String category) {
        @Nullable
        public String pathHint() {
            return path == null ? null : path.toString().replace('\\', '/');
        }
    }
}
