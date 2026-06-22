import assert from 'node:assert/strict';
import test from 'node:test';

import { createFrameJankRecorder } from '../../../src/main/resources/web/src/scene/frame-jank.ts';

test('createFrameJankRecorder tracks active load kind', () => {
  const rec = createFrameJankRecorder();
  assert.equal(rec.getActiveLoadKind(), 'none');
  rec.setActiveLoadKind('batch');
  assert.equal(rec.getActiveLoadKind(), 'batch');
});

test('recordFrame ignores fast frames but records hitches', () => {
  const rec = createFrameJankRecorder();
  // First recordFrame establishes a baseline using performance.now(); call twice
  // quickly so the delta stays below the 50ms hitch threshold.
  rec.recordFrame();
  rec.recordFrame();
  let stats = rec.stats();
  assert.equal(stats.hitchCount50, 0);
  assert.ok(stats.samples >= 1);
});

test('stats computes percentiles over recorded frames', () => {
  const rec = createFrameJankRecorder();
  for (let i = 0; i < 5; i++) rec.recordFrame();
  const stats = rec.stats();
  assert.ok(stats.samples >= 1);
  assert.ok(Number.isFinite(stats.p50FrameMs));
  assert.ok(Number.isFinite(stats.p95FrameMs));
  assert.ok(Number.isFinite(stats.p99FrameMs));
  assert.ok(Number.isFinite(stats.maxFrameMs));
  assert.equal(stats.activeLoadKind, 'none');
});

test('stats handles empty recorder', () => {
  const rec = createFrameJankRecorder();
  const stats = rec.stats();
  assert.equal(stats.samples, 0);
  assert.equal(stats.p50FrameMs, 0);
  assert.equal(stats.maxFrameMs, 0);
  assert.equal(stats.hitchCount50, 0);
});

test('reset clears hitch counters', () => {
  const rec = createFrameJankRecorder();
  rec.setActiveLoadKind('grid');
  rec.recordFrame();
  rec.reset();
  const stats = rec.stats();
  assert.equal(stats.samples, 0);
  assert.equal(stats.hitchCount50, 0);
  assert.equal(stats.hitchCount100, 0);
  assert.equal(stats.longestHitchMs, 0);
  assert.equal(stats.hitchWhileLoading, 0);
});

test('recordFrame counts a genuine hitch (large synthetic delta)', async () => {
  const rec = createFrameJankRecorder();
  rec.setActiveLoadKind('backdrop');
  rec.recordFrame();
  // Spin-wait > 100ms so the next recordFrame sees a severe hitch.
  const start = performance.now();
  while (performance.now() - start < 110) { /* busy wait */ }
  rec.recordFrame();
  const stats = rec.stats();
  assert.ok(stats.hitchCount50 >= 1);
  assert.ok(stats.hitchCount100 >= 1);
  assert.ok(stats.longestHitchMs >= 100);
  assert.ok(stats.hitchWhileLoading >= 1);
});
