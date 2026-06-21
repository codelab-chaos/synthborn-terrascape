package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.codelabchaos.terrascape.config.TerrascapeConfig;
import com.hypixel.hytale.component.Archetype;
import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.ResourceType;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.spatial.SpatialResource;
import com.hypixel.hytale.math.vector.Transform;
import com.hypixel.hytale.server.core.entity.Entity;
import com.hypixel.hytale.server.core.entity.EntityUtils;
import com.hypixel.hytale.server.core.modules.entity.AllLegacyEntityTypesQuery;
import com.hypixel.hytale.server.core.modules.entity.AllLegacyLivingEntityTypesQuery;
import com.hypixel.hytale.server.core.modules.entity.EntityModule;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.tracker.EntityTrackerSystems;
import com.hypixel.hytale.server.core.modules.entity.tracker.NetworkId;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.npc.NPCPlugin;
import com.hypixel.hytale.server.npc.entities.NPCEntity;
import org.joml.Vector3d;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BiPredicate;
import java.util.logging.Level;
import java.util.stream.Collectors;

import static com.codelabchaos.terrascape.web.EntityFields.isDefinitelyNotMob;
import static com.codelabchaos.terrascape.web.EntityFields.liveNpcEntry;
import static com.codelabchaos.terrascape.web.EntityFields.nonMobReason;
import static com.codelabchaos.terrascape.web.EntityFields.safeHealth;
import static com.codelabchaos.terrascape.web.EntityFields.safeMobId;
import static com.codelabchaos.terrascape.web.EntityFields.safeMobRole;
import static com.codelabchaos.terrascape.web.EntityFields.safeMobType;
import static com.codelabchaos.terrascape.web.EntityFields.safeModelAssetId;
import static com.codelabchaos.terrascape.web.EntityFields.safeNpcNameTranslationKey;
import static com.codelabchaos.terrascape.web.EntityFields.safeNpcRoleIndex;
import static com.codelabchaos.terrascape.web.EntityFields.safeNpcRoleName;
import static com.codelabchaos.terrascape.web.EntityFields.safeNpcTypeIndex;
import static com.codelabchaos.terrascape.web.EntityFields.safePersistentModelAssetId;
import static com.codelabchaos.terrascape.web.EntityFields.safeYaw;
import static com.codelabchaos.terrascape.web.Json.escapeJson;
import static com.codelabchaos.terrascape.web.MobTaxonomy.categoryForMob;
import static com.codelabchaos.terrascape.web.MobTaxonomy.colorForMob;
import static com.codelabchaos.terrascape.web.MobTaxonomy.isSpawnMarkerType;
import static com.codelabchaos.terrascape.web.TerrascapeWebServer.MOB_RADAR_RADIUS;
import static com.codelabchaos.terrascape.web.TerrascapeWebServer.MOB_RADAR_RADIUS_SQ;

/**
 * Scans a world's entity store for nearby mobs/NPCs (via viewer, spatial, and archetype passes),
 * builds the {@code /api/mobs} feed and the {@code /api/mob-debug} report, and emits periodic
 * diagnostic logs. All entity-field reads go through {@link EntityFields}; classification through
 * {@link MobTaxonomy}.
 */
final class MobScanner {
    private final TerrascapeConfig config;
    private final TerrascapePlugin plugin;
    private final NpcRoleIndex npcRoleIndex;
    private final AtomicLong lastMobDebugLogMillis = new AtomicLong();
    private final ConcurrentHashMap<String, Integer> lastMobSamplePlayerCounts = new ConcurrentHashMap<>();

    MobScanner(@Nonnull TerrascapeConfig config, @Nonnull TerrascapePlugin plugin, @Nonnull NpcRoleIndex npcRoleIndex) {
        this.config = config;
        this.plugin = plugin;
        this.npcRoleIndex = npcRoleIndex;
    }

