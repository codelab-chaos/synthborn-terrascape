import { bindPairedControl, bindRadiusControl } from '../library/control-values.ts';
import { bindHudSectionCollapsibles } from '../library/collapsible-section.ts';
import { bindTriStateControl } from '../library/tri-state-control.ts';
import { setTileLoadConcurrency } from '../tile-map/map-backdrop.ts';
import { tileLoadConcurrency } from './control-readers.ts';
import {
  chunkXInput,
  chunkZInput,
  clearMeshCacheButton,
  cosmeticBlocksModeInput,
  debugBoundsInput,
  fogEnabledInput,
  fogFarInput,
  fogFarValueInput,
  fogHorizonInput,
  fogHorizonValueInput,
  fogNearInput,
  fogNearValueInput,
  fogStrengthInput,
  fogStrengthValueInput,
  hudEl,
  infoCardHeadEl,
  landMotionInput,
  mapTilesInput,
  syncTimeInput,
  mobBlocksInput,
  mobBlocksPanelInput,
  panelToggle,
  playerUpdateRateInput,
  mobUpdateRateInput,
  radiusInput,
  radiusRangeInput,
  serverCardHeadEl,
  shadeDarknessInput,
  shadeDarknessValueInput,
  shadeSizeInput,
  shadeSizeValueInput,
  showMobsInput,
  showPlayersInput,
  terrainLoadSlotsInput,
  terrainLoadSlotsValueInput,
  mapTileRadiusInput,
  mapTileRadiusValueInput,
  tileLoadSlotsInput,
  tileLoadSlotsValueInput,
  treeShadeInput,
  visualDetailModeInput,
  waterModeInput,
  worldSelect,
} from './dom.ts';

const MOVEMENT_KEY_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'KeyR',
  'KeyC',
  'Space',
  'PageUp',
  'PageDown',
  'ShiftLeft',
  'ShiftRight',
]);

type AppEventBindings = {
  renderer: { domElement: HTMLElement };
  pressedKeys: Set<string>;
  getViewPlayerUuid: () => string | null;
  getFollowPlayerUuid: () => string | null;
  applyFlyLookDelta: (movementX: number, movementY: number) => void;
  applyFogSettings: () => void;
  applyLighting: () => void;
  applyMapWaterTint: () => void;
  applyWaterMode: () => void;
  clearMobs: () => void;
  closeEntityStream: () => void;
  handleClearMeshCache: () => void | Promise<void>;
  refreshWorldTime: () => void | Promise<void>;
  restartEntityStream: () => void;
  restartMobPolling: (delayMs?: number | null) => void;
  restartPlayerPolling: () => void;
  restartWorldTimePolling: () => void;
  saveViewState: () => void;
  scheduleControlGridLoad: () => void;
  setRadiusControlValue: (value: string | number) => string | number;
  shouldStartFlyLook: (event: PointerEvent) => boolean;
  syncMobBlocksInputs: (checked: boolean) => void;
  toggleRenderDetails: () => void;
  toggleServerDetails: () => void;
  updateDebugBounds: () => void;
  updateEntityVisibility: () => void;
  updateMapTileLayer: () => void;
  updatePlayers: (players: unknown[]) => void;
  updateRadiusReadout: () => void;
  zoomFlyView: (deltaY: number) => void;
  reloadTerrainForVisualOptions: () => void;
  resize: () => void;
};

export function bindAppEvents(bindings: AppEventBindings) {
  window.addEventListener('resize', bindings.resize);
  // Capture phase so movement keys are intercepted before focusable controls (inputs, and
  // role="button" divs like the panel heads) can act on them.
  window.addEventListener('keydown', (event) => handleKeyDown(event, bindings), { capture: true });
  window.addEventListener('keyup', (event) => {
    bindings.pressedKeys.delete(event.code);
  });
  bindings.renderer.domElement.addEventListener('pointerdown', (event) => {
    blurFocusedHudControl();
    if (!bindings.getViewPlayerUuid() && bindings.shouldStartFlyLook(event)) {
      event.preventDefault();
      bindings.renderer.domElement.requestPointerLock?.();
    }
  }, { capture: true });
  bindings.renderer.domElement.addEventListener('wheel', (event) => {
    if (bindings.getViewPlayerUuid()) return;
    event.preventDefault();
    bindings.zoomFlyView(event.deltaY);
  }, { passive: false });
  window.addEventListener('mousemove', (event) => {
    if (!isFlyLookActive(bindings.renderer.domElement) || bindings.getViewPlayerUuid()) return;
    bindings.applyFlyLookDelta(event.movementX, event.movementY);
  });
  window.addEventListener('terrascape:map-backdrop-loaded', bindings.applyMapWaterTint);

  bindHudInputs(bindings);
  bindTriStateControls(bindings.saveViewState);
}

