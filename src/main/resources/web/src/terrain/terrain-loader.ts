import * as THREE from 'three';
import { createChunkDebug } from './chunk-debug.ts';
import { applyLightingToObject, createTreeShadeObject } from '../scene/lighting.ts';
import { logClientEvent, logClientTiming } from '../platform/client-log.ts';
import {
  horizonMapKeys,
} from '../common/map-layer-policy.ts';
import {
  loadMapTilesForKeys,
  sampleMapBackdropColor,
} from '../tile-map/map-backdrop.ts';
import { chunkKeysForWorld, sortChunkKeysByPlayerDistance } from '../common/chunk-planning.ts';
import { createTerrainStreamStats, terrainStreamSnapshot } from '../common/terrain-stream.ts';
import { disposeObjectTree } from '../common/resource-stats.ts';
import {
  fetchArrayBufferWithRetry,
  loadTerrainChunkData,
  parseGltfBytes,
  readCosmeticOverlayBytes,
  terrainUrl,
  writeCosmeticOverlayCache,
  writeTerrainChunkCache,
} from './terrain-source.ts';
import { centerId, chunkId } from '../common/utils.ts';
import {
  applyWaterModeToObject,
  prepareWaterMaterials,
  tintWaterMaterialsFromMap,
} from '../scene/water.ts';
import { confirmAction } from '../library/confirm-dialog.ts';
import { clearMeshCache, getMeshCacheStats } from '../platform/mesh-cache.ts';
import {
  chunkLandMotion,
  chunkPlaceholderManager,
  disposalStats,
  frameJank,
  loadedChunks,
  runtime,
  scene,
  setStatus,
} from '../scene/scene-context.ts';
import {
  AUTO_STREAM_RETAIN_MARGIN,
  cosmeticBlocksSplit,
  landMotionEnabled,
  mapTileRetainRadius,
  radiusValue,
  setRadiusControlValue,
  terrainLoadConcurrency,
  terrainPromotionBudgetMs,
  terrainPromotionsPerFrame,
  waterModeValue,
} from '../ui/control-readers.ts';
import { maybeUpdateMetrics, updateMetrics } from '../ui/metrics.ts';
import { currentLightingOptions } from '../scene/lighting-controls.ts';
import { syncMapTileLayer, updateMapTileLayer } from '../tile-map/map-tile-layer.ts';
import { focusGrid, playerChunk } from '../camera/camera-director.ts';
import { saveViewState } from '../ui/view-persistence.ts';
import {
  autoStreamInput,
  chunkXInput,
  chunkZInput,
  clearMeshCacheButton,
  debugBoundsInput,
  mapTilesInput,
  waterModeInput,
  worldSelect,
} from '../ui/dom.ts';

const AUTO_STREAM_DEBOUNCE_MS = 250;
const TERRAIN_STREAM_PROGRESS_LOG_MS = 1000;

function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function maybeLogTerrainStreamProgress(stats, queueLength, inFlightCount, force = false, final = false) {
  const now = performance.now();
  if (!force && now - stats.lastProgressLogAt < TERRAIN_STREAM_PROGRESS_LOG_MS) {
    return;
  }
  stats.lastProgressLogAt = now;
  logClientEvent(
    final ? 'terrain_stream_summary' : 'terrain_stream_progress',
    terrainStreamSnapshot(stats, queueLength, inFlightCount, {
      final,
      now,
      loadSlots: terrainLoadConcurrency(),
      spawnFrame: terrainPromotionsPerFrame(),
      spawnBudgetMs: terrainPromotionBudgetMs(),
    }),
  );
}

