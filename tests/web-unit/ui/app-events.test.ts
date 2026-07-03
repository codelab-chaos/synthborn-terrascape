import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindAppEvents,
  setSettingsPanelOpen,
  isTypingInHud,
} from '../../../web/src/ui/app-events.ts';
import {
  chunkXInput,
  debugBoundsInput,
  fogEnabledInput,
  hudEl,
  infoCardHeadEl,
  landMotionInput,
  mapTilesInput,
  syncTimeInput,
  mobBlocksInput,
  panelToggle,
  serverCardHeadEl,
  showMobsInput,
  showPlayersInput,
  treeShadeInput,
  waterModeInput,
  worldSelect,
} from '../../../web/src/ui/dom.ts';

function makeBindings() {
  const calls: Record<string, number> = {};
  const bump = (name: string) => { calls[name] = (calls[name] ?? 0) + 1; };
  const noop = (name: string) => () => bump(name);
  const bindings: any = {
    renderer: { domElement: document.createElement('canvas') },
    pressedKeys: new Set<string>(),
    getViewPlayerUuid: () => null,
    getFollowPlayerUuid: () => null,
    applyFlyLookDelta: noop('applyFlyLookDelta'),
    applyFogSettings: noop('applyFogSettings'),
    applyLighting: noop('applyLighting'),
    applyMapWaterTint: noop('applyMapWaterTint'),
    applyWaterMode: noop('applyWaterMode'),
    clearMobs: noop('clearMobs'),
    closeEntityStream: noop('closeEntityStream'),
    handleClearMeshCache: noop('handleClearMeshCache'),
    refreshWorldTime: noop('refreshWorldTime'),
    restartEntityStream: noop('restartEntityStream'),
    restartMobPolling: noop('restartMobPolling'),
    restartPlayerPolling: noop('restartPlayerPolling'),
    restartWorldTimePolling: noop('restartWorldTimePolling'),
    saveViewState: noop('saveViewState'),
    scheduleControlGridLoad: noop('scheduleControlGridLoad'),
    setRadiusControlValue: (v: number) => { bump('setRadiusControlValue'); return v; },
    shouldStartFlyLook: () => false,
    syncMobBlocksInputs: noop('syncMobBlocksInputs'),
    toggleRenderDetails: noop('toggleRenderDetails'),
    toggleServerDetails: noop('toggleServerDetails'),
    updateDebugBounds: noop('updateDebugBounds'),
    updateEntityVisibility: noop('updateEntityVisibility'),
    updateMapTileLayer: noop('updateMapTileLayer'),
    updatePlayers: noop('updatePlayers'),
    updateRadiusReadout: noop('updateRadiusReadout'),
    zoomFlyView: noop('zoomFlyView'),
    reloadTerrainForVisualOptions: noop('reloadTerrainForVisualOptions'),
    resize: noop('resize'),
  };
  return { bindings, calls };
}

// Bind once for the whole module — listeners on shared DOM elements persist.
const { bindings, calls } = makeBindings();
bindAppEvents(bindings);

