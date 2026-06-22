import assert from 'node:assert/strict';
import test from 'node:test';

import { resizeViewport } from '../../../src/main/resources/web/src/scene/viewport.ts';
import { camera } from '../../../src/main/resources/web/src/scene/scene-context.ts';

test('resizeViewport updates the camera aspect from the window size', () => {
  (window as any).innerWidth = 1024;
  (window as any).innerHeight = 512;
  resizeViewport();
  assert.ok(Math.abs(camera.aspect - 1024 / 512) < 1e-6);
});

test('resizeViewport handles a different aspect without throwing', () => {
  (window as any).innerWidth = 800;
  (window as any).innerHeight = 600;
  resizeViewport();
  assert.ok(Math.abs(camera.aspect - 800 / 600) < 1e-6);
});
