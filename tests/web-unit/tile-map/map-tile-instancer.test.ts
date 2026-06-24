import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createMapTileLayer,
  disposeMapTileLayer,
  hideMapTile,
  setMapTileMatrix,
  syncMapTileCoverage,
  updateMapTileLayerLighting,
} from '../../../web/src/tile-map/map-tile-instancer.ts';

const CHUNK_SIZE = 32;

// hiddenMatrix is makeScale(0,0,0): basis vectors collapse to zero length.
// (THREE.Matrix4.decompose guards against zero determinant and returns unit scale,
//  so we check the raw basis lengths instead.)
function isHidden(matrix: THREE.Matrix4): boolean {
  const e = matrix.elements;
  const sx = Math.hypot(e[0], e[1], e[2]);
  const sy = Math.hypot(e[4], e[5], e[6]);
  const sz = Math.hypot(e[8], e[9], e[10]);
  return sx === 0 && sy === 0 && sz === 0;
}

function buildLayer(opts: Partial<Parameters<typeof createMapTileLayer>[0]> = {}) {
  const texture = new THREE.Texture();
  return createMapTileLayer({
    texture,
    textureMinX: -64,
    textureMinZ: -64,
    textureWorldSize: 256,
    centerX: 0,
    centerZ: 0,
    displayRadius: 1,
    coveredChunks: new Set<string>(),
    backdropY: 5,
    maxAnisotropy: 16,
    ...opts,
  });
}

test('createMapTileLayer builds a 3x3 grid of cells indexed by chunk key', () => {
  const layer = buildLayer({ displayRadius: 1, centerX: 0, centerZ: 0 });
  assert.equal(layer.cells.length, 9);
  assert.equal(layer.mesh.count, 9);
  assert.equal(layer.mesh.name, 'terrascape-map-backdrop');
  assert.equal(layer.mesh.frustumCulled, false);
  assert.equal(layer.visibleCount, 0);
  // chunkToIndex maps each cell.
  assert.equal(layer.chunkToIndex.size, 9);
  assert.ok(layer.chunkToIndex.has('-1:-1'));
  assert.ok(layer.chunkToIndex.has('1:1'));
  assert.ok(layer.chunkToIndex.has('0:0'));
  const idx = layer.chunkToIndex.get('0:0')!;
  assert.equal(layer.cells[idx].chunkX, 0);
  assert.equal(layer.cells[idx].chunkZ, 0);

  // material is configured via createMapTileMaterial.
  const material = layer.mesh.material as THREE.ShaderMaterial;
  assert.ok(material.uniforms.map.value instanceof THREE.Texture);
  assert.equal(material.uniforms.textureMinX.value, -64);
  assert.equal(material.uniforms.textureWorldSize.value, 256);
  assert.equal(material.uniforms.lightingTint.value.r, 1);
  assert.equal(material.uniforms.lightingTint.value.g, 1);
  assert.equal(material.uniforms.lightingTint.value.b, 1);
  assert.equal(material.transparent, true);
  assert.equal(material.depthWrite, false);
  assert.equal((material.uniforms.map.value as THREE.Texture).colorSpace, THREE.SRGBColorSpace);
  assert.equal((material.uniforms.map.value as THREE.Texture).anisotropy, 4); // min(4, 16)
  disposeMapTileLayer(layer);
});

test('updateMapTileLayerLighting darkens instanced image tiles at night', () => {
  const layer = buildLayer({ displayRadius: 0 });
  const material = layer.mesh.material as THREE.ShaderMaterial;
  updateMapTileLayerLighting(layer, { sun: true, time: { dayProgress: 0.0 } });
  const tint = material.uniforms.lightingTint.value as THREE.Color;
  assert.ok(tint.r < 0.2);
  assert.ok(tint.g < 0.25);
  assert.ok(tint.b < 0.2);
  disposeMapTileLayer(layer);
});