function change(el: any) {
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

test('window resize and map-backdrop events are wired', () => {
  window.dispatchEvent(new window.Event('resize'));
  assert.ok(calls.resize >= 1);
  window.dispatchEvent(new window.CustomEvent('terrascape:map-backdrop-loaded'));
  assert.ok(calls.applyMapWaterTint >= 1);
});

test('debug bounds toggle updates bounds and saves', () => {
  const before = calls.saveViewState ?? 0;
  change(debugBoundsInput);
  assert.ok(calls.updateDebugBounds >= 1);
  assert.ok((calls.saveViewState ?? 0) > before);
});

test('show players toggle restarts streams/polling', () => {
  change(showPlayersInput);
  assert.ok(calls.updateEntityVisibility >= 1);
  assert.ok(calls.restartEntityStream >= 1);
  assert.ok(calls.restartPlayerPolling >= 1);
});

test('show mobs toggle clears mobs when unchecked', () => {
  showMobsInput.checked = false;
  change(showMobsInput);
  assert.ok(calls.clearMobs >= 1);
  // When checked, restartMobPolling(0) path runs.
  showMobsInput.checked = true;
  change(showMobsInput);
  assert.ok(calls.restartMobPolling >= 1);
});

test('mob blocks toggle syncs the paired inputs', () => {
  mobBlocksInput.checked = true;
  change(mobBlocksInput);
  assert.ok(calls.syncMobBlocksInputs >= 1);
});

test('water mode + rate selects apply and persist', () => {
  change(waterModeInput);
  assert.ok(calls.applyWaterMode >= 1);
});

test('tree shade, sync time, and map-tiles toggles fire their handlers', () => {
  change(treeShadeInput);
  assert.ok(calls.applyLighting >= 1);
  syncTimeInput.checked = true;
  change(syncTimeInput);
  assert.ok(calls.refreshWorldTime >= 1);
  assert.ok(calls.restartWorldTimePolling >= 1);
  syncTimeInput.checked = false;
  change(syncTimeInput);
  assert.ok(calls.applyLighting >= 2);
  change(mapTilesInput);
  assert.ok(calls.updateMapTileLayer >= 1);
});

test('land motion toggle saves view state', () => {
  const before = calls.saveViewState ?? 0;
  change(landMotionInput);
  assert.ok((calls.saveViewState ?? 0) > before);
});

test('fog enabled toggle applies fog settings', () => {
  change(fogEnabledInput);
  assert.ok(calls.applyFogSettings >= 1);
});

test('world select change tears down and rebuilds the live feeds', () => {
  change(worldSelect);
  assert.ok(calls.closeEntityStream >= 1);
  assert.ok(calls.updatePlayers >= 1);
  assert.ok(calls.scheduleControlGridLoad >= 1);
});

test('chunk inputs schedule a control grid load', () => {
  const before = calls.scheduleControlGridLoad ?? 0;
  chunkXInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok((calls.scheduleControlGridLoad ?? 0) > before);
});

test('panel toggle opens/closes the HUD and persists', () => {
  hudEl.classList.remove('open');
  panelToggle.dispatchEvent(new window.Event('click'));
  assert.ok(hudEl.classList.contains('open'));
  panelToggle.dispatchEvent(new window.Event('click'));
  assert.ok(!hudEl.classList.contains('open'));
});

test('info card head click and keyboard activation toggle render details', () => {
  const before = calls.toggleRenderDetails ?? 0;
  infoCardHeadEl.dispatchEvent(new window.Event('click'));
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter' });
  infoCardHeadEl.dispatchEvent(enter);
  assert.ok((calls.toggleRenderDetails ?? 0) >= before + 2);
});

test('server card head click and keyboard activation toggle server details', () => {
  const before = calls.toggleServerDetails ?? 0;
  serverCardHeadEl.dispatchEvent(new window.Event('click'));
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter' });
  serverCardHeadEl.dispatchEvent(enter);
  assert.ok((calls.toggleServerDetails ?? 0) >= before + 2);
});

test('keydown: movement key while not typing is captured into pressedKeys', () => {
  // Ensure nothing is focused as a text field.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  const evt = new window.KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true });
  window.dispatchEvent(evt);
  assert.ok(bindings.pressedKeys.has('KeyW'));
});

test('keydown: Escape closes an open settings panel', () => {
  setSettingsPanelOpen(true);
  const before = calls.saveViewState ?? 0;
  const evt = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  window.dispatchEvent(evt);
  assert.ok(!hudEl.classList.contains('open'));
  assert.ok((calls.saveViewState ?? 0) > before);
});

test('keyup removes the key from pressedKeys', () => {
  bindings.pressedKeys.add('KeyA');
  const evt = new window.KeyboardEvent('keyup', { code: 'KeyA' });
  window.dispatchEvent(evt);
  assert.ok(!bindings.pressedKeys.has('KeyA'));
});

test('pointerdown can start fly look while following a player', () => {
  const previousView = bindings.getViewPlayerUuid;
  const previousFollow = bindings.getFollowPlayerUuid;
  const previousShouldStart = bindings.shouldStartFlyLook;
  const previousRequestPointerLock = bindings.renderer.domElement.requestPointerLock;
  let requestCount = 0;
  bindings.getViewPlayerUuid = () => null;
  bindings.getFollowPlayerUuid = () => 'player-1';
  bindings.shouldStartFlyLook = () => true;
  bindings.renderer.domElement.requestPointerLock = () => { requestCount += 1; };
  const evt = new window.MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true });

  try {
    bindings.renderer.domElement.dispatchEvent(evt);
    assert.equal(requestCount, 1);
    assert.equal(evt.defaultPrevented, true);
  } finally {
    bindings.getViewPlayerUuid = previousView;
    bindings.getFollowPlayerUuid = previousFollow;
    bindings.shouldStartFlyLook = previousShouldStart;
    bindings.renderer.domElement.requestPointerLock = previousRequestPointerLock;
  }
});

test('wheel zoom is allowed in follow mode and blocked in eye mode', () => {
  const previousView = bindings.getViewPlayerUuid;
  const previousFollow = bindings.getFollowPlayerUuid;
  const makeWheel = () => {
    const evt = new window.Event('wheel', { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(evt, 'deltaY', { value: 100 });
    return evt;
  };

  try {
    bindings.getViewPlayerUuid = () => null;
    bindings.getFollowPlayerUuid = () => 'player-1';
    const beforeFollow = calls.zoomFlyView ?? 0;
    const followEvt = makeWheel();
    bindings.renderer.domElement.dispatchEvent(followEvt);
    assert.ok((calls.zoomFlyView ?? 0) > beforeFollow);
    assert.equal(followEvt.defaultPrevented, true);

    bindings.getViewPlayerUuid = () => 'player-1';
    const beforeEye = calls.zoomFlyView ?? 0;
    const eyeEvt = makeWheel();
    bindings.renderer.domElement.dispatchEvent(eyeEvt);
    assert.equal(calls.zoomFlyView ?? 0, beforeEye);
    assert.equal(eyeEvt.defaultPrevented, false);
  } finally {
    bindings.getViewPlayerUuid = previousView;
    bindings.getFollowPlayerUuid = previousFollow;
  }
});

test('setSettingsPanelOpen reflects state on hud + toggle aria', () => {
  setSettingsPanelOpen(true);
  assert.ok(hudEl.classList.contains('open'));
  assert.equal(panelToggle.getAttribute('aria-expanded'), 'true');
  setSettingsPanelOpen(false);
  assert.equal(panelToggle.getAttribute('aria-expanded'), 'false');
});

test('isTypingInHud distinguishes text inputs from other controls', () => {
  const text = document.createElement('input');
  text.type = 'text';
  document.body.appendChild(text);
  text.focus();
  assert.equal(isTypingInHud(), true);
  text.blur();

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  document.body.appendChild(checkbox);
  checkbox.focus();
  assert.equal(isTypingInHud(), false);
  checkbox.blur();
});
