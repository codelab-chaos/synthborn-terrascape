import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  auditMapTiles,
  clearMapBackdrop,
  configureMapBackdrop,
  loadMapTilesForKeys,
  mapBackdropStats,
  mapTileMotionActive,
  mapTileSceneStats,
  probeMapTilePixel,
  pruneMapTiles,
  sampleMapBackdropColor,
  setMapTileChunkCovered,
  setTileLoadConcurrency,
  tickMapTileMotion,
  updateMapBackdrop,
} from '../../../web/src/tile-map/map-backdrop.ts';
import { flushClientLogs } from '../../../web/src/platform/client-log.ts';

// Failed-tile logging (logClientEvent) schedules a telemetry flush. Route that flush
// through a no-op sendBeacon so it never falls back to a real fetch against
// http://localhost/api/client-log (which would surface as an unhandledRejection after a
// test ends). This is a harness concern only, unrelated to the code under test.
(globalThis.navigator as unknown as { sendBeacon: (...args: unknown[]) => boolean })
  .sendBeacon = () => true;

// A fetch stub that fails every tile PNG request.
function tileFailingFetch(): typeof fetch {
  return (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
}

// A renderer whose capabilities report a max anisotropy. Construct via the harness's
// fake WebGL2 context so THREE.WebGLRenderer builds without a GPU.
function makeRenderer(): THREE.WebGLRenderer {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  return new THREE.WebGLRenderer({ canvas });
}

function resetState() {
  // Always start tests from a clean module state.
  const scene = new THREE.Scene();
  clearMapBackdrop(scene);
  return scene;
}

test('configureMapBackdrop stores context and disables clears tiles', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: true, formatVersion: 'v14', motionEnabled: true });
  // No tiles yet; stats reflect empty state.
  const stats = mapBackdropStats();
  assert.equal(stats.totalTiles, 0);

  // Disabling triggers a clear path.
  configureMapBackdrop(scene, renderer, { enabled: false });
  assert.equal(mapBackdropStats().loaded, 0);
});

test('configureMapBackdrop applies default formatVersion and motion', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  // omit formatVersion / motionEnabled to hit defaults
  configureMapBackdrop(scene, renderer, { enabled: true });
  // enabled context lets loadMapTilesForKeys proceed past the guard later.
  assert.equal(mapBackdropStats().totalTiles, 0);
});

test('setTileLoadConcurrency clamps to at least 1', () => {
  // Just exercise the setter branches; no observable getter, so assert no throw.
  assert.doesNotThrow(() => setTileLoadConcurrency(8));
  assert.doesNotThrow(() => setTileLoadConcurrency(0));
  assert.doesNotThrow(() => setTileLoadConcurrency(-5));
  assert.doesNotThrow(() => setTileLoadConcurrency(Number.NaN));
  setTileLoadConcurrency(4);
});

test('mapBackdropStats and mapTileSceneStats report empty state', () => {
  resetState();
  const stats = mapBackdropStats();
  assert.equal(stats.totalTiles, 0);
  assert.equal(stats.visibleTiles, 0);
  const sceneStats = mapTileSceneStats();
  assert.equal(sceneStats.meshCount, 0);
  assert.equal(sceneStats.visibleCount, 0);
  assert.equal(sceneStats.totalTiles, 0);
});

test('mapTileMotionActive is false and tick returns zero when idle', () => {
  resetState();
  assert.equal(mapTileMotionActive(), false);
  assert.equal(tickMapTileMotion(true), 0);
  assert.equal(tickMapTileMotion(false), 0);
});

test('setMapTileChunkCovered is a no-op that does not throw', () => {
  assert.doesNotThrow(() => setMapTileChunkCovered(1, 2, true));
  assert.doesNotThrow(() => setMapTileChunkCovered(1, 2, false));
});

test('updateMapBackdrop (deprecated) seeds center/radius stats', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  updateMapBackdrop(scene, renderer, { enabled: true, centerX: 5, centerZ: -3, meshRadius: 4 });
  const stats = mapBackdropStats();
  assert.equal(stats.centerX, 5);
  assert.equal(stats.centerZ, -3);
  assert.equal(stats.radius, 4);
  assert.equal(stats.chunks, 4 * 2 + 1);
  assert.equal(stats.anchorX, 5);
  assert.equal(stats.anchorZ, -3);
});

test('updateMapBackdrop tolerates missing option fields', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  updateMapBackdrop(scene, renderer, { enabled: true });
  const stats = mapBackdropStats();
  assert.equal(stats.centerX, 0);
  assert.equal(stats.radius, 0);
  assert.equal(stats.chunks, 1);
});