test('createMapTileLayer initializes all instances hidden (zero-scale)', () => {
  const layer = buildLayer({ displayRadius: 0 });
  assert.equal(layer.cells.length, 1);
  const m = new THREE.Matrix4();
  layer.mesh.getMatrixAt(0, m);
  assert.ok(isHidden(m));
  disposeMapTileLayer(layer);
});

test('setMapTileMatrix positions instance at chunk world center', () => {
  const layer = buildLayer();
  const index = layer.chunkToIndex.get('1:-1')!;
  setMapTileMatrix(layer, index, 1, -1, 9);
  const m = new THREE.Matrix4();
  layer.mesh.getMatrixAt(index, m);
  const pos = new THREE.Vector3();
  m.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
  assert.equal(pos.x, 1 * CHUNK_SIZE + CHUNK_SIZE / 2);
  assert.equal(pos.y, 9);
  assert.equal(pos.z, -1 * CHUNK_SIZE + CHUNK_SIZE / 2);
  disposeMapTileLayer(layer);
});

test('hideMapTile sets a zero-scale matrix at the index', () => {
  const layer = buildLayer();
  const index = layer.chunkToIndex.get('0:0')!;
  setMapTileMatrix(layer, index, 0, 0, 3);
  hideMapTile(layer, index);
  const m = new THREE.Matrix4();
  layer.mesh.getMatrixAt(index, m);
  assert.ok(isHidden(m));
  disposeMapTileLayer(layer);
});

test('syncMapTileCoverage shows uncovered cells and hides covered ones', () => {
  const layer = buildLayer({ displayRadius: 1 });
  const covered = new Set<string>(['0:0']);
  const visible = syncMapTileCoverage(layer, covered, 7);
  assert.equal(visible, 8); // 9 cells, one covered
  assert.equal(layer.visibleCount, 8);

  // covered cell is hidden.
  const coveredIdx = layer.chunkToIndex.get('0:0')!;
  const cm = new THREE.Matrix4();
  layer.mesh.getMatrixAt(coveredIdx, cm);
  assert.ok(isHidden(cm));

  // a visible cell positioned at backdropY.
  const visIdx = layer.chunkToIndex.get('1:1')!;
  const vm = new THREE.Matrix4();
  layer.mesh.getMatrixAt(visIdx, vm);
  const vPos = new THREE.Vector3();
  vm.decompose(vPos, new THREE.Quaternion(), new THREE.Vector3());
  assert.equal(vPos.y, 7);
  assert.equal(vPos.x, CHUNK_SIZE + CHUNK_SIZE / 2);
  disposeMapTileLayer(layer);
});

test('syncMapTileCoverage honors skipIndices without rewriting their matrix', () => {
  const layer = buildLayer({ displayRadius: 1 });
  const skipIdx = layer.chunkToIndex.get('-1:-1')!;
  // Pre-set the skipped cell to a recognizable matrix.
  setMapTileMatrix(layer, skipIdx, -1, -1, 99);
  const visible = syncMapTileCoverage(layer, new Set<string>(), 3, new Set<number>([skipIdx]));
  assert.equal(visible, 9); // skipped still counts as visible

  // skipped cell retained its y=99 (not rewritten to backdropY=3).
  const m = new THREE.Matrix4();
  layer.mesh.getMatrixAt(skipIdx, m);
  const pos = new THREE.Vector3();
  m.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
  assert.equal(pos.y, 99);
  disposeMapTileLayer(layer);
});

test('disposeMapTileLayer is null-safe and disposes resources', () => {
  // null path
  assert.doesNotThrow(() => disposeMapTileLayer(null));

  const layer = buildLayer();
  let textureDisposed = false;
  const material = layer.mesh.material as THREE.ShaderMaterial;
  const tex = material.uniforms.map.value as THREE.Texture;
  tex.dispose = () => { textureDisposed = true; };
  disposeMapTileLayer(layer);
  assert.equal(textureDisposed, true);
});
