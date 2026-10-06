import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  REGION_CHUNKS,
  createMapRegionAtlas,
  regionCoord,
  type RegionSurface,
} from '../../../web/src/tile-map/map-region-atlas.ts';

type Op = { op: 'draw' | 'clear'; x: number; y: number; size: number };

function fakeSurfaces() {
  const surfaces: { pixels: number; ops: Op[] }[] = [];
  const createSurface = (pixels: number): RegionSurface => {
    const record = { pixels, ops: [] as Op[] };
    surfaces.push(record);
    return {
      source: { width: pixels, height: pixels } as unknown as HTMLCanvasElement,
      draw(_image, x, y, size) { record.ops.push({ op: 'draw', x, y, size }); },
      clear(x, y, size) { record.ops.push({ op: 'clear', x, y, size }); },
    };
  };
  return { surfaces, createSurface };
}

const tile = {} as CanvasImageSource;

test('regionCoord floors negative chunks into the correct region', () => {
  assert.equal(regionCoord(0), 0);
  assert.equal(regionCoord(REGION_CHUNKS - 1), 0);
  assert.equal(regionCoord(REGION_CHUNKS), 1);
  assert.equal(regionCoord(-1), -1);
  assert.equal(regionCoord(-REGION_CHUNKS), -1);
  assert.equal(regionCoord(-REGION_CHUNKS - 1), -2);
});

test('tiles in one region share a single mesh and land in their own pixel slot', () => {
  const scene = new THREE.Scene();
  const { surfaces, createSurface } = fakeSurfaces();
  const atlas = createMapRegionAtlas(scene, { y: 112, createSurface });

  atlas.put(0, 0, tile);
  atlas.put(7, 3, tile);
  atlas.put(-1, -1, tile);

  assert.equal(atlas.stats().regions, 2);
  assert.equal(scene.children.length, 2);
  assert.equal(atlas.meshFor(0, 0), atlas.meshFor(7, 3));
  assert.notEqual(atlas.meshFor(0, 0), atlas.meshFor(-1, -1));
  assert.deepEqual(surfaces[0].ops, [
    { op: 'draw', x: 0, y: 0, size: 32 },
    { op: 'draw', x: 7 * 32, y: 3 * 32, size: 32 },
  ]);
  // Chunk -1 is the last slot of region -1.
  assert.deepEqual(surfaces[1].ops, [{ op: 'draw', x: 7 * 32, y: 7 * 32, size: 32 }]);
  assert.equal(atlas.meshFor(0, 0)!.position.y, 112);
  assert.equal(atlas.meshFor(0, 0)!.position.x, REGION_CHUNKS * 32 / 2);
});

test('flush uploads only regions changed since the previous flush', () => {
  const scene = new THREE.Scene();
  const atlas = createMapRegionAtlas(scene, { y: 112, createSurface: fakeSurfaces().createSurface });
  atlas.put(0, 0, tile);
  atlas.put(1, 0, tile);
  atlas.put(20, 20, tile);
  assert.equal(atlas.flush(), 2);
  assert.equal(atlas.flush(), 0);
  atlas.put(2, 0, tile);
  assert.equal(atlas.flush(), 1);
});

test('removing tiles clears their slot and disposes an emptied region', () => {
  const scene = new THREE.Scene();
  const { surfaces, createSurface } = fakeSurfaces();
  const atlas = createMapRegionAtlas(scene, { y: 112, createSurface });
  atlas.put(0, 0, tile);
  atlas.put(1, 0, tile);

  atlas.remove(1, 0);
  assert.deepEqual(surfaces[0].ops.at(-1), { op: 'clear', x: 32, y: 0, size: 32 });
  assert.equal(atlas.stats().regions, 1);

  atlas.remove(0, 0);
  assert.equal(atlas.stats().regions, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(atlas.meshFor(0, 0), null);
});

test('tint and clear apply to every region', () => {
  const scene = new THREE.Scene();
  const atlas = createMapRegionAtlas(scene, { y: 112, createSurface: fakeSurfaces().createSurface });
  atlas.put(0, 0, tile);
  atlas.put(30, 30, tile);
  atlas.setTint(new THREE.Color(0.5, 0.5, 0.5));
  for (const mesh of scene.children as THREE.Mesh[]) {
    assert.equal((mesh.material as THREE.MeshBasicMaterial).color.r, 0.5);
  }
  atlas.clear();
  assert.equal(scene.children.length, 0);
  assert.deepEqual(atlas.stats(), { regions: 0, tiles: 0, dirty: 0, regionPixels: 256 });
});
