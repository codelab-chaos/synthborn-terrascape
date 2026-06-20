import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chunkDistanceSq,
  chunkKeysForWorld,
  sortChunkKeysByPlayerDistance,
} from '../src/main/resources/web/src/common/chunk-planning.ts';
import { AppRuntimeState } from '../src/main/resources/web/src/common/app-state.ts';
import {
  terrainCacheKeyFor,
  terrainCosmeticOverlayCacheKeyFor,
  terrainCosmeticOverlayUrlFor,
  terrainUrlFor,
} from '../src/main/resources/web/src/common/terrain-requests.ts';
import {
  createTerrainStreamStats,
  terrainStreamSnapshot,
} from '../src/main/resources/web/src/common/terrain-stream.ts';
import {
  floatControlValue,
  fogRangeFromControls,
  radiusReadout,
  safeWaterMode,
  terrainTuningControlValue,
} from '../src/main/resources/web/src/common/view-preferences.ts';
import {
  compactMobSourceStats,
  compactObject,
  nearestMobsForSample,
  summarizeItems,
} from '../src/main/resources/web/src/common/entity-summary.ts';
import {
  liveMobFeedEnabled,
  mobPollDelayMs,
  playerPollDelayMs,
  positiveIntegerMs,
  wantsEntityStream,
  worldTimePollDelayMs,
} from '../src/main/resources/web/src/common/entity-feed-policy.ts';
import {
  horizonMapKeys,
  mapBackdropCenterFrom,
  mapBackdropRetainStats,
  mapTileLayerKey,
  parseCenterId,
} from '../src/main/resources/web/src/common/map-layer-policy.ts';
import {
  collectChunkResourceStats,
  disposeObjectTree,
} from '../src/main/resources/web/src/common/resource-stats.ts';

test('normalizes view preference controls', () => {
  assert.equal(terrainTuningControlValue({ value: '99', min: '1', max: '12' }, 4), 12);
  assert.equal(terrainTuningControlValue({ value: 'nope', min: '1', max: '12' }, 4), 4);
  assert.equal(floatControlValue({ value: '2.8', min: '0', max: '1.5' }, 0.5), 1.5);
  assert.deepEqual(fogRangeFromControls({ value: '700', min: '40', max: '1200' }, { value: '200', min: '120', max: '2600' }), {
    near: 700,
    far: 701,
  });
  assert.equal(safeWaterMode('shader'), 'solid');
  assert.equal(safeWaterMode('transparent'), 'transparent');
  assert.deepEqual(radiusReadout(3), {
    radius: 3,
    diameter: 7,
    chunks: 49,
    text: '7 x 7 chunks, 49 meshes',
  });
});

test('initializes app runtime state in one owned object', () => {
  const storedViewState = { world: 'default', radius: 3 };
  const state = new AppRuntimeState(storedViewState);
  assert.equal(state.storedViewState, storedViewState);
  assert.equal(state.loadGeneration, 0);
  assert.equal(state.terrainFormatVersion, 'unknown');
  assert.equal(state.hasStarted, false);
  assert.equal(state.viewPlayerUuid, null);
  assert.equal(state.lastPlayerCount, 0);
  assert.equal(state.entityStreamConnected, false);
});

test('builds terrain request URLs and cache keys', () => {
  const bakedOptions = {
    terrainFormatVersion: 'v99',
    experimentalDetailsEnabled: true,
    cosmeticsMode: 'baked',
    visualDetailMode: 'all',
  };
  assert.equal(
    terrainUrlFor('default world', -2, 7, bakedOptions),
    '/api/terrain/default%20world/-2/7.glb?cosmetics=1&visualDetail=all',
  );
  assert.equal(
    terrainUrlFor('default world', -2, 7, { ...bakedOptions, cosmeticsMode: 'off' }),
    '/api/terrain/default%20world/-2/7.glb',
  );
  assert.equal(
    terrainCacheKeyFor('default', -2, 7, bakedOptions),
    'v99:details:baked:all:default:-2:7',
  );
  assert.equal(
    terrainCacheKeyFor('default', -2, 7, { ...bakedOptions, cosmeticsMode: 'off' }),
    'v99:details:plain:basic:default:-2:7',
  );
  assert.equal(
    terrainCosmeticOverlayUrlFor('default world', -2, 7, 'structures'),
    '/api/terrain/default%20world/-2/7.glb?cosmetics=only&visualDetail=structures',
  );
  assert.equal(
    terrainCosmeticOverlayCacheKeyFor('default', -2, 7, bakedOptions),
    'v99:details:split-overlay:all:default:-2:7',
  );
});