export async function handleClearMeshCache() {
  const stats = await getMeshCacheStats();
  const entryLabel = stats.total === 1 ? 'entry' : 'entries';
  const confirmed = await confirmAction({
    title: 'Clear mesh cache?',
    message: stats.total > 0
      ? `Delete ${stats.total} cached ${entryLabel} from this browser (${stats.terrain} terrain meshes, ${stats.mapTiles} map tiles). Visible chunks will reload from the server.`
      : 'No cached mesh data was found in this browser. Reload visible chunks anyway?',
    confirmLabel: 'Clear cache',
    cancelLabel: 'Cancel',
  });
  if (!confirmed) {
    return;
  }

  clearMeshCacheButton.disabled = true;
  setStatus('Clearing mesh cache…');
  try {
    const cleared = await clearMeshCache();
    for (const [id, entry] of Array.from(loadedChunks.entries())) {
      finishDisposeChunk(id, entry);
    }
    runtime.mapTileLayerKey = null;
    updateMapTileLayer({ force: true });
    scheduleControlGridLoad();
    const clearedLabel = cleared.total === 1 ? 'entry' : 'entries';
    setStatus(cleared.total > 0
      ? `Cleared ${cleared.total} cached ${clearedLabel}; reloading meshes`
      : 'Mesh cache already empty; reloading from server');
    logClientEvent('mesh_cache_cleared', {
      terrain: cleared.terrain,
      mapTiles: cleared.mapTiles,
      total: cleared.total,
    });
  } catch (error) {
    setStatus(`Mesh cache clear failed: ${error?.message || error}`);
    logClientEvent('mesh_cache_clear_failed', {
      message: error?.message || String(error),
    });
  } finally {
    clearMeshCacheButton.disabled = false;
  }
}