function bindHudInputs(bindings: AppEventBindings) {
  debugBoundsInput.addEventListener('change', bindings.updateDebugBounds);
  debugBoundsInput.addEventListener('change', bindings.saveViewState);
  showPlayersInput.addEventListener('change', () => {
    bindings.updateEntityVisibility();
    bindings.restartEntityStream();
    bindings.restartPlayerPolling();
    bindings.saveViewState();
  });
  showMobsInput.addEventListener('change', () => {
    if (!showMobsInput.checked) {
      bindings.clearMobs();
    }
    bindings.updateEntityVisibility();
    bindings.restartEntityStream();
    if (showMobsInput.checked) {
      bindings.restartMobPolling(0);
    } else {
      bindings.restartMobPolling();
    }
    bindings.saveViewState();
  });
  const onMobBlocksToggle = (event: Event) => {
    bindings.syncMobBlocksInputs(Boolean((event.target as HTMLInputElement | null)?.checked));
    bindings.updateEntityVisibility();
    bindings.saveViewState();
  };
  mobBlocksInput.addEventListener('change', onMobBlocksToggle);
  mobBlocksPanelInput.addEventListener('change', onMobBlocksToggle);
  waterModeInput.addEventListener('change', () => {
    bindings.applyWaterMode();
    bindings.saveViewState();
  });
  playerUpdateRateInput.addEventListener('change', () => {
    bindings.restartPlayerPolling();
    bindings.saveViewState();
  });
  mobUpdateRateInput.addEventListener('change', () => {
    bindings.restartMobPolling();
    bindings.saveViewState();
  });
  for (const input of [treeShadeInput]) {
    const eventName = input.type === 'range' ? 'input' : 'change';
    input.addEventListener(eventName, () => {
      bindings.applyLighting();
      bindings.saveViewState();
    });
  }
  syncTimeInput.addEventListener('change', () => {
    if (syncTimeInput.checked) {
      void bindings.refreshWorldTime();
    } else {
      bindings.applyLighting();
    }
    bindings.restartWorldTimePolling();
    bindings.saveViewState();
  });
  mapTilesInput.addEventListener('change', () => {
    bindings.updateMapTileLayer();
    bindings.saveViewState();
  });
  cosmeticBlocksModeInput.addEventListener('change', () => {
    bindings.reloadTerrainForVisualOptions();
    bindings.saveViewState();
  });
  visualDetailModeInput.addEventListener('change', () => {
    bindings.reloadTerrainForVisualOptions();
    bindings.saveViewState();
  });
  clearMeshCacheButton?.addEventListener('click', () => {
    void bindings.handleClearMeshCache();
  });
  landMotionInput.addEventListener('change', bindings.saveViewState);
  bindRadiusControl(radiusRangeInput, radiusInput, {
    setRadius: bindings.setRadiusControlValue,
    updateReadout: bindings.updateRadiusReadout,
    onChange: bindings.scheduleControlGridLoad,
  });
  bindPairedControl(terrainLoadSlotsInput, terrainLoadSlotsValueInput, { onSave: bindings.saveViewState });
  bindPairedControl(mapTileRadiusInput, mapTileRadiusValueInput, {
    onUpdate: bindings.updateMapTileLayer,
    onSave: bindings.saveViewState,
  });
  bindPairedControl(tileLoadSlotsInput, tileLoadSlotsValueInput, {
    onUpdate: () => setTileLoadConcurrency(tileLoadConcurrency()),
    onSave: bindings.saveViewState,
  });
  bindPairedControl(shadeSizeInput, shadeSizeValueInput, { onUpdate: bindings.applyLighting, onSave: bindings.saveViewState });
  bindPairedControl(shadeDarknessInput, shadeDarknessValueInput, { onUpdate: bindings.applyLighting, onSave: bindings.saveViewState });
  fogEnabledInput.addEventListener('change', () => {
    bindings.applyFogSettings();
    bindings.saveViewState();
  });
  bindPairedControl(fogNearInput, fogNearValueInput, { onUpdate: bindings.applyFogSettings, onSave: bindings.saveViewState });
  bindPairedControl(fogFarInput, fogFarValueInput, { onUpdate: bindings.applyFogSettings, onSave: bindings.saveViewState });
  bindPairedControl(fogStrengthInput, fogStrengthValueInput, { onUpdate: bindings.applyFogSettings, onSave: bindings.saveViewState });
  bindPairedControl(fogHorizonInput, fogHorizonValueInput, { onUpdate: bindings.applyFogSettings, onSave: bindings.saveViewState });
  worldSelect.addEventListener('change', () => {
    bindings.closeEntityStream();
    bindings.updatePlayers([]);
    bindings.clearMobs();
    bindings.restartEntityStream();
    void bindings.refreshWorldTime();
    bindings.restartPlayerPolling();
    bindings.restartMobPolling();
    bindings.restartWorldTimePolling();
    bindings.scheduleControlGridLoad();
    bindings.saveViewState();
  });
  for (const input of [chunkXInput, chunkZInput]) {
    if (!input) continue;
    input.addEventListener('input', bindings.scheduleControlGridLoad);
    input.addEventListener('change', bindings.scheduleControlGridLoad);
  }
  panelToggle.addEventListener('click', () => {
    setSettingsPanelOpen(!hudEl.classList.contains('open'));
    bindings.saveViewState();
  });
  infoCardHeadEl.addEventListener('click', bindings.toggleRenderDetails);
  infoCardHeadEl.addEventListener('keydown', (event) => {
    if (!isActivationKey(event)) return;
    event.preventDefault();
    bindings.toggleRenderDetails();
  });
  serverCardHeadEl.addEventListener('click', bindings.toggleServerDetails);
  serverCardHeadEl.addEventListener('keydown', (event) => {
    if (!isActivationKey(event)) return;
    event.preventDefault();
    bindings.toggleServerDetails();
  });
}

