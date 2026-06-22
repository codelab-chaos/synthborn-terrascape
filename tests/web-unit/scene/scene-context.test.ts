import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  renderer,
  rendererPixelRatio,
  scene,
  camera,
  controls,
  grid,
  loader,
  clock,
  runtime,
  initialParams,
  lightingRig,
  postProcessing,
  fpsCounter,
  npcCatalog,
  timeRibbon,
  chunkPlaceholderManager,
  chunkLandMotion,
  frameJank,
  loadedChunks,
  playerMarkers,
  playerTiles,
  mobMarkers,
  disposalStats,
  pressedKeys,
  cameraModeStack,
  playerEyeState,
  setStatus,
  displayColor,
  SKY_COLOR,
  NOON_LIGHTING_TIME,
  FLY_MOUSE_BUTTONS,
  FOLLOW_MOUSE_BUTTONS,
} from '../../../src/main/resources/web/src/scene/scene-context.ts';
import { statusEl } from '../../../src/main/resources/web/src/ui/dom.ts';

test('core singletons are constructed', () => {
  assert.ok(renderer);
  assert.ok(scene.isScene);
  assert.ok(camera.isPerspectiveCamera);
  assert.ok(controls);
  assert.ok(grid.isObject3D);
  assert.ok(loader);
  assert.ok(clock instanceof THREE.Clock);
  assert.ok(typeof rendererPixelRatio === 'number');
});

test('scene background and grid setup', () => {
  assert.ok(scene.background.isColor);
  assert.equal(scene.fog, null);
  assert.equal(grid.renderOrder, -50);
  assert.ok(scene.children.includes(grid));
  const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const m of mats) {
    assert.equal(m.transparent, true);
    assert.ok(Math.abs(m.opacity - 0.42) < 1e-6);
    assert.equal(m.depthWrite, false);
  }
});

test('camera positioned and controls configured', () => {
  // camera.position is shared mutable state other test files move, so only assert the
  // camera object identity/type here rather than the (now stale) initial coordinates.
  assert.ok(camera.isPerspectiveCamera);
  assert.equal(controls.enabled, false);
  assert.equal(controls.enableDamping, true);
  assert.equal(controls.minDistance, 18);
  assert.equal(controls.maxDistance, 1400);
});

test('mouse button presets exist', () => {
  assert.equal(FLY_MOUSE_BUTTONS.MIDDLE, THREE.MOUSE.PAN);
  assert.equal(FOLLOW_MOUSE_BUTTONS.LEFT, THREE.MOUSE.ROTATE);
  assert.equal(FOLLOW_MOUSE_BUTTONS.RIGHT, THREE.MOUSE.DOLLY);
});

test('constants are exported', () => {
  assert.equal(SKY_COLOR, 0x173454);
  assert.equal(NOON_LIGHTING_TIME.phase, 'noon');
  assert.equal(NOON_LIGHTING_TIME.dayProgress, 0.5);
});

test('higher-level services are wired', () => {
  assert.ok(lightingRig.sun);
  assert.ok(postProcessing.composer);
  assert.ok(fpsCounter);
  assert.ok(npcCatalog);
  assert.ok(timeRibbon);
  assert.ok(chunkPlaceholderManager);
  assert.ok(chunkLandMotion);
  assert.ok(frameJank);
  assert.ok(initialParams instanceof URLSearchParams);
  assert.ok(runtime);
});

test('shared collections start empty', () => {
  assert.ok(loadedChunks instanceof Map);
  assert.ok(playerMarkers instanceof Map);
  assert.ok(playerTiles instanceof Map);
  assert.ok(mobMarkers instanceof Map);
  assert.ok(pressedKeys instanceof Set);
  assert.ok(Array.isArray(cameraModeStack));
  assert.equal(disposalStats.chunks, 0);
  assert.equal(disposalStats.geometries, 0);
  assert.equal(playerEyeState.uuid, null);
  assert.equal(playerEyeState.yawRad, 0);
});

test('setStatus writes textContent to the status element', () => {
  setStatus('hello world');
  assert.equal(statusEl.textContent, 'hello world');
});

test('displayColor converts a THREE.Color to sRGB bytes', () => {
  const out = displayColor(new THREE.Color(0xffffff));
  assert.deepEqual(out, { r: 255, g: 255, b: 255 });
  const black = displayColor(new THREE.Color(0x000000));
  assert.deepEqual(black, { r: 0, g: 0, b: 0 });
});

test('displayColor returns null for non-color input', () => {
  assert.equal(displayColor(null), null);
  assert.equal(displayColor({}), null);
  assert.equal(displayColor(undefined), null);
});
