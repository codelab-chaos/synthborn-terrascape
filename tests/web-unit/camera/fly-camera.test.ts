import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  syncFlyLookFromCamera,
  applyFlyLook,
  updateFlyTarget,
  zoomFlyView,
  shouldStartFlyLook,
  isFlyLookActive,
  applyFlyLookDelta,
  handleKeyboardNavigation,
} from '../../../src/main/resources/web/src/camera/fly-camera.ts';
import {
  camera,
  controls,
  runtime,
  pressedKeys,
} from '../../../src/main/resources/web/src/scene/scene-context.ts';

function resetRig() {
  runtime.viewPlayerUuid = null;
  runtime.flyYaw = 0;
  runtime.flyPitch = 0;
  pressedKeys.clear();
  camera.position.set(0, 100, 0);
  camera.quaternion.identity();
  camera.updateMatrixWorld(true);
}

test('syncFlyLookFromCamera derives yaw/pitch from the camera direction', () => {
  resetRig();
  // Look straight down -Z (default forward). yaw ~ 0, pitch ~ 0.
  camera.lookAt(0, 100, -10);
  camera.updateMatrixWorld(true);
  syncFlyLookFromCamera();
  assert.ok(Number.isFinite(runtime.flyYaw));
  assert.ok(Number.isFinite(runtime.flyPitch));
  assert.ok(Math.abs(runtime.flyPitch) < 0.01);
});

test('applyFlyLook clamps pitch and orients the camera, updating the controls target', () => {
  resetRig();
  runtime.flyPitch = 10; // beyond the clamp
  runtime.flyYaw = 0.5;
  applyFlyLook();
  // Pitch clamped to just under +PI/2.
  assert.ok(runtime.flyPitch <= Math.PI / 2 - 0.01 + 1e-9);
  assert.ok(runtime.flyPitch >= Math.PI / 2 - 0.01 - 1e-9);
  // Target moved away from the camera along the forward axis.
  assert.ok(controls.target.distanceTo(camera.position) > 1);
});

test('updateFlyTarget projects the controls target ahead of the camera', () => {
  resetRig();
  camera.lookAt(0, 100, -10);
  camera.updateMatrixWorld(true);
  updateFlyTarget();
  // FLY_LOOK_DISTANCE is 64.
  assert.ok(Math.abs(controls.target.distanceTo(camera.position) - 64) < 1e-3);
});

test('zoomFlyView moves the camera forward along its view axis', () => {
  resetRig();
  camera.lookAt(50, 100, 0); // forward roughly +X, level
  camera.updateMatrixWorld(true);
  const before = camera.position.clone();
  zoomFlyView(-100); // negative deltaY -> zoom in (positive ticks)
  assert.ok(!camera.position.equals(before));
});

test('zoomFlyView ignores invalid deltas and player-eye mode', () => {
  resetRig();
  const before = camera.position.clone();
  zoomFlyView(0);
  zoomFlyView(NaN as any);
  assert.ok(camera.position.equals(before));

  runtime.viewPlayerUuid = 'someone';
  zoomFlyView(-100);
  assert.ok(camera.position.equals(before));
  runtime.viewPlayerUuid = null;
});

test('zoomFlyView clamps vertical movement to the configured altitude band', () => {
  resetRig();
  camera.position.set(0, 10, 0);
  // Point straight up so a zoom would push Y below FLY_MIN_Y (8).
  camera.lookAt(0, 100, 0);
  camera.updateMatrixWorld(true);
  zoomFlyView(100); // positive deltaY -> negative ticks -> move opposite forward (down)
  assert.ok(camera.position.y >= 8 - 1e-6);
});

test('shouldStartFlyLook only accepts a plain left-click', () => {
  assert.equal(shouldStartFlyLook({ button: 0, altKey: false, ctrlKey: false, metaKey: false } as any), true);
  assert.equal(shouldStartFlyLook({ button: 2, altKey: false, ctrlKey: false, metaKey: false } as any), false);
  assert.equal(shouldStartFlyLook({ button: 0, altKey: true, ctrlKey: false, metaKey: false } as any), false);
});

test('isFlyLookActive reflects the pointer lock element', () => {
  // No pointer lock set in the headless DOM -> false.
  assert.equal(isFlyLookActive(), false);
});

test('applyFlyLookDelta adjusts yaw/pitch from mouse movement', () => {
  resetRig();
  applyFlyLookDelta(100, 50);
  assert.ok(runtime.flyYaw !== 0);
  assert.ok(runtime.flyPitch !== 0);
});

test('handleKeyboardNavigation moves the camera when movement keys are pressed', () => {
  resetRig();
  camera.lookAt(0, 100, -10);
  camera.updateMatrixWorld(true);
  const before = camera.position.clone();
  pressedKeys.add('KeyW');
  handleKeyboardNavigation(0.1);
  assert.ok(!camera.position.equals(before));
});

test('handleKeyboardNavigation respects sprint and vertical keys', () => {
  resetRig();
  camera.lookAt(0, 100, -10);
  camera.updateMatrixWorld(true);
  pressedKeys.add('Space');
  pressedKeys.add('ShiftLeft');
  const beforeY = camera.position.y;
  handleKeyboardNavigation(0.1);
  assert.ok(camera.position.y > beforeY);
});

test('handleKeyboardNavigation does nothing in eye mode or with no keys', () => {
  resetRig();
  const before = camera.position.clone();
  handleKeyboardNavigation(0.1); // no keys
  assert.ok(camera.position.equals(before));

  runtime.viewPlayerUuid = 'p';
  pressedKeys.add('KeyW');
  handleKeyboardNavigation(0.1);
  assert.ok(camera.position.equals(before));
  runtime.viewPlayerUuid = null;
  pressedKeys.clear();
});

test('handleKeyboardNavigation with opposing keys produces no net move', () => {
  resetRig();
  camera.lookAt(0, 100, -10);
  camera.updateMatrixWorld(true);
  const before = camera.position.clone();
  pressedKeys.add('KeyW');
  pressedKeys.add('KeyS');
  handleKeyboardNavigation(0.1);
  assert.ok(camera.position.distanceTo(before) < 1e-6);
});