    MobFeedSnapshot snapshotMobs(@Nonnull World world) {
        Store<EntityStore> store = world.getEntityStore().getStore();
        Query<EntityStore> npcQuery = Archetype.of(NPCEntity.getComponentType());
        Query<EntityStore> legacyLivingQuery = Query.and(
                AllLegacyLivingEntityTypesQuery.INSTANCE,
                Archetype.of(TransformComponent.getComponentType()));
        Query<EntityStore> legacyEntityQuery = Query.and(
                AllLegacyEntityTypesQuery.INSTANCE,
                Archetype.of(TransformComponent.getComponentType()));
        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<Vector3d> playerPositions = playerPositionsForMobRadar(world);
        List<MobCandidate> candidates = new ArrayList<>();
        MobScanStats stats = new MobScanStats();
        initializeMobScanCounts(store, stats);
        Set<Integer> seenRefs = new HashSet<>();
        if (!playerPositions.isEmpty()) {
            collectMobSnapshotVisibleViewers(world, store, candidates, stats, seenRefs, playerPositions, npcRoleIndex);
            collectMobSnapshotSpatial(store, EntityModule.get().getNetworkSendableSpatialResourceType(),
                    candidates, stats, seenRefs, playerPositions, "NetworkSendableSpatial", npcRoleIndex);
            collectMobSnapshotSpatial(store, NPCPlugin.get().getNpcSpatialResource(),
                    candidates, stats, seenRefs, playerPositions, "NPCSpatial", npcRoleIndex);
            collectMobSnapshotSpatial(store, EntityModule.get().getEntitySpatialResourceType(),
                    candidates, stats, seenRefs, playerPositions, "EntitySpatial", npcRoleIndex);
            collectMobSnapshotPass(store, npcQuery, candidates, stats, seenRefs, playerPositions, "NPCEntity", npcRoleIndex);
            collectMobSnapshotPass(store, legacyLivingQuery, candidates, stats, seenRefs, playerPositions, "LegacyLivingEntity", npcRoleIndex);
            collectMobSnapshotPass(store, legacyEntityQuery, candidates, stats, seenRefs, playerPositions, "LegacyEntity", npcRoleIndex);
            collectMobSnapshotPass(store, transformQuery, candidates, stats, seenRefs, playerPositions, "TransformFallback", npcRoleIndex);
        }
        List<MobSnapshot> mobs = candidates.stream()
                .sorted(Comparator.comparingDouble(MobCandidate::distanceSq))
                .limit(config.entities().maxMobSnapshots())
                .map(MobCandidate::snapshot)
                .toList();
        logMobScan(world, store, stats, mobs);
        logMobConnectSampleIfNeeded(world, playerPositions.size(), stats, mobs);
        return new MobFeedSnapshot(mobs, stats, playerPositions.size(), MOB_RADAR_RADIUS, config.entities().maxMobSnapshots());
    }

    private static void initializeMobScanCounts(@Nonnull Store<EntityStore> store, @Nonnull MobScanStats stats) {
        stats.storeEntities = safeEntityCount(store, Archetype.of());
        stats.npcEntities = safeEntityCount(store, Archetype.of(NPCEntity.getComponentType()));
        stats.transformEntities = safeEntityCount(store, Archetype.of(TransformComponent.getComponentType()));
        stats.networkSendableEntities = safeEntityCount(store,
                Archetype.of(TransformComponent.getComponentType(), NetworkId.getComponentType()));
    }

    private static int safeEntityCount(@Nonnull Store<EntityStore> store, @Nonnull Query<EntityStore> query) {
        try {
            return store.getEntityCountFor(query);
        } catch (Exception ignored) {
            return -1;
        }
    }

