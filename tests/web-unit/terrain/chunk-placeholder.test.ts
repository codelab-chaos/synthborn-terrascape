import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { createChunkPlaceholderManager } from '../../../src/main/resources/web/src/terrain/chunk-placeholder.ts';

const CHUNK_SIZE = 32;
const PLACEHOLDER_BASE_Y = 96;

function key(chunkX: number, chunkZ: number, id?: string) {
  return { chunkX, chunkZ, id: id ?? `default:${chunkX}:${chunkZ}` };
}

test('sync creates placeholder objects and adds them to the scene', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(0, 0), key(1, 2)], new Set());

  assert.equal(manager.count(), 2);
  assert.equal(manager.waitingCount(), 2);
  // Two placeholder groups added to scene.
  const groups = scene.children.filter((c) => c.name === 'chunk-placeholder');
  assert.equal(groups.length, 2);

  // Position derived from chunk coords.
  const target = groups.find((g) => g.position.x === 1 * CHUNK_SIZE);
  assert.ok(target);
  assert.equal(target.position.y, PLACEHOLDER_BASE_Y);
  assert.equal(target.position.z, 2 * CHUNK_SIZE);

  // Each placeholder has edge lines + a face grid.
  const lineSegments = target.children.filter((c) => c instanceof THREE.LineSegments);
  assert.equal(lineSegments.length, 2);
});

test('sync derives id via chunkId when key.id is missing', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('w', [{ chunkX: 3, chunkZ: 4 }] as any, new Set());
  assert.equal(manager.count(), 1);

  // resolve uses chunkId('w', 3, 4) — should match the synced placeholder.
  manager.resolve('w', 3, 4);
  assert.equal(manager.waitingCount(), 0);
  assert.equal(manager.count(), 1);
});

test('sync skips chunks already loaded', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  const loaded = new Set(['default:0:0']);
  manager.sync('default', [key(0, 0), key(5, 5)], loaded);

  assert.equal(manager.count(), 1);
  assert.equal(manager.waitingCount(), 1);
});

test('sync re-positions an existing waiting placeholder and makes it visible', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(2, 2)], new Set());
  const group = scene.children.find((c) => c.name === 'chunk-placeholder')!;
  group.visible = false;
  group.position.set(999, 999, 999);

  // Re-sync the same key — should reposition and re-show, not create a new one.
  manager.sync('default', [key(2, 2)], new Set());
  assert.equal(manager.count(), 1);
  assert.equal(group.visible, true);
  assert.equal(group.position.x, 2 * CHUNK_SIZE);
  assert.equal(group.position.z, 2 * CHUNK_SIZE);
});

test('sync disposes waiting placeholders that are no longer needed', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(0, 0), key(1, 0)], new Set());
  assert.equal(manager.count(), 2);

  // Drop key(1,0) from the needed set.
  manager.sync('default', [key(0, 0)], new Set());
  assert.equal(manager.count(), 1);
  assert.equal(scene.children.filter((c) => c.name === 'chunk-placeholder').length, 1);
});

test('sync does not dispose a fading placeholder even if not in keep set', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(0, 0)], new Set());
  manager.resolve('default', 0, 0); // -> fading
  assert.equal(manager.waitingCount(), 0);

  manager.sync('default', [], new Set()); // empty needed set
  // Fading entry is retained (it is removed by update(), not sync()).
  assert.equal(manager.count(), 1);
});

test('resolve marks a placeholder fading and is idempotent', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(7, 8)], new Set());
  assert.equal(manager.waitingCount(), 1);

  manager.resolve('default', 7, 8);
  assert.equal(manager.waitingCount(), 0);
  assert.equal(manager.count(), 1);

  // Calling again on an already-fading entry returns early.
  manager.resolve('default', 7, 8);
  assert.equal(manager.count(), 1);
});

test('resolve is a no-op for an unknown chunk', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);
  // Should not throw.
  manager.resolve('default', 100, 100);
  assert.equal(manager.count(), 0);
});

test('update fades opacity over time and removes completed placeholders', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(0, 0)], new Set());
  manager.resolve('default', 0, 0);

  const group = scene.children.find((c) => c.name === 'chunk-placeholder')!;
  const edgeLine = group.children.find(
    (c) => c instanceof THREE.LineSegments && (c.material as THREE.LineBasicMaterial).opacity === 0.72,
  ) as THREE.LineSegments | undefined;
  assert.ok(edgeLine);

  // Partial fade: ~110ms => progress 0.5.
  manager.update(0.11);
  const mat = edgeLine.material as THREE.LineBasicMaterial;
  assert.ok(mat.opacity < 0.72 && mat.opacity > 0);
  assert.equal(manager.count(), 1);

  // Finish the fade (>220ms total).
  manager.update(0.2);
  assert.equal(manager.count(), 0);
  assert.equal(scene.children.filter((c) => c.name === 'chunk-placeholder').length, 0);
});

test('update ignores entries that are still waiting', () => {
  const scene = new THREE.Scene();
  const manager = createChunkPlaceholderManager(scene);

  manager.sync('default', [key(0, 0)], new Set());
  manager.update(5); // large delta, but the entry is not fading
  assert.equal(manager.count(), 1);
  assert.equal(manager.waitingCount(), 1);
});
