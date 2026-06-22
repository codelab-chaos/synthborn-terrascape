import assert from 'node:assert/strict';
import test from 'node:test';

import { updateEmptyGrid } from '../../../src/main/resources/web/src/scene/empty-grid.ts';
import { camera, grid } from '../../../src/main/resources/web/src/scene/scene-context.ts';

test('updateEmptyGrid snaps grid to a 32-unit lattice under the camera', () => {
  camera.position.set(70, 0, -40);
  updateEmptyGrid();
  // round(70/32)*32 = round(2.19)*32 = 2*32 = 64; round(-40/32)*32 = round(-1.25)*32 = -32.
  assert.equal(grid.position.x, 64);
  assert.equal(grid.position.y, 96);
  assert.equal(grid.position.z, -32);
});

test('updateEmptyGrid recomputes when the camera moves', () => {
  camera.position.set(200, 0, 200);
  updateEmptyGrid();
  // round(200/32)*32 = round(6.25)*32 = 6*32 = 192.
  assert.equal(grid.position.x, 192);
  assert.equal(grid.position.z, 192);
  assert.equal(grid.position.y, 96);
});
