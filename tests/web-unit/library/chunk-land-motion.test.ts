import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createChunkLandMotion,
  type ChunkLandEntry,
} from '../../../web/src/library/chunk-land-motion.ts';

function makeEntry(overrides: Partial<ChunkLandEntry> = {}): ChunkLandEntry {
  return {
    object: new THREE.Object3D(),
    chunkX: 0,
    chunkZ: 0,
    landState: 'settled',
    landStartedAt: 0,
    landDurationMs: 0,
    landStartY: 0,
    landTargetY: 0,
    onLandComplete: null,
    pendingUnload: null,
    ...overrides,
  };
}

test('beginLoad with enabled=false snaps the object to ground and settles', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  entry.object.position.y = 99;
  motion.beginLoad(entry, false);
  assert.equal(entry.landState, 'settled');
  assert.equal(entry.object.position.y, 0);
  assert.equal(entry.landStartedAt, 0);
  assert.equal(motion.isAnimating(entry), false);
});

test('beginLoad with enabled=true starts a rise from below ground', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginLoad(entry, true);
  assert.equal(entry.landState, 'rising');
  assert.equal(entry.object.position.y, -48);
  assert.equal(entry.landTargetY, 0);
  assert.equal(entry.landDurationMs, 190);
  assert.ok(entry.landStartedAt > 0);
  assert.equal(motion.isAnimating(entry), true);
});

test('update animates a rising entry toward the ground and eventually settles', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginLoad(entry, true);
  // Force the elapsed time well past the duration so the rise completes.
  entry.landStartedAt = 1;
  entry.landDurationMs = 1;
  const active = motion.update([entry]);
  assert.equal(active, 1);
  // After enough elapsed time the entry settles at ground level.
  assert.equal(entry.landState, 'settled');
  assert.equal(entry.object.position.y, 0);
});

test('update mid-flight leaves the entry rising and lerps position', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginLoad(entry, true);
  // Halfway through the rise duration.
  entry.landStartedAt = performance.now() - 95;
  motion.update([entry]);
  assert.equal(entry.landState, 'rising');
  assert.ok(entry.object.position.y > -48 && entry.object.position.y <= 0);
});

test('beginUnload with enabled=false invokes onComplete synchronously and returns false', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  let done = 0;
  const result = motion.beginUnload(entry, false, () => { done++; });
  assert.equal(result, false);
  assert.equal(done, 1);
  assert.equal(entry.landState, 'settled');
});

test('beginUnload on a settled entry starts a sink and settles after enough time', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  entry.object.position.y = 0;
  let done = 0;
  const result = motion.beginUnload(entry, true, () => { done++; });
  assert.equal(result, true);
  assert.equal(entry.landState, 'sinking');
  assert.equal(entry.landTargetY, -12);
  entry.landStartedAt = 1;
  entry.landDurationMs = 1;
  motion.update([entry]);
  assert.equal(entry.landState, 'settled');
  assert.equal(entry.object.position.y, -12);
  assert.equal(done, 1);
});

test('beginUnload while rising defers the sink until the rise completes', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginLoad(entry, true);
  let done = 0;
  const result = motion.beginUnload(entry, true, () => { done++; });
  assert.equal(result, true);
  assert.ok(typeof entry.pendingUnload === 'function');
  // Drive the rise to completion; the pending unload should fire and begin a sink.
  entry.landStartedAt = 1;
  entry.landDurationMs = 1;
  motion.update([entry]);
  assert.equal(entry.landState, 'sinking');
  assert.equal(entry.pendingUnload, null);
  // Now finish the sink.
  entry.landStartedAt = 1;
  entry.landDurationMs = 1;
  motion.update([entry]);
  assert.equal(entry.landState, 'settled');
  assert.equal(done, 1);
});

test('beginUnload while sinking just replaces the completion callback', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginUnload(entry, true, () => {});
  assert.equal(entry.landState, 'sinking');
  let done = 0;
  const result = motion.beginUnload(entry, true, () => { done++; });
  assert.equal(result, true);
  assert.equal(typeof entry.onLandComplete, 'function');
  entry.landStartedAt = 1;
  entry.landDurationMs = 1;
  motion.update([entry]);
  assert.equal(done, 1);
});

test('cancel resets the entry to a settled grounded state', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry();
  motion.beginLoad(entry, true);
  motion.cancel(entry);
  assert.equal(entry.landState, 'settled');
  assert.equal(entry.object.position.y, 0);
  assert.equal(entry.pendingUnload, null);
  assert.equal(entry.onLandComplete, null);
});

test('update normalizes a legacy "dropping" state into rising', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry({ landState: 'dropping' as any });
  entry.object.position.y = -20;
  motion.update([entry]);
  // After normalization it should be animating (rising) or have settled if duration was tiny.
  assert.notEqual(entry.landState, 'dropping');
});

test('update reconciles a grounded-but-offset settled entry back to ground', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry({ landState: 'settled' });
  entry.object.position.y = 5;
  const active = motion.update([entry]);
  assert.equal(active, 0);
  assert.equal(entry.object.position.y, 0);
  assert.equal(entry.landState, 'settled');
});

test('update with a tiny offset within epsilon leaves a settled entry alone', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry({ landState: 'settled' });
  entry.object.position.y = 0.1;
  motion.update([entry]);
  assert.equal(entry.object.position.y, 0.1);
});

test('activeCount counts only rising and sinking entries', () => {
  const motion = createChunkLandMotion();
  const rising = makeEntry({ landState: 'rising' });
  const sinking = makeEntry({ landState: 'sinking' });
  const settled = makeEntry({ landState: 'settled' });
  assert.equal(motion.activeCount([rising, sinking, settled]), 2);
  assert.equal(motion.activeCount([settled]), 0);
});

test('tickEntry repairs an invalid landStartedAt before animating', () => {
  const motion = createChunkLandMotion();
  const entry = makeEntry({ landState: 'rising', landStartedAt: -5, landDurationMs: 190, landStartY: -48, landTargetY: 0 });
  motion.update([entry]);
  // landStartedAt should have been set to a positive value (or it settled).
  assert.ok(entry.landStartedAt > 0 || entry.landState === 'settled');
});
