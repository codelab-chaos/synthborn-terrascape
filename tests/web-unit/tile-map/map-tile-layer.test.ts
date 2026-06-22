import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  applyMapWaterTint,
  mapBackdropCenter,
  syncMapTileLayer,
  updateMapTileLayer,
} from '../../../web/src/tile-map/map-tile-layer.ts';
import { runtime, grid, loadedChunks, scene } from '../../../web/src/scene/scene-context.ts';
import { clearMapBackdrop, mapBackdropStats } from '../../../web/src/tile-map/map-backdrop.ts';
import {
  chunkXInput,
  chunkZInput,
  mapTilesInput,
  worldSelect,
  mapTileRadiusValueInput,
  radiusInput,
} from '../../../web/src/ui/dom.ts';

// Telemetry flushes (failed tile logging) must not fall back to a real fetch.
(globalThis.navigator as unknown as { sendBeacon: (...args: unknown[]) => boolean })
  .sendBeacon = () => true;

function setInputs({ x = '0', z = '0', world = 'default', radius = '1', mapRadius = '1' } = {}) {
  chunkXInput.value = x;
  chunkZInput.value = z;
  radiusInput.value = radius;
  mapTileRadiusValueInput.value = mapRadius;
  // worldSelect is a <select> with no options in the scaffold; assign value directly.
  worldSelect.value = world;
  return world;
}

test('mapBackdropCenter prefers runtime activeCenterId, else grid inputs', () => {
  runtime.activeCenterId = 'default:5:-2';
  setInputs({ x: '11', z: '12' });
  assert.deepEqual(mapBackdropCenter(), { chunkX: 5, chunkZ: -2 });

  runtime.activeCenterId = null;
  setInputs({ x: '11', z: '12' });
  assert.deepEqual(mapBackdropCenter(), { chunkX: 11, chunkZ: 12 });
});

test('applyMapWaterTint iterates loaded chunks without error', () => {
  // No chunks loaded -> no-op.
  assert.doesNotThrow(() => applyMapWaterTint());

  // With a stub chunk entry, it should call into the water tinter for the object.
  const object = new THREE.Group();
  loadedChunks.set('default:0:0', { object });
  try {
    assert.doesNotThrow(() => applyMapWaterTint());
  } finally {
    loadedChunks.delete('default:0:0');
  }
});

test('syncMapTileLayer with map tiles disabled toggles grid visibility and returns early', () => {
  runtime.activeCenterId = null;
  runtime.terrainFormatVersion = 'v13';
  setInputs();
  mapTilesInput.checked = false;

  syncMapTileLayer();
  // grid visible because map tiles are off.
  assert.equal(grid.visible, true);
});

test('syncMapTileLayer with map tiles enabled prunes and writes retain stats', () => {
  runtime.activeCenterId = null;
  runtime.terrainFormatVersion = 'v13';
  setInputs({ x: '0', z: '0', radius: '1', mapRadius: '1' });
  mapTilesInput.checked = true;

  try {
    syncMapTileLayer();
    assert.equal(grid.visible, false);
    // retain stats were assigned onto mapBackdropStats (centerX/centerZ from center).
    const stats = mapBackdropStats();
    assert.equal(stats.centerX, 0);
    assert.equal(stats.centerZ, 0);
    // radius is max(mapTileRadius, radiusValue) >= 1.
    assert.ok(stats.radius >= 1);
  } finally {
    mapTilesInput.checked = false;
    clearMapBackdrop(scene);
  }
});

test('syncMapTileLayer accepts explicit retainKeys', () => {
  runtime.activeCenterId = null;
  setInputs();
  mapTilesInput.checked = true;
  const keys = [
    { chunkX: 0, chunkZ: 0, id: 'default:0:0' },
    { chunkX: 1, chunkZ: 0, id: 'default:1:0' },
  ];
  try {
    assert.doesNotThrow(() => syncMapTileLayer(keys));
  } finally {
    mapTilesInput.checked = false;
  }
});

test('updateMapTileLayer skips when layer key unchanged, runs when forced', async () => {
  runtime.activeCenterId = null;
  runtime.terrainFormatVersion = 'v13';
  runtime.mapTileLayerKey = null;
  setInputs({ x: '0', z: '0', radius: '1', mapRadius: '1' });
  mapTilesInput.checked = false; // disabled avoids triggering tile loads

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;

    // First call sets the layer key.
    updateMapTileLayer();
    const firstKey = runtime.mapTileLayerKey;
    assert.ok(typeof firstKey === 'string');

    // Same inputs -> early return, key unchanged.
    updateMapTileLayer();
    assert.equal(runtime.mapTileLayerKey, firstKey);

    // Forced -> reruns syncMapTileLayer even though key matches.
    assert.doesNotThrow(() => updateMapTileLayer({ force: true }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('updateMapTileLayer with map tiles enabled queues a load and tolerates fetch failure', async () => {
  runtime.activeCenterId = null;
  runtime.terrainFormatVersion = 'v13';
  runtime.mapTileLayerKey = null;
  setInputs({ x: '0', z: '0', radius: '0', mapRadius: '0' });
  mapTilesInput.checked = true;

  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  try {
    globalThis.fetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    console.warn = () => {};

    // Drives mapBackdropCenter -> chunkKeysForWorld -> syncMapTileLayer -> loadMapTilesForKeys.
    updateMapTileLayer({ force: true });
    // Give the immediate loader a tick to settle (all fetches reject -> nothing installed).
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(mapBackdropStats().totalTiles, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    mapTilesInput.checked = false;
    clearMapBackdrop(scene);
  }
});