export async function loadGrid(options = {}) {
  runtime.gridLoadCount++;
  const gridStarted = performance.now();
  const world = worldSelect.value;
  const centerX = options.centerX ?? Number.parseInt(chunkXInput.value, 10);
  const centerZ = options.centerZ ?? Number.parseInt(chunkZInput.value, 10);
  const radius = setRadiusControlValue(radiusValue());
  if (!world || Number.isNaN(centerX) || Number.isNaN(centerZ)) {
    setStatus('Choose a world and integer chunk coordinates');
    return;
  }

  const generation = ++runtime.loadGeneration;
  pruneOrphanChunkWrappers();
  const centerKey = centerId(world, centerX, centerZ);
  runtime.requestedCenterId = centerKey;
  runtime.scheduledCenterId = null;
  chunkXInput.value = centerX;
  chunkZInput.value = centerZ;

  if (options.focus === true && !runtime.hasFocusedInitialGrid) {
    focusGrid(centerX, centerZ, radius);
    runtime.hasFocusedInitialGrid = true;
  }

  const needed = chunkKeysForWorld(world, centerX, centerZ, radius);
  const retainKeys = options.streamLoad === true
    ? chunkKeysForWorld(world, centerX, centerZ, radius + AUTO_STREAM_RETAIN_MARGIN)
    : needed;
  const mapRetainRadius = mapTileRetainRadius(radius, options.streamLoad === true);
  const mapRetainKeys = chunkKeysForWorld(world, centerX, centerZ, mapRetainRadius);
  const streamAnchor = playerChunk();
  retainOnly(world, retainKeys);
  syncMapTileLayer(mapRetainKeys);
  if (mapTilesInput.checked) {
    const horizonKeys = horizonMapKeys(needed, mapRetainKeys);
    if (horizonKeys.length > 0) {
      void loadMapTilesForKeys(
        world,
        sortChunkKeysByPlayerDistance(horizonKeys, streamAnchor.chunkX, streamAnchor.chunkZ),
        { immediate: true, replace: true },
      );
    }
  }
  updateMetrics();

  setStatus(`Loading ${needed.length} chunks around ${centerX}, ${centerZ}`);
  let completed = 0;
  let failed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let cacheReadMs = 0;
  let cacheParseMs = 0;
  const missing = [];
  for (const key of needed) {
    if (generation !== runtime.loadGeneration) return;
    if (loadedChunks.has(key.id)) {
      completed++;
    } else {
      missing.push(key);
    }
  }
  chunkPlaceholderManager.sync(world, needed, new Set(loadedChunks.keys()));
  frameJank.setActiveLoadKind('grid');
  if (missing.length > 1) {
    missing.splice(0, missing.length, ...sortChunkKeysByPlayerDistance(missing, streamAnchor.chunkX, streamAnchor.chunkZ));
  }
  try {
    let networkChunks = 0;
    const promotionQueue = [];
    let nextMissing = 0;
    const inFlight = new Set();
    const loadConcurrency = terrainLoadConcurrency();
    const streamStats = createTerrainStreamStats(
      world,
      centerX,
      centerZ,
      radius,
      needed.length,
      completed,
      missing.length,
      gridStarted,
    );

    const enqueueNext = () => {
      if (nextMissing >= missing.length || generation !== runtime.loadGeneration) return;
      const key = missing[nextMissing++];
      streamStats.requested++;
      const task = loadTerrainChunkData(world, key, generation)
        .then((result) => {
          if (result.cacheReadMs) cacheReadMs += result.cacheReadMs;
          if (result.cacheParseMs) cacheParseMs += result.cacheParseMs;
          if (result.cacheHit) {
            cacheHits++;
            streamStats.cacheHits++;
          }
          if (result.cacheMiss) {
            cacheMisses++;
            streamStats.cacheMisses++;
          }
          if (result.network) {
            networkChunks++;
            streamStats.networkChunks++;
          }
          result.readyAt = performance.now();
          streamStats.dataReady++;
          promotionQueue.push(result);
          streamStats.maxQueue = Math.max(streamStats.maxQueue, promotionQueue.length);
          maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size);
        })
        .catch((error) => {
          streamStats.dataReady++;
          promotionQueue.push({
            ok: false,
            key,
            error,
            readyAt: performance.now(),
            cacheReadMs: 0,
            cacheParseMs: 0,
            cacheHit: false,
            cacheMiss: true,
            network: false,
          });
          streamStats.maxQueue = Math.max(streamStats.maxQueue, promotionQueue.length);
          maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size);
        })
        .finally(() => {
          inFlight.delete(task);
        });
      inFlight.add(task);
    };

    while (inFlight.size < loadConcurrency && nextMissing < missing.length) {
      enqueueNext();
    }

    while ((inFlight.size > 0 || promotionQueue.length > 0) && generation === runtime.loadGeneration) {
      while (inFlight.size < loadConcurrency && nextMissing < missing.length) {
        enqueueNext();
      }

      const promoted = promoteTerrainResults(promotionQueue, generation, streamStats);
      completed += promoted.completed;
      failed += promoted.failed;
      if (promoted.completed > 0 || promoted.failed > 0) {
        setStatus(`Loaded ${completed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
        maybeUpdateMetrics(true);
        maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size, promoted.yielded);
        if (promoted.yielded) {
          await yieldToMain();
          continue;
        }
      }

      if (promotionQueue.length === 0 && inFlight.size > 0) {
        await Promise.race([...inFlight]);
      } else if (promotionQueue.length > 0) {
        await yieldToMain();
      }
    }

    if (generation !== runtime.loadGeneration) return;
    maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size, true, true);

  if (generation !== runtime.loadGeneration) return;
  retainOnly(world, retainKeys);
  runtime.activeCenterId = centerKey;
  runtime.requestedCenterId = null;
  syncMapTileLayer(mapRetainKeys);
  if (mapTilesInput.checked) {
    await loadMapTilesForKeys(world, needed, { immediate: true });
  }
  updateMetrics();
  setStatus(failed === 0
    ? `Loaded ${needed.length} chunks around ${centerX}, ${centerZ}`
    : `Loaded ${needed.length - failed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
  const gridLoadTiming = {
    world,
    centerX,
    centerZ,
    radius,
    needed: needed.length,
    alreadyLoaded: needed.length - missing.length,
    cacheHits,
    cacheMisses,
    networkChunks,
    failed,
    cacheReadMs: Math.round(cacheReadMs),
    cacheParseMs: Math.round(cacheParseMs),
    terrainLoadSlots: loadConcurrency,
    terrainSpawnFrame: terrainPromotionsPerFrame(),
    terrainSpawnBudgetMs: terrainPromotionBudgetMs(),
    terrainRequested: streamStats.requested,
    terrainDataReady: streamStats.dataReady,
    terrainPromoted: streamStats.promoted,
    terrainSpawnedMissing: Math.max(0, streamStats.promoted - streamStats.alreadyLoaded),
    terrainMaxQueue: streamStats.maxQueue,
    terrainMaxReadyWaitMs: Math.round(streamStats.maxReadyWaitMs),
    streamAnchorX: streamAnchor.chunkX,
    streamAnchorZ: streamAnchor.chunkZ,
    ms: Math.round(performance.now() - gridStarted),
  };
  runtime.lastGridLoadTiming = gridLoadTiming;
  runtime.lastTerrainStreamTiming = gridLoadTiming;
  logClientTiming('grid_load', gridStarted, gridLoadTiming);
  } finally {
    if (generation === runtime.loadGeneration) {
      frameJank.setActiveLoadKind('none');
    }
  }
}

export async function loadChunk(world, chunkX, chunkZ, generation) {
  const id = chunkId(world, chunkX, chunkZ);
  if (loadedChunks.has(id)) return true;
  const url = terrainUrl(world, chunkX, chunkZ);
  const started = performance.now();
  const mapTilePromise = mapTilesInput.checked
    ? loadMapTilesForKeys(world, [{ chunkX, chunkZ }], { immediate: true })
    : Promise.resolve();
  const bytes = await fetchArrayBufferWithRetry(url);
  const gltf = await parseGltfBytes(bytes);
  await mapTilePromise;
  if (generation !== runtime.loadGeneration) return false;
  if (loadedChunks.has(id)) return true;
  writeTerrainChunkCache(world, chunkX, chunkZ, bytes, { source: 'single' });
  const entry = addChunkObject(world, chunkX, chunkZ, gltf.scene);
  if (entry && cosmeticBlocksSplit()) {
    void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
      logClientEvent('terrain_cosmetic_overlay_failed', {
        world,
        chunkX,
        chunkZ,
        error: error?.message ?? error,
      });
    });
  }
  logClientTiming('terrain_single_load', started, { world, chunkX, chunkZ });
  return true;
}