function isActivationKey(event: Event) {
  const key = (event as KeyboardEvent).key;
  return key === 'Enter' || key === ' ';
}

function bindTriStateControls(onSectionToggle?: () => void) {
  bindHudSectionCollapsibles(document, onSectionToggle);
  bindTriStateControl(document, 'cosmetic-blocks-mode', [
    { value: 'off', label: 'Off' },
    { value: 'baked', label: 'Baked' },
    { value: 'split', label: 'Split' },
  ]);
  bindTriStateControl(document, 'visual-detail-mode', [
    { value: 'basic', label: 'Basic' },
    { value: 'structures', label: 'Struct' },
    { value: 'all', label: 'Foliage' },
  ]);
}

function handleKeyDown(event: KeyboardEvent, bindings: AppEventBindings) {
  if (event.key === 'Escape') {
    const confirmDialog = document.querySelector<HTMLDialogElement>('#confirm-dialog');
    if (confirmDialog?.open) return;
    blurFocusedHudControl();
    if (!hudEl.classList.contains('open')) return;
    event.preventDefault();
    setSettingsPanelOpen(false);
    bindings.saveViewState();
    return;
  }
  if (isTypingInHud()) return;
  if (MOVEMENT_KEY_CODES.has(event.code)) {
    // Blur any focused control and stop the event before it reaches that control's own handler.
    blurFocusedHudControl();
    event.preventDefault();
    event.stopPropagation();
    bindings.pressedKeys.add(event.code);
  }
}

export function setSettingsPanelOpen(open: boolean) {
  hudEl.classList.toggle('open', open);
  panelToggle.classList.toggle('active', open);
  panelToggle.setAttribute('aria-expanded', String(open));
}

// True only when the user is genuinely typing text — so movement keys (incl. Space) are left
// alone. Checkboxes, selects, range sliders and buttons are NOT text entry: keys should drive
// the camera and the focused control gets blurred instead of activated.
export function isTypingInHud() {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement) {
    return true;
  }
  if (active instanceof HTMLInputElement) {
    const textTypes = new Set(['text', 'number', 'search', 'email', 'url', 'tel', 'password']);
    return textTypes.has(active.type);
  }
  return false;
}

function blurFocusedHudControl() {
  const active = document.activeElement;
  // Blur any focused control, including focusable role="button" divs (panel/section heads),
  // so keyboard/Space no longer activates them. The canvas/body never need to stay focused.
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}

function isFlyLookActive(domElement: HTMLElement) {
  return document.pointerLockElement === domElement;
}
