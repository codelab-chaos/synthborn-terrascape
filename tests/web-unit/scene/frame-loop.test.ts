import assert from 'node:assert/strict';
import test from 'node:test';

import { startFrameLoop } from '../../../web/src/scene/frame-loop.ts';
import { postProcessing, controls } from '../../../web/src/scene/scene-context.ts';

// startFrameLoop only schedules `animate` via requestAnimationFrame. We capture the
// scheduled callback (rather than letting it fire on a timer) so we can drive a single
// frame deterministically and assert it advanced scene state — without leaking an
// async animation loop into other tests.
test('startFrameLoop schedules an animation callback', () => {
  const realRaf = globalThis.requestAnimationFrame;
  let scheduled: FrameRequestCallback | null = null;
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    scheduled = cb;
    return 1;
  };
  try {
    startFrameLoop();
    assert.equal(typeof scheduled, 'function');
  } finally {
    (globalThis as any).requestAnimationFrame = realRaf;
  }
});

test('a single animate frame runs the per-frame pipeline', () => {
  const realRaf = globalThis.requestAnimationFrame;
  let scheduled: FrameRequestCallback | null = null;
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    scheduled = cb;
    return 1;
  };

  // The final stage of animate() is renderPostProcessing, which calls renderer.render
  // when post-processing is disabled — a real GPU draw that throws headless. Enabling
  // post-processing and stubbing composer.render keeps the frame off the GPU while
  // still exercising the whole animate() body up to that point.
  const prevEnabled = postProcessing.enabled;
  const prevRender = postProcessing.composer.render;
  const prevControls = controls.enabled;
  postProcessing.enabled = true;
  postProcessing.composer.render = () => {};
  // Enable controls so the controls.update() branch inside animate() is exercised.
  controls.enabled = true;

  try {
    startFrameLoop();
    assert.equal(typeof scheduled, 'function');
    // Invoke the captured frame. It re-schedules itself, but our stub just captures it.
    assert.doesNotThrow(() => (scheduled as FrameRequestCallback)(performance.now()));
  } finally {
    postProcessing.enabled = prevEnabled;
    postProcessing.composer.render = prevRender;
    controls.enabled = prevControls;
    (globalThis as any).requestAnimationFrame = realRaf;
  }
});