function promoteTerrainResults(queue, generation, streamStats = null) {
  const started = performance.now();
  const promotionsPerFrame = terrainPromotionsPerFrame();
  const promotionBudgetMs = terrainPromotionBudgetMs();
  let completed = 0;
  let failed = 0;
  let promoted = 0;

  while (queue.length > 0 && generation === runtime.loadGeneration) {
    if (
      promoted >= promotionsPerFrame
      || (promoted > 0 && performance.now() - started >= promotionBudgetMs)
    ) {
      break;
    }

    const result = queue.shift();
    if (result.stale) {
      continue;
    }
    if (!result.ok) {
      failed++;
      if (streamStats) streamStats.failed++;
      console.warn(`Failed to load chunk ${result.key.chunkX},${result.key.chunkZ}`, result.error);
      logClientEvent('terrain_stream_chunk_failed', {
        world: worldSelect.value,
        chunkX: result.key.chunkX,
        chunkZ: result.key.chunkZ,
        error: result.error?.message ?? result.error,
      });
      continue;
    }

    if (generation !== runtime.loadGeneration) {
      break;
    }
    const resultWorld = result.world ?? worldSelect.value;
    const id = chunkId(resultWorld, result.key.chunkX, result.key.chunkZ);
    if (!loadedChunks.has(id)) {
      const entry = addChunkObject(resultWorld, result.key.chunkX, result.key.chunkZ, result.gltf.scene);
      if (result.bytes) {
        writeTerrainChunkCache(resultWorld, result.key.chunkX, result.key.chunkZ, result.bytes, { source: 'single' });
      }
      if (entry && cosmeticBlocksSplit()) {
        void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
          logClientEvent('terrain_cosmetic_overlay_failed', {
            world: resultWorld,
            chunkX: result.key.chunkX,
            chunkZ: result.key.chunkZ,
            error: error?.message ?? error,
          });
        });
      }
      if (mapTilesInput.checked) {
        void loadMapTilesForKeys(resultWorld, [result.key], { immediate: true });
      }
      promoted++;
      if (streamStats) {
        streamStats.promoted++;
        const readyWaitMs = result.readyAt ? performance.now() - result.readyAt : 0;
        streamStats.totalReadyWaitMs += readyWaitMs;
        streamStats.maxReadyWaitMs = Math.max(streamStats.maxReadyWaitMs, readyWaitMs);
      }
    }
    completed++;
  }

  return {
    completed,
    failed,
    yielded: queue.length > 0 && (completed > 0 || failed > 0),
  };
}