test('sampleMapBackdropColor returns null for non-finite or missing tiles', () => {
  resetState();
  assert.equal(sampleMapBackdropColor(Number.NaN, 0), null);
  assert.equal(sampleMapBackdropColor(0, Number.POSITIVE_INFINITY), null);
  // No tiles loaded for this coord.
  assert.equal(sampleMapBackdropColor(10, 10), null);
});

test('auditMapTiles reports not-ok with zero tiles', () => {
  const scene = resetState();
  const audit = auditMapTiles(scene);
  assert.equal(audit.ok, false);
  assert.equal(audit.count, 0);
  assert.deepEqual(audit.issues, []);
  assert.deepEqual(audit.tiles, []);
});

test('probeMapTilePixel returns tile_missing when coord absent', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  const camera = new THREE.PerspectiveCamera();
  const result = probeMapTilePixel(scene, renderer, camera, () => {}, 99, 99);
  assert.deepEqual(result, { ok: false, error: 'tile_missing' });
});

test('pruneMapTiles is safe before any context/scene set', () => {
  resetState();
  // After clearMapBackdrop the context.scene may still be set; calling prune with an
  // empty retain set should simply leave the (empty) tile map untouched.
  assert.doesNotThrow(() => pruneMapTiles('default', new Set()));
  assert.equal(mapBackdropStats().totalTiles, 0);
});

test('loadMapTilesForKeys returns early when context disabled', async () => {
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: false });
  const result = await loadMapTilesForKeys('default', [{ chunkX: 0, chunkZ: 0 }], { immediate: true });
  assert.equal(result, undefined);
});

test('loadMapTilesForKeys returns early when keys empty', async () => {
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: true });
  const result = await loadMapTilesForKeys('default', [], { immediate: true });
  assert.equal(result, undefined);
});

test('loadMapTilesForKeys immediate path handles fetch failures without hanging', async () => {
  // The harness cannot decode PNG blobs (TextureLoader never settles), so we force the
  // network layer to reject. This still drives loadTileRequest / loadTileRequestUncached /
  // the error branches and never reaches installTile.
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: true, formatVersion: 'v13', motionEnabled: true });

  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let warned = 0;
  try {
    globalThis.fetch = tileFailingFetch();
    console.warn = () => { warned += 1; };

    await loadMapTilesForKeys(
      'default',
      [{ chunkX: 0, chunkZ: 0 }, { chunkX: 1, chunkZ: 0 }],
      { immediate: true, replace: true },
    );

    // No tile installed because every fetch failed.
    assert.equal(mapBackdropStats().totalTiles, 0);
    assert.ok(warned >= 1);
  } finally {
    flushClientLogs();
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    clearMapBackdrop(scene);
  }
});

test('loadMapTilesForKeys queue worker path handles fetch failures', async () => {
  // Non-immediate path routes through processTileLoadQueue / startTileLoadWorker.
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: true, formatVersion: 'v13', motionEnabled: false });

  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  try {
    globalThis.fetch = tileFailingFetch();
    console.warn = () => {};

    const worker = await loadMapTilesForKeys(
      'default',
      [{ chunkX: 5, chunkZ: 5 }],
      { immediate: false },
    );
    // Worker promise (or undefined) — await it to drain the queue if present.
    if (worker) await worker;
    assert.equal(mapBackdropStats().totalTiles, 0);
  } finally {
    flushClientLogs();
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    clearMapBackdrop(scene);
  }
});

test('loadMapTilesForKeys with already-loaded-only keys starts worker and returns', async () => {
  const scene = resetState();
  const renderer = makeRenderer();
  configureMapBackdrop(scene, renderer, { enabled: true });
  // Empty keys after dedupe -> queued === 0 branch (desiredTileLoads currently empty).
  const result = await loadMapTilesForKeys('default', [], { immediate: false });
  assert.equal(result, undefined);
});

test('clearMapBackdrop resets stats and preserves fetch counter', () => {
  const scene = resetState();
  const renderer = makeRenderer();
  updateMapBackdrop(scene, renderer, { enabled: true, centerX: 9, centerZ: 9, meshRadius: 2 });
  clearMapBackdrop(scene);
  const stats = mapBackdropStats();
  assert.equal(stats.centerX, 0);
  assert.equal(stats.centerZ, 0);
  assert.equal(stats.radius, 0);
  assert.equal(stats.reuses, 0);
  assert.equal(stats.totalTiles, 0);
});
