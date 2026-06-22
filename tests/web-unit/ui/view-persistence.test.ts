import assert from 'node:assert/strict';
import test from 'node:test';

import {
  setRenderDetailsOpen,
  toggleRenderDetails,
  applyInitialParams,
  applyStoredWorld,
  applyInitialWorldParam,
  restoreCameraPose,
  saveViewState,
  maybeSaveViewState,
} from '../../../web/src/ui/view-persistence.ts';
import { VIEW_STATE_KEY } from '../../../web/src/ui/view-state.ts';
import {
  runtime,
  camera,
  controls,
} from '../../../web/src/scene/scene-context.ts';
import {
  infoCardEl,
  infoCardHeadEl,
  worldSelect,
} from '../../../web/src/ui/dom.ts';

function selectWorld(name: string) {
  worldSelect.replaceChildren();
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  worldSelect.append(option);
  worldSelect.value = name;
}

test('setRenderDetailsOpen toggles the collapsed class and aria/title', () => {
  setRenderDetailsOpen(true);
  assert.ok(!infoCardEl.classList.contains('collapsed'));
  assert.equal(infoCardHeadEl.getAttribute('aria-expanded'), 'true');
  assert.equal(infoCardHeadEl.title, 'Hide render details');

  setRenderDetailsOpen(false);
  assert.ok(infoCardEl.classList.contains('collapsed'));
  assert.equal(infoCardHeadEl.getAttribute('aria-expanded'), 'false');
  assert.equal(infoCardHeadEl.title, 'Show render details');
});

test('toggleRenderDetails flips the collapsed state', () => {
  // Need hasStarted + a world for saveViewState (called inside toggle) to persist; not required
  // for the toggle itself though.
  runtime.hasStarted = false;
  setRenderDetailsOpen(false); // collapsed
  toggleRenderDetails();
  assert.ok(!infoCardEl.classList.contains('collapsed'));
  toggleRenderDetails();
  assert.ok(infoCardEl.classList.contains('collapsed'));
});

test('applyInitialParams runs the full input bootstrap without storedViewState', () => {
  runtime.storedViewState = null;
  assert.doesNotThrow(() => applyInitialParams());
});

test('applyInitialParams applies a stored view state snapshot', () => {
  runtime.storedViewState = {
    visualDefaultsVersion: 2,
    chunkX: 3,
    chunkZ: -4,
    radius: 6,
    auto: true,
    bounds: true,
    players: false,
    mobs: true,
    mobBlocks: true,
    shade: true,
    mapTime: false,
    mapTiles: true,
    cosmeticsMode: 'baked',
    visualDetailMode: 'structures',
    landMotion: false,
    renderDetails: true,
    settingsOpen: false,
    sections: {},
    terrainLoadSlots: 5,
    mapTileRadius: 18,
    tilesAtOnce: 3,
    terrainSpawnFrame: 2,
    terrainSpawnMs: 4,
    shadeSize: 1.5,
    shadeDarkness: 0.3,
    water: 'transparent',
    fog: true,
    fogNear: 100,
    fogFar: 600,
    fogStrength: 0.8,
    fogHorizon: 0.6,
    playerRate: '500',
    mobRate: '250',
  };
  assert.doesNotThrow(() => applyInitialParams());
});

test('applyInitialParams resets visual defaults when stored version is stale', () => {
  runtime.storedViewState = { visualDefaultsVersion: 1, chunkX: 0, chunkZ: 0, radius: 1 };
  assert.doesNotThrow(() => applyInitialParams());
});

test('applyStoredWorld selects the persisted world when it exists', () => {
  selectWorld('persisted');
  runtime.storedViewState = { world: 'persisted' };
  applyStoredWorld();
  assert.equal(worldSelect.value, 'persisted');

  // No stored world => no-op.
  runtime.storedViewState = {};
  assert.doesNotThrow(() => applyStoredWorld());
});

test('applyInitialWorldParam is a no-op when no world param present', () => {
  // initialParams is frozen from the (param-less) test URL.
  assert.doesNotThrow(() => applyInitialWorldParam());
});

test('restoreCameraPose restores a stored pose and flags runtime', () => {
  runtime.hasFocusedInitialGrid = false;
  runtime.hasRestoredCameraPose = false;
  runtime.storedViewState = {
    camera: { x: 10, y: 20, z: 30 },
    target: { x: 1, y: 2, z: 3 },
  };
  const restored = restoreCameraPose();
  assert.equal(restored, true);
  assert.equal(camera.position.x, 10);
  assert.equal(controls.target.y, 2);
  assert.equal(runtime.hasRestoredCameraPose, true);
});

test('restoreCameraPose returns false without a valid stored pose', () => {
  runtime.storedViewState = { camera: { x: 1 }, target: { x: 1, y: 2, z: 3 } };
  assert.equal(restoreCameraPose(), false);
  runtime.storedViewState = null;
  assert.equal(restoreCameraPose(), false);
});

test('saveViewState bails until started with a world selected', () => {
  window.localStorage.removeItem(VIEW_STATE_KEY);
  runtime.hasStarted = false;
  selectWorld('w1');
  saveViewState();
  assert.equal(window.localStorage.getItem(VIEW_STATE_KEY), null);
});

test('saveViewState persists a full snapshot once started', () => {
  window.localStorage.removeItem(VIEW_STATE_KEY);
  runtime.hasStarted = true;
  selectWorld('w1');
  saveViewState();
  const raw = window.localStorage.getItem(VIEW_STATE_KEY);
  assert.ok(raw, 'view state written');
  const parsed = JSON.parse(raw as string);
  assert.equal(parsed.world, 'w1');
  assert.equal(parsed.visualDefaultsVersion, 2);
  assert.ok('camera' in parsed && 'target' in parsed);
  assert.equal(runtime.storedViewState.world, 'w1');
  runtime.hasStarted = false;
});

test('maybeSaveViewState skips while spectating and throttles by time', () => {
  runtime.viewPlayerUuid = 'someone';
  runtime.lastViewStateSave = 0;
  const before = runtime.lastViewStateSave;
  maybeSaveViewState();
  assert.equal(runtime.lastViewStateSave, before); // spectating => skipped

  runtime.viewPlayerUuid = null;
  runtime.followPlayerUuid = null;
  runtime.lastViewStateSave = performance.now();
  const stamp = runtime.lastViewStateSave;
  maybeSaveViewState(); // within 500ms throttle window
  assert.equal(runtime.lastViewStateSave, stamp);
});