test('plans chunk keys and player-distance ordering', () => {
  const keys = chunkKeysForWorld('default', 10, -4, 1);
  assert.equal(keys.length, 9);
  assert.deepEqual(keys[0], { chunkX: 9, chunkZ: -5, id: 'default:9:-5' });
  assert.deepEqual(keys[8], { chunkX: 11, chunkZ: -3, id: 'default:11:-3' });
  assert.equal(chunkDistanceSq(13, -2, 10, -4), 13);

  const sorted = sortChunkKeysByPlayerDistance([
    { chunkX: 2, chunkZ: 1 },
    { chunkX: 0, chunkZ: 1 },
    { chunkX: 1, chunkZ: 0 },
    { chunkX: 1, chunkZ: 2 },
  ], 1, 1);
  assert.deepEqual(sorted, [
    { chunkX: 1, chunkZ: 0 },
    { chunkX: 0, chunkZ: 1 },
    { chunkX: 2, chunkZ: 1 },
    { chunkX: 1, chunkZ: 2 },
  ]);
});

test('builds terrain stream telemetry snapshots', () => {
  const stats = createTerrainStreamStats('default', 10, -4, 2, 25, 3, 22, 1000);
  stats.requested = 6;
  stats.dataReady = 4;
  stats.promoted = 8;
  stats.failed = 1;
  stats.cacheHits = 2;
  stats.cacheMisses = 4;
  stats.networkChunks = 4;
  stats.maxQueue = 5;
  stats.maxReadyWaitMs = 24.6;
  stats.totalReadyWaitMs = 42;

  assert.deepEqual(terrainStreamSnapshot(stats, 2, 3, {
    final: true,
    now: 2500,
    loadSlots: 4,
    spawnFrame: 2,
    spawnBudgetMs: 5,
  }), {
    world: 'default',
    centerX: 10,
    centerZ: -4,
    radius: 2,
    needed: 25,
    alreadyLoaded: 3,
    missing: 22,
    requested: 6,
    dataReady: 4,
    promoted: 8,
    spawnedMissing: 5,
    failed: 1,
    queued: 2,
    inFlight: 3,
    cacheHits: 2,
    cacheMisses: 4,
    networkChunks: 4,
    maxQueue: 5,
    maxReadyWaitMs: 25,
    avgReadyWaitMs: 8,
    requestedPerSec: 4,
    readyPerSec: 2.7,
    spawnPerSec: 3.3,
    loadSlots: 4,
    spawnFrame: 2,
    spawnBudgetMs: 5,
    elapsedMs: 1500,
    final: true,
  });
});

test('computes entity feed polling policy', () => {
  assert.equal(positiveIntegerMs('250', 1000), 250);
  assert.equal(positiveIntegerMs('0', 1000), 1000);
  assert.equal(positiveIntegerMs('nope', 1000), 1000);
  assert.equal(worldTimePollDelayMs({
    mapTimeEnabled: true,
    lastPlayerCount: 0,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 5);
  assert.equal(worldTimePollDelayMs({
    mapTimeEnabled: false,
    lastPlayerCount: 2,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 10);
  assert.equal(worldTimePollDelayMs({
    mapTimeEnabled: false,
    lastPlayerCount: 0,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 30);

  const playerPolicy = {
    lastPollFailed: false,
    showPlayers: true,
    lastPlayerCount: 2,
    requestedRateMs: 500,
    focused: false,
    errorMs: 10000,
    hiddenMs: 30000,
    emptyMs: 15000,
    focusedMinMs: 1000,
  };
  assert.equal(playerPollDelayMs(playerPolicy), 500);
  assert.equal(playerPollDelayMs({ ...playerPolicy, focused: true }), 1000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, lastPollFailed: true }), 10000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, showPlayers: false }), 30000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, lastPlayerCount: 0 }), 15000);

  assert.equal(liveMobFeedEnabled(true, 1), true);
  assert.equal(liveMobFeedEnabled(true, 0), false);
  assert.equal(liveMobFeedEnabled(false, 3), false);
  const mobPolicy = {
    showMobs: true,
    liveMobFeed: true,
    lastPollFailed: false,
    lastMobCount: 3,
    activeMs: 5000,
    emptyMs: 30000,
    errorMs: 15000,
  };
  assert.equal(mobPollDelayMs(mobPolicy), 5000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, showMobs: false }), null);
  assert.equal(mobPollDelayMs({ ...mobPolicy, liveMobFeed: false }), 30000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, lastPollFailed: true }), 15000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, lastMobCount: 0 }), 30000);

  assert.equal(wantsEntityStream({ world: 'default', showPlayers: true, liveMobFeed: false }), true);
  assert.equal(wantsEntityStream({ world: 'default', showPlayers: false, liveMobFeed: true }), true);
  assert.equal(wantsEntityStream({ world: '', showPlayers: true, liveMobFeed: true }), false);
  assert.equal(wantsEntityStream({ world: 'default', showPlayers: false, liveMobFeed: false }), false);
});