function chunkWrapperName(chunkX, chunkZ) {
  return `chunk:${chunkX}:${chunkZ}`;
}

export function countOrphanChunkWrappers(extraKeep = null) {
  const tracked = new Set();
  for (const entry of loadedChunks.values()) {
    tracked.add(entry.object);
  }
  if (extraKeep) tracked.add(extraKeep);
  let count = 0;
  for (const child of scene.children) {
    if (!child.name?.startsWith('chunk:')) continue;
    if (tracked.has(child)) continue;
    count += 1;
  }
  return count;
}

export function pruneOrphanChunkWrappers(extraKeep = null) {
  const tracked = new Set();
  for (const entry of loadedChunks.values()) {
    tracked.add(entry.object);
  }
  if (extraKeep) tracked.add(extraKeep);
  const removals = [];
  for (const child of scene.children) {
    if (!child.name?.startsWith('chunk:')) continue;
    if (tracked.has(child)) continue;
    removals.push(child);
  }
  for (const child of removals) {
    scene.remove(child);
    const stats = disposeObjectTree(child);
    disposalStats.chunks += 1;
    disposalStats.geometries += stats.geometries;
    disposalStats.materials += stats.materials;
    disposalStats.textures += stats.textures;
  }
  return removals.length;
}

function addChunkObject(world, chunkX, chunkZ, object) {
  const id = chunkId(world, chunkX, chunkZ);
  const existing = loadedChunks.get(id);
  if (existing) {
    finishDisposeChunk(id, existing);
  }
  pruneOrphanChunkWrappers();

  chunkPlaceholderManager.resolve(world, chunkX, chunkZ);

  const wrapper = new THREE.Group();
  wrapper.name = chunkWrapperName(chunkX, chunkZ);
  wrapper.position.set(chunkX * 32, 0, chunkZ * 32);

  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  prepareWaterMaterials(object);
  tintWaterMaterialsFromMap(object, sampleMapBackdropColor);
  applyWaterModeToObject(object, waterModeInput.value);
  const lightingOptions = currentLightingOptions();
  applyLightingToObject(object, lightingOptions);
  const shade = createTreeShadeObject(object, lightingOptions);
  if (shade) {
    object.add(shade);
  }
  const debug = createChunkDebug(chunkX, chunkZ, object);
  debug.visible = debugBoundsInput.checked;
  object.add(debug);
  wrapper.add(object);
  scene.add(wrapper);

  const entry = {
    world,
    chunkX,
    chunkZ,
    object: wrapper,
    mesh: object,
    debug,
    shade,
    landState: 'settled',
    landStartedAt: 0,
    landDurationMs: 0,
    landStartY: 0,
    landTargetY: 0,
    onLandComplete: null,
    pendingUnload: null,
  };
  chunkLandMotion.beginLoad(entry, landMotionEnabled());
  loadedChunks.set(id, entry);
  pruneOrphanChunkWrappers(wrapper);
  return entry;
}

async function loadCosmeticOverlayForEntry(entry, generation) {
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration) return false;
  const overlay = await readCosmeticOverlayBytes(entry.world, entry.chunkX, entry.chunkZ);
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration) return false;
  const id = chunkId(entry.world, entry.chunkX, entry.chunkZ);
  const current = loadedChunks.get(id);
  if (current !== entry) return false;
  const gltf = await parseGltfBytes(overlay.bytes);
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration || loadedChunks.get(id) !== entry) return false;
  attachCosmeticOverlay(entry, gltf.scene);
  if (!overlay.cached) {
    writeCosmeticOverlayCache(overlay.cacheKey, overlay.bytes);
  }
  updateMetrics();
  return true;
}

