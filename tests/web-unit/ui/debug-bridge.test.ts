import assert from 'node:assert/strict';
import test from 'node:test';

import { exposeDebugState } from '../../../web/src/ui/debug-bridge.ts';
import {
  runtime,
  camera,
  controls,
  loadedChunks,
  mobMarkers,
} from '../../../web/src/scene/scene-context.ts';
import {
  autoStreamInput,
  mapTimeInput,
} from '../../../web/src/ui/dom.ts';

function bridge(): any {
  exposeDebugState();
  return (window as any).__terrascapeDebug;
}

test('exposeDebugState installs the debug bridge with the live collections', () => {
  const dbg = bridge();
  assert.ok(dbg);
  assert.equal(dbg.loadedChunks, loadedChunks);
  assert.equal(dbg.mobMarkers, mobMarkers);
  assert.ok(dbg.fpsCounter);
});

test('state getters report runtime/feature flags', () => {
  const dbg = bridge();
  runtime.terrainFormatVersion = 'vX';
  runtime.experimentalDetailsEnabled = true;
  runtime.activeCenterId = 'world:1:2';
  runtime.requestedCenterId = 'world:3:4';
  assert.equal(dbg.terrainFormatVersion(), 'vX');
  assert.equal(dbg.experimentalDetailsEnabled(), true);
  assert.equal(dbg.activeCenterId(), 'world:1:2');
  assert.equal(dbg.requestedCenterId(), 'world:3:4');

  const stream = dbg.entityStreamState();
  assert.equal(typeof stream.connected, 'boolean');
  assert.equal(typeof stream.available, 'boolean');
});

test('cameraPose / cameraChunk / streamAnchorChunk reflect scene transforms', () => {
  const dbg = bridge();
  camera.position.set(64, 100, -32);
  controls.target.set(0, 0, 0);
  const pose = dbg.cameraPose();
  assert.deepEqual(pose.camera, { x: 64, y: 100, z: -32 });
  assert.equal(typeof pose.fov, 'number');

  const cameraChunk = dbg.cameraChunk();
  assert.equal(cameraChunk.chunkX, Math.floor(64 / 32));
  assert.equal(cameraChunk.chunkZ, Math.floor(-32 / 32));

  const anchor = dbg.streamAnchorChunk();
  assert.equal(typeof anchor.chunkX, 'number');
});

test('grid load and jank counters can be read and reset', () => {
  const dbg = bridge();
  runtime.gridLoadCount = 5;
  assert.equal(dbg.gridLoadCount(), 5);
  dbg.resetGridLoadCount();
  assert.equal(dbg.gridLoadCount(), 0);

  assert.equal(typeof dbg.jankStats(), 'object');
  assert.doesNotThrow(() => dbg.resetJankStats());
});

test('placeholder/orphan/land-motion counters return numbers', () => {
  const dbg = bridge();
  loadedChunks.clear();
  assert.equal(typeof dbg.chunkPlaceholderCount(), 'number');
  assert.equal(typeof dbg.chunkPlaceholderWaiting(), 'number');
  assert.equal(typeof dbg.landMotionActive(), 'number');
  assert.equal(typeof dbg.chunkWrapperCount(), 'number');
  assert.equal(typeof dbg.orphanChunkWrappers(), 'number');
  assert.doesNotThrow(() => dbg.pruneOrphanChunkWrappers());
});

test('terrainTuning and lastPerfTimings expose the control readers', () => {
  const dbg = bridge();
  const tuning = dbg.terrainTuning();
  assert.equal(typeof tuning.loadSlots, 'number');
  assert.equal(typeof tuning.spawnFrame, 'number');
  assert.equal(typeof tuning.spawnBudgetMs, 'number');
  const timings = dbg.lastPerfTimings();
  assert.ok('gridLoad' in timings);
});

test('viewState getter snapshots HUD control values', () => {
  const dbg = bridge();
  const view = dbg.viewState();
  assert.equal(typeof view.mapTiles, 'boolean');
  assert.equal(typeof view.water, 'string');
  assert.equal(typeof view.fog, 'object');
  assert.equal(typeof view.fog.near, 'number');
});

test('setAutoStream toggles the input checked state', () => {
  const dbg = bridge();
  // The source dispatches `new Event('change')` using the global Event constructor; under Node's
  // native Event (not happy-dom's) the dispatch can reject, so we assert the checked mutation —
  // the observable effect — and tolerate a dispatch error from the constructor mismatch.
  try {
    dbg.setAutoStream(true);
  } catch { /* native/happy-dom Event mismatch on dispatch */ }
  assert.equal(autoStreamInput.checked, true);
  try {
    dbg.setAutoStream(false);
  } catch { /* see above */ }
  assert.equal(autoStreamInput.checked, false);
});

test('flyLook getter and setCameraPose drive camera state', () => {
  const dbg = bridge();
  const fly = dbg.flyLook();
  assert.equal(typeof fly.yaw, 'number');
  assert.equal(typeof fly.pitch, 'number');
  assert.equal(typeof fly.pointerLocked, 'boolean');

  dbg.setCameraPose({
    camera: { x: 10, y: 20, z: 30 },
    target: { x: 1, y: 2, z: 3 },
  });
  assert.equal(camera.position.x, 10);
  assert.equal(controls.target.x, 1);
});

test('setWorldTimeForTest stores the world time and enables map time', () => {
  const dbg = bridge();
  mapTimeInput.checked = false;
  dbg.setWorldTimeForTest({ dayProgress: 0.5, phase: 'noon' });
  assert.equal(mapTimeInput.checked, true);
  assert.deepEqual(runtime.worldTime, { dayProgress: 0.5, phase: 'noon' });
});

test('lightingSummary and skySummary read the lighting rig and scene', () => {
  const dbg = bridge();
  const lighting = dbg.lightingSummary();
  assert.equal(typeof lighting.ambientIntensity, 'number');
  assert.equal(typeof lighting.sunIntensity, 'number');

  const sky = dbg.skySummary();
  assert.ok('postFogEnabled' in sky);
  assert.equal(typeof sky.starsVisible, 'boolean');
});

test('applyFlyLookDelta and zoomFlyView mutate fly state without throwing', () => {
  const dbg = bridge();
  assert.doesNotThrow(() => dbg.applyFlyLookDelta(2, 3));
  assert.doesNotThrow(() => dbg.zoomFlyView(5));
});

test('waterMaterialSummary returns an array', () => {
  const dbg = bridge();
  loadedChunks.clear();
  assert.deepEqual(dbg.waterMaterialSummary(), []);
});