test('computes map layer policy', () => {
  assert.deepEqual(parseCenterId('default:12:-4'), { chunkX: 12, chunkZ: -4 });
  assert.deepEqual(parseCenterId('world:with:colon:-2:9'), { chunkX: -2, chunkZ: 9 });
  assert.equal(parseCenterId('invalid'), null);
  assert.deepEqual(mapBackdropCenterFrom('default:7:8', 1, 2), { chunkX: 7, chunkZ: 8 });
  assert.deepEqual(mapBackdropCenterFrom(null, -3, 4), { chunkX: -3, chunkZ: 4 });
  assert.deepEqual(mapBackdropCenterFrom(null, Number.NaN, 4), { chunkX: 0, chunkZ: 0 });
  assert.equal(mapTileLayerKey('default', { chunkX: 7, chunkZ: 8 }, 10, true), 'default:7:8:10:true');
  assert.deepEqual(mapBackdropRetainStats({ chunkX: 7, chunkZ: 8 }, 10), {
    centerX: 7,
    centerZ: 8,
    radius: 10,
    chunks: 21,
    anchorX: 7,
    anchorZ: 8,
  });
  assert.deepEqual(horizonMapKeys(
    [{ chunkX: 0, chunkZ: 0 }, { chunkX: 1, chunkZ: 0 }],
    [{ chunkX: 0, chunkZ: 0 }, { chunkX: 1, chunkZ: 0 }, { chunkX: 2, chunkZ: 0 }],
  ), [{ chunkX: 2, chunkZ: 0 }]);
});

test('collects and disposes object tree resources once', () => {
  const calls = { geometryA: 0, geometryB: 0, materialA: 0, materialB: 0, textureA: 0 };
  const textureA = { isTexture: true, dispose: () => calls.textureA++ };
  const geometryA = {
    index: { count: 6 },
    getAttribute: () => ({ count: 99 }),
    dispose: () => calls.geometryA++,
  };
  const geometryB = {
    getAttribute: () => ({ count: 12 }),
    dispose: () => calls.geometryB++,
  };
  const materialA = { map: textureA, dispose: () => calls.materialA++ };
  const materialB = { normalMap: textureA, dispose: () => calls.materialB++ };
  const tree = {
    traverse(visitor) {
      visitor({ isMesh: true, geometry: geometryA, material: materialA });
      visitor({ isMesh: true, geometry: geometryA, material: [materialA, materialB] });
      visitor({ isMesh: true, geometry: geometryB, material: null });
    },
  };

  assert.deepEqual(collectChunkResourceStats([{ object: tree }]), {
    meshes: 3,
    geometries: 2,
    materials: 2,
    textures: 1,
    triangles: 8,
  });
  assert.deepEqual(disposeObjectTree(tree), {
    geometries: 2,
    materials: 2,
    textures: 1,
  });
  assert.deepEqual(calls, {
    geometryA: 1,
    geometryB: 1,
    materialA: 1,
    materialB: 1,
    textureA: 1,
  });
});

test('summarizes entity samples for telemetry', () => {
  const mobs = [
    { type: 'Wolf', label: 'Wolf', category: 'passive', source: 'A', x: 10.04, y: 64, z: 10 },
    { type: 'Wolf', label: 'Wolf', category: 'passive', source: 'A', x: 30, y: 64, z: 10 },
    { type: 'Skeleton', label: 'Skeleton', category: 'hostile', source: 'B', x: 11, y: 64, z: 13 },
  ];
  assert.equal(summarizeItems(mobs, (mob) => mob.type), 'Wolf=2|Skeleton=1');
  assert.deepEqual(compactObject({ a: 1, b: '', c: null, d: undefined, e: 'ok' }), { a: 1, e: 'ok' });
  assert.deepEqual(compactMobSourceStats({
    source: 'EntityViewerVisible=4',
    chunks: 3,
    accepted: 2,
    nonMob: 1,
    skippedTypes: { Projectile: 4, BlockEntity: 2, Empty: 0 },
  }), {
    source: 'EntityViewerVisible=4',
    chunks: 3,
    accepted: 2,
    nonMob: 1,
    skippedTypes: 'Projectile=4|BlockEntity=2',
  });
  assert.deepEqual(nearestMobsForSample(mobs, { x: 10, y: 64, z: 10 }, 2), [
    {
      type: 'Wolf',
      label: 'Wolf',
      category: 'passive',
      source: 'A',
      x: 10,
      y: 64,
      z: 10,
      d: 0,
    },
    {
      type: 'Skeleton',
      label: 'Skeleton',
      category: 'hostile',
      source: 'B',
      x: 11,
      y: 64,
      z: 13,
      d: 3,
    },
  ]);
});