function attachCosmeticOverlay(entry, object) {
  if (entry.cosmeticOverlay) {
    entry.mesh.remove(entry.cosmeticOverlay);
    const stats = disposeObjectTree(entry.cosmeticOverlay);
    disposalStats.geometries += stats.geometries;
    disposalStats.materials += stats.materials;
    disposalStats.textures += stats.textures;
  }
  object.name = 'cosmetic-overlay';
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  applyLightingToObject(object, currentLightingOptions());
  entry.mesh.add(object);
  entry.cosmeticOverlay = object;
}

function retainOnly(world, needed) {
  const keep = new Set(needed.map((key) => key.id));
  for (const [id, entry] of loadedChunks) {
    if (chunkLandMotion.isAnimating(entry)) {
      continue;
    }
    if (entry.world !== world || !keep.has(id)) {
      requestChunkUnload(id, entry);
    }
  }
}

function requestChunkUnload(id, entry) {
  const deferred = chunkLandMotion.beginUnload(entry, landMotionEnabled(), () => {
    finishDisposeChunk(id, entry);
  });
  if (!deferred) {
    finishDisposeChunk(id, entry);
  }
}

export function finishDisposeChunk(id, entry) {
  chunkLandMotion.cancel(entry);
  if (!loadedChunks.has(id)) {
    return;
  }
  scene.remove(entry.object);
  const stats = disposeObjectTree(entry.object);
  disposalStats.chunks++;
  disposalStats.geometries += stats.geometries;
  disposalStats.materials += stats.materials;
  disposalStats.textures += stats.textures;
  loadedChunks.delete(id);
  updateMetrics();
}

export function applyWaterMode() {
  const mode = waterModeValue();
  if (waterModeInput.value !== mode) {
    waterModeInput.value = mode;
  }
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
    applyWaterModeToObject(entry.object, mode);
  }
}

export function updateDebugBounds() {
  for (const entry of loadedChunks.values()) {
    entry.debug.visible = debugBoundsInput.checked;
  }
}

function scheduleAutoStreamLoad() {
  const world = worldSelect.value;
  if (!world) return;
  const player = playerChunk();
  runtime.scheduledCenterId = null;
  clearTimeout(runtime.streamTimer);
  runtime.streamTimer = null;
  loadGrid({ centerX: player.chunkX, centerZ: player.chunkZ, streamLoad: true }).catch((error) => setStatus(error.message));
}

export function maybeAutoStream() {
  if (!autoStreamInput.checked || !runtime.hasFocusedInitialGrid || !worldSelect.value) return;
  const player = playerChunk();
  const playerId = centerId(worldSelect.value, player.chunkX, player.chunkZ);
  if (playerId === runtime.activeCenterId || playerId === runtime.requestedCenterId || playerId === runtime.scheduledCenterId) {
    return;
  }

  clearTimeout(runtime.streamTimer);
  runtime.scheduledCenterId = playerId;
  runtime.streamTimer = setTimeout(() => {
    runtime.streamTimer = null;
    runtime.scheduledCenterId = null;
    scheduleAutoStreamLoad();
  }, AUTO_STREAM_DEBOUNCE_MS);
}

export function scheduleControlGridLoad() {
  if (!runtime.hasStarted) return;
  clearTimeout(runtime.controlLoadTimer);
  runtime.controlLoadTimer = setTimeout(() => {
    loadGrid().catch((error) => setStatus(error.message));
    saveViewState();
  }, 350);
}

export function reloadTerrainForVisualOptions() {
  for (const [id, entry] of Array.from(loadedChunks.entries())) {
    finishDisposeChunk(id, entry);
  }
  scheduleControlGridLoad();
}
