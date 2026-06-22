import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFpsCounter,
  updateFpsCounter,
  positionFpsCounter,
} from '../../../web/src/ui/fps-counter.ts';

function ensureReadoutEls() {
  for (const id of ['fps-value', 'fps-frame']) {
    if (!document.getElementById(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  }
}

test('createFpsCounter initialises a zeroed counter and renders 0', () => {
  ensureReadoutEls();
  const counter = createFpsCounter();
  assert.equal(counter.frames, 0);
  assert.equal(counter.elapsed, 0);
  assert.equal(counter.fps, 0);
  assert.equal(document.getElementById('fps-value').textContent, '0');
  assert.equal(document.getElementById('fps-frame').textContent, '0.0 ms');
});

test('updateFpsCounter accumulates below the interval without recomputing', () => {
  ensureReadoutEls();
  const counter = createFpsCounter();
  updateFpsCounter(counter, 0.1);
  assert.equal(counter.frames, 1);
  assert.equal(counter.fps, 0);
});

test('updateFpsCounter recomputes fps/frameMs once the interval elapses', () => {
  ensureReadoutEls();
  const counter = createFpsCounter();
  // Frames 1,2 stay under the 0.25s interval; frame 3 crosses it (3 frames / 0.3s = 10 fps,
  // 100ms/frame) and resets the accumulators.
  updateFpsCounter(counter, 0.1);
  updateFpsCounter(counter, 0.1);
  updateFpsCounter(counter, 0.1);
  assert.ok(Math.abs(counter.fps - 10) < 1e-6);
  assert.ok(Math.abs(counter.frameMs - 100) < 1e-6);
  assert.equal(counter.frames, 0);
  assert.equal(counter.elapsed, 0);
  assert.equal(document.getElementById('fps-value').textContent, '10');
  assert.equal(document.getElementById('fps-frame').textContent, '100.0 ms');
});

test('positionFpsCounter is a no-op that does not throw', () => {
  assert.doesNotThrow(() => positionFpsCounter());
});