    private static void collectMobSnapshotVisibleViewers(@Nonnull World world,
                                                         @Nonnull Store<EntityStore> store,
                                                         @Nonnull List<MobCandidate> candidates,
                                                         @Nonnull MobScanStats stats,
                                                         @Nonnull Set<Integer> seenRefs,
                                                         @Nonnull List<Vector3d> playerPositions,
                                                         @Nonnull NpcRoleIndex npcRoleIndex) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Ref<EntityStore> playerEntityRef = playerRef.getReference();
                if (playerEntityRef == null || !playerEntityRef.isValid()) {
                    continue;
                }
                EntityTrackerSystems.EntityViewer viewer = store.getComponent(
                        playerEntityRef,
                        EntityModule.get().getEntityViewerComponentType());
                if (viewer == null || viewer.visible == null) {
                    continue;
                }
                stats.addSource("EntityViewerVisible");
                stats.viewerVisible += viewer.visible.size();
                stats.viewerSent += viewer.sent == null ? 0 : viewer.sent.size();
                collectMobSnapshotRefs(store, viewer.visible, candidates, stats, seenRefs,
                        playerPositions, "EntityViewerVisible", npcRoleIndex);
            } catch (Exception ignored) {
                stats.errors++;
            }
        }
    }

    private static void collectMobSnapshotSpatial(
            @Nonnull Store<EntityStore> store,
            @Nonnull ResourceType<EntityStore, SpatialResource<Ref<EntityStore>, EntityStore>> resourceType,
            @Nonnull List<MobCandidate> candidates,
            @Nonnull MobScanStats stats,
            @Nonnull Set<Integer> seenRefs,
            @Nonnull List<Vector3d> playerPositions,
            @Nonnull String source,
            @Nonnull NpcRoleIndex npcRoleIndex) {
        try {
            SpatialResource<Ref<EntityStore>, EntityStore> spatial = store.getResource(resourceType);
            if (spatial == null) {
                return;
            }
            stats.addSource(source);
            stats.spatialSources++;
            stats.spatialIndexed += spatial.getSpatialStructure().size();
            for (Vector3d playerPosition : playerPositions) {
                List<Ref<EntityStore>> refs = new ArrayList<>();
                spatial.getSpatialStructure().collect(playerPosition, MOB_RADAR_RADIUS, refs);
                stats.spatialRefs += refs.size();
                collectMobSnapshotRefs(store, refs, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
            }
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static void collectMobSnapshotRefs(@Nonnull Store<EntityStore> store,
                                               @Nonnull Collection<Ref<EntityStore>> refs,
                                               @Nonnull List<MobCandidate> candidates,
                                               @Nonnull MobScanStats stats,
                                               @Nonnull Set<Integer> seenRefs,
                                               @Nonnull List<Vector3d> playerPositions,
                                               @Nonnull String source,
                                               @Nonnull NpcRoleIndex npcRoleIndex) {
        for (Ref<EntityStore> ref : refs) {
            collectMobSnapshotRef(store, ref, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
        }
    }

    private static void collectMobSnapshotRef(@Nonnull Store<EntityStore> store,
                                              @Nullable Ref<EntityStore> ref,
                                              @Nonnull List<MobCandidate> candidates,
                                              @Nonnull MobScanStats stats,
                                              @Nonnull Set<Integer> seenRefs,
                                              @Nonnull List<Vector3d> playerPositions,
                                              @Nonnull String source,
                                              @Nonnull NpcRoleIndex npcRoleIndex) {
        stats.entities++;
        try {
            if (ref == null || !ref.isValid()) {
                stats.invalidRefs++;
                return;
            }
            if (seenRefs.contains(ref.getIndex())) {
                stats.duplicates++;
                return;
            }
            if (store.getComponent(ref, PlayerRef.getComponentType()) != null) {
                stats.skippedPlayers++;
                return;
            }
            String nonMobReason = nonMobReason(store, ref);
            if (nonMobReason != null) {
                stats.addSkippedType(nonMobReason);
                stats.skippedNonMobs++;
                return;
            }
            TransformComponent transform = store.getComponent(ref, TransformComponent.getComponentType());
            if (transform == null) {
                stats.noTransform++;
                return;
            }
            Vector3d position = transform.getPosition();
            if (position == null) {
                stats.noPosition++;
                return;
            }
            double distanceSq = nearestDistanceSq(position, playerPositions);
            if (distanceSq > MOB_RADAR_RADIUS_SQ) {
                stats.skippedOutsideRadar++;
                return;
            }
            NPCEntity npc = store.getComponent(ref, NPCEntity.getComponentType());
            String type = safeMobType(store, ref, npc);
            if (isSpawnMarkerType(type)) {
                stats.addSkippedType(type);
                stats.skippedNonMobs++;
                return;
            }
            seenRefs.add(ref.getIndex());
            HealthSnapshot health = safeHealth(store, ref);
            String roleName = safeNpcRoleName(npc);
            String modelAsset = safeModelAssetId(store, ref);
            String persistentModelAsset = safePersistentModelAssetId(store, ref);
            NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
            if (liveRole != null) {
                stats.liveRoleMatches++;
            }
            String category = liveRole == null
                    ? categoryForMob(type)
                    : categoryForMob(type, liveRole.category());
            candidates.add(new MobCandidate(distanceSq, new MobSnapshot(
                    safeMobId(store, ref),
                    type,
                    safeMobRole(npc, null, type),
                    category,
                    position.x,
                    position.y,
                    position.z,
                    safeYaw(transform),
                    colorForMob(type),
                    source,
                    roleName,
                    safeNpcNameTranslationKey(npc),
                    safeNpcTypeIndex(npc),
                    safeNpcRoleIndex(npc),
                    modelAsset,
                    persistentModelAsset,
                    liveRole == null ? null : liveRole.id(),
                    liveRole == null ? null : liveRole.category(),
                    liveRole == null ? null : liveRole.pathHint(),
                    health.health(),
                    health.maxHealth())));
            stats.accepted++;
            stats.addType(type);
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static void collectMobSnapshotPass(@Nonnull Store<EntityStore> store,
                                               @Nonnull Query<EntityStore> query,
                                               @Nonnull List<MobCandidate> candidates,
                                               @Nonnull MobScanStats stats,
                                               @Nonnull Set<Integer> seenRefs,
                                               @Nonnull List<Vector3d> playerPositions,
                                               @Nonnull String source,
                                               @Nonnull NpcRoleIndex npcRoleIndex) {
        BiPredicate<ArchetypeChunk<EntityStore>, CommandBuffer<EntityStore>> collector = (chunk, ignored) -> {
            collectMobSnapshots(store, chunk, candidates, stats, seenRefs, playerPositions, source, npcRoleIndex);
            return true;
        };
        store.forEachChunk(query, collector);
    }

    private static void collectMobSnapshots(@Nonnull Store<EntityStore> store,
                                            @Nonnull ArchetypeChunk<EntityStore> chunk,
                                            @Nonnull List<MobCandidate> candidates,
                                            @Nonnull MobScanStats stats,
                                            @Nonnull Set<Integer> seenRefs,
                                            @Nonnull List<Vector3d> playerPositions,
                                            @Nonnull String source,
                                            @Nonnull NpcRoleIndex npcRoleIndex) {
        stats.chunks++;
        stats.addSource(source);
        stats.addArchetype(chunk.getArchetype().toString());
        for (int index = 0; index < chunk.size(); index++) {
            stats.entities++;
            try {
                Ref<EntityStore> ref = chunk.getReferenceTo(index);
                if (ref == null || !ref.isValid()) {
                    stats.invalidRefs++;
                    continue;
                }
                if (seenRefs.contains(ref.getIndex())) {
                    stats.duplicates++;
                    continue;
                }
                if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
                    stats.skippedPlayers++;
                    continue;
                }
                if (isDefinitelyNotMob(chunk, index)) {
                    stats.skippedNonMobs++;
                    continue;
                }
                TransformComponent transform = store.getComponent(ref, TransformComponent.getComponentType());
                if (transform == null) {
                    stats.noTransform++;
                    continue;
                }
                Vector3d position = transform.getPosition();
                if (position == null) {
                    stats.noPosition++;
                    continue;
                }
                double distanceSq = nearestDistanceSq(position, playerPositions);
                if (distanceSq > MOB_RADAR_RADIUS_SQ) {
                    stats.skippedOutsideRadar++;
                    continue;
                }
                NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                Entity entity = EntityUtils.getEntity(index, chunk);
                String type = safeMobType(chunk, index, npc, entity);
                if (isSpawnMarkerType(type)) {
                    stats.addSkippedType(type);
                    stats.skippedNonMobs++;
                    continue;
                }
                seenRefs.add(ref.getIndex());
                HealthSnapshot health = safeHealth(store, ref);
                String roleName = safeNpcRoleName(npc);
                String modelAsset = safeModelAssetId(chunk, index);
                String persistentModelAsset = safePersistentModelAssetId(chunk, index);
                NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
                if (liveRole != null) {
                    stats.liveRoleMatches++;
                }
                String category = liveRole == null
                        ? categoryForMob(type)
                        : categoryForMob(type, liveRole.category());
                candidates.add(new MobCandidate(distanceSq, new MobSnapshot(
                        safeMobId(chunk, index, ref),
                        type,
                        safeMobRole(npc, entity, type),
                        category,
                        position.x,
                        position.y,
                        position.z,
                        safeYaw(transform),
                        colorForMob(type),
                        source,
                        roleName,
                        safeNpcNameTranslationKey(npc),
                        safeNpcTypeIndex(npc),
                        safeNpcRoleIndex(npc),
                        modelAsset,
                        persistentModelAsset,
                        liveRole == null ? null : liveRole.id(),
                        liveRole == null ? null : liveRole.category(),
                        liveRole == null ? null : liveRole.pathHint(),
                        health.health(),
                        health.maxHealth())));
                stats.accepted++;
                stats.addType(type);
            } catch (Exception ignored) {
                // Individual NPC refs can unload while the ECS chunk is being copied.
                stats.errors++;
            }
        }
    }

    private static List<Vector3d> playerPositionsForMobRadar(@Nonnull World world) {
        List<Vector3d> playerPositions = new ArrayList<>();
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Transform transform = playerRef.getTransform();
                if (transform != null && transform.getPosition() != null) {
                    playerPositions.add(new Vector3d(transform.getPosition()));
                }
            } catch (Exception ignored) {
            }
        }
        return playerPositions;
    }

    private void logMobScan(@Nonnull World world, @Nonnull Store<EntityStore> store,
                            @Nonnull MobScanStats stats, @Nonnull List<MobSnapshot> mobs) {
        long now = System.currentTimeMillis();
        long last = lastMobDebugLogMillis.get();
        if (now - last < 10_000L) {
            return;
        }
        if (!lastMobDebugLogMillis.compareAndSet(last, now)) {
            return;
        }

        String firstMob = mobs.isEmpty() ? "none" : mobs.stream()
                .limit(5)
                .map(mob -> mob.type() + "@" + Math.round(mob.x()) + "," + Math.round(mob.y()) + "," + Math.round(mob.z()))
                .collect(Collectors.joining(";"));
        plugin.getLogger().at(Level.INFO).log("[mob-feed] world=" + world.getName()
                + " storeEntities=" + stats.storeEntities
                + " npcEntities=" + stats.npcEntities
                + " transformEntities=" + stats.transformEntities
                + " networkSendableEntities=" + stats.networkSendableEntities
                + " chunks=" + stats.chunks
                + " entities=" + stats.entities
                + " accepted=" + stats.accepted
                + " duplicates=" + stats.duplicates
                + " players=" + stats.skippedPlayers
                + " nonMob=" + stats.skippedNonMobs
                + " outsideRadar=" + stats.skippedOutsideRadar
                + " radar=" + Math.round(MOB_RADAR_RADIUS)
                + " invalid=" + stats.invalidRefs
                + " noTransform=" + stats.noTransform
                + " noPosition=" + stats.noPosition
                + " errors=" + stats.errors
                + " viewerVisible=" + stats.viewerVisible
                + " viewerSent=" + stats.viewerSent
                + " spatialSources=" + stats.spatialSources
                + " spatialIndexed=" + stats.spatialIndexed
                + " spatialRefs=" + stats.spatialRefs
                + " types=" + stats.preview(stats.acceptedTypes)
                + " skippedTypes=" + stats.preview(stats.skippedTypes)
                + " sources=" + stats.preview(stats.sources)
                + " archetypes=" + stats.preview(stats.archetypes)
                + " first=" + firstMob
                + " nearby=" + nearbyTransformPreview(world, store));
    }

    private void logMobConnectSampleIfNeeded(@Nonnull World world, int players,
                                             @Nonnull MobScanStats stats,
                                             @Nonnull List<MobSnapshot> mobs) {
        Integer previous = lastMobSamplePlayerCounts.put(world.getName(), players);
        if (players <= 0 || (previous != null && previous >= players)) {
            return;
        }
        String nearest = mobs.stream()
                .limit(12)
                .map(mob -> mob.type()
                        + "@" + Math.round(mob.x()) + "," + Math.round(mob.y()) + "," + Math.round(mob.z())
                        + (mob.liveRoleId() == null ? "" : " role=" + mob.liveRoleId()))
                .collect(Collectors.joining(";"));
        plugin.getLogger().at(Level.INFO).log("[mob-connect-sample] world=" + world.getName()
                + " players=" + players
                + " mobs=" + mobs.size()
                + " types=" + stats.preview(stats.acceptedTypes)
                + " skippedTypes=" + stats.preview(stats.skippedTypes)
                + " sources=" + stats.preview(stats.sources)
                + " npcIndexLoaded=" + npcRoleIndex.isLoaded()
                + " npcIndexSize=" + npcRoleIndex.size()
                + " nearest=" + (nearest.isBlank() ? "none" : nearest));
    }

    private static String nearbyTransformPreview(@Nonnull World world, @Nonnull Store<EntityStore> store) {
        List<Vector3d> playerPositions = new ArrayList<>();
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Transform transform = playerRef.getTransform();
                if (transform != null && transform.getPosition() != null) {
                    playerPositions.add(new Vector3d(transform.getPosition()));
                }
            } catch (Exception ignored) {
            }
        }
        if (playerPositions.isEmpty()) {
            return "no-players";
        }

        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<NearbyCandidate> candidates = new ArrayList<>();
        store.forEachChunk(transformQuery, (chunk, ignored) -> {
            for (int index = 0; index < chunk.size(); index++) {
                TransformComponent transform = chunk.getComponent(index, TransformComponent.getComponentType());
                if (transform == null || transform.getPosition() == null) {
                    continue;
                }
                Vector3d position = transform.getPosition();
                double distanceSq = nearestDistanceSq(position, playerPositions);
                if (distanceSq > 120.0d * 120.0d) {
                    continue;
                }
                Ref<EntityStore> ref = chunk.getReferenceTo(index);
                NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                Entity entity = EntityUtils.getEntity(index, chunk);
                String type = safeMobType(chunk, index, npc, entity);
                String flags = "";
                if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
                    flags += " player";
                }
                if (isDefinitelyNotMob(chunk, index)) {
                    flags += " nonmob";
                }
                if (isSpawnMarkerType(type)) {
                    flags += " spawnmarker";
                }
                candidates.add(new NearbyCandidate(
                        ref == null ? -1 : ref.getIndex(),
                        type,
                        Math.sqrt(distanceSq),
                        position.x,
                        position.y,
                        position.z,
                        flags.trim()));
            }
            return true;
        });

        if (candidates.isEmpty()) {
            return "none-within-120";
        }
        return candidates.stream()
                .sorted(Comparator.comparingDouble(NearbyCandidate::distance))
                .limit(12)
                .map(NearbyCandidate::summary)
                .collect(Collectors.joining(";"));
    }

    String mobDebugJson(@Nonnull World world) {
        Store<EntityStore> store = world.getEntityStore().getStore();
        MobScanStats stats = new MobScanStats();
        initializeMobScanCounts(store, stats);
        collectMobDebugViewerStats(world, store, stats);
        collectMobDebugSpatialStats(store, EntityModule.get().getNetworkSendableSpatialResourceType(), stats);
        collectMobDebugSpatialStats(store, NPCPlugin.get().getNpcSpatialResource(), stats);
        collectMobDebugSpatialStats(store, EntityModule.get().getEntitySpatialResourceType(), stats);
        List<Vector3d> playerPositions = playerPositionsForMobRadar(world);
        Query<EntityStore> transformQuery = Archetype.of(TransformComponent.getComponentType());
        List<NearbyDebugCandidate> candidates = new ArrayList<>();
        store.forEachChunk(transformQuery, (chunk, ignored) -> {
            for (int index = 0; index < chunk.size(); index++) {
                try {
                    TransformComponent transform = chunk.getComponent(index, TransformComponent.getComponentType());
                    if (transform == null || transform.getPosition() == null) {
                        continue;
                    }
                    Vector3d position = transform.getPosition();
                    double distanceSq = playerPositions.isEmpty()
                            ? 0.0d
                            : nearestDistanceSq(position, playerPositions);
                    Ref<EntityStore> ref = chunk.getReferenceTo(index);
                    NPCEntity npc = chunk.getComponent(index, NPCEntity.getComponentType());
                    Entity entity = EntityUtils.getEntity(index, chunk);
                    String type = safeMobType(chunk, index, npc, entity);
                    String roleName = safeNpcRoleName(npc);
                    String modelAsset = safeModelAssetId(chunk, index);
                    String persistentModelAsset = safePersistentModelAssetId(chunk, index);
                    NpcRoleIndex.Entry liveRole = liveNpcEntry(npcRoleIndex, type, roleName, modelAsset, persistentModelAsset);
                    String reason = debugMobReason(chunk, index, type, playerPositions, distanceSq);
                    candidates.add(new NearbyDebugCandidate(
                            ref == null ? -1 : ref.getIndex(),
                            type,
                            reason,
                            Math.sqrt(distanceSq),
                            position.x,
                            position.y,
                            position.z,
                            npc != null,
                            chunk.getComponent(index, PlayerRef.getComponentType()) != null,
                            roleName,
                            modelAsset,
                            persistentModelAsset,
                            liveRole == null ? null : liveRole.id(),
                            chunk.getArchetype().toString()));
                } catch (Exception ignoredCandidate) {
                }
            }
            return true;
        });

        String candidateJson = candidates.stream()
                .sorted(Comparator.comparingDouble(NearbyDebugCandidate::distance))
                .limit(96)
                .map(NearbyDebugCandidate::toJson)
                .collect(Collectors.joining(","));
        return "{\"ok\":true,\"world\":\"" + escapeJson(world.getName()) + "\""
                + ",\"players\":" + playerPositions.size()
                + ",\"radar\":" + Math.round(MOB_RADAR_RADIUS)
                + ",\"sourceStats\":" + stats.toJson()
                + ",\"candidates\":[" + candidateJson + "]}";
    }

    private static void collectMobDebugViewerStats(@Nonnull World world,
                                                   @Nonnull Store<EntityStore> store,
                                                   @Nonnull MobScanStats stats) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            try {
                Ref<EntityStore> playerEntityRef = playerRef.getReference();
                if (playerEntityRef == null || !playerEntityRef.isValid()) {
                    continue;
                }
                EntityTrackerSystems.EntityViewer viewer = store.getComponent(
                        playerEntityRef,
                        EntityModule.get().getEntityViewerComponentType());
                if (viewer == null || viewer.visible == null) {
                    continue;
                }
                stats.addSource("EntityViewerVisible");
                stats.viewerVisible += viewer.visible.size();
                stats.viewerSent += viewer.sent == null ? 0 : viewer.sent.size();
            } catch (Exception ignored) {
                stats.errors++;
            }
        }
    }

    private static void collectMobDebugSpatialStats(
            @Nonnull Store<EntityStore> store,
            @Nonnull ResourceType<EntityStore, SpatialResource<Ref<EntityStore>, EntityStore>> resourceType,
            @Nonnull MobScanStats stats) {
        try {
            SpatialResource<Ref<EntityStore>, EntityStore> spatial = store.getResource(resourceType);
            if (spatial == null) {
                return;
            }
            stats.spatialSources++;
            stats.spatialIndexed += spatial.getSpatialStructure().size();
        } catch (Exception ignored) {
            stats.errors++;
        }
    }

    private static String debugMobReason(@Nonnull ArchetypeChunk<EntityStore> chunk,
                                         int index,
                                         @Nonnull String type,
                                         @Nonnull List<Vector3d> playerPositions,
                                         double distanceSq) {
        if (chunk.getComponent(index, PlayerRef.getComponentType()) != null) {
            return "player";
        }
        String nonMobReason = nonMobReason(chunk, index);
        if (nonMobReason != null) {
            return "technical_" + nonMobReason;
        }
        if (isSpawnMarkerType(type)) {
            return "technical_marker";
        }
        if (playerPositions.isEmpty()) {
            return "no_player_anchor";
        }
        if (distanceSq > MOB_RADAR_RADIUS_SQ) {
            return "outside_radar";
        }
        return "accepted";
    }

    private static double nearestDistanceSq(@Nonnull Vector3d position, @Nonnull List<Vector3d> playerPositions) {
        double best = Double.MAX_VALUE;
        for (Vector3d playerPosition : playerPositions) {
            double dx = position.x - playerPosition.x;
            double dy = position.y - playerPosition.y;
            double dz = position.z - playerPosition.z;
            double distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < best) {
                best = distanceSq;
            }
        }
        return best;
    }
}
