import {
  bindPairedControl,
  bindRadiusControl,
} from '../library/control-values.ts';
import { bindHudSectionCollapsibles } from '../library/collapsible-section.ts';
import { bindTriStateControl } from '../library/tri-state-control.ts';
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
  mapTimeInput,
  mobBlocksInput,
  mobBlocksPanelInput,
  panelToggle,
  playerUpdateRateInput,
  mobUpdateRateInput,
  radiusInput,
  radiusRangeInput,
  shadeDarknessInput,
  shadeDarknessValueInput,
  shadeSizeInput,
  shadeSizeValueInput,
  showMobsInput,
  showPlayersInput,
  terrainLoadSlotsInput,
  terrainLoadSlotsValueInput,
  terrainSpawnBudgetInput,
  terrainSpawnBudgetValueInput,
  terrainSpawnFrameInput,
  terrainSpawnFrameValueInput,
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
  window.addEventListener('keydown', (event) => handleKeyDown(event, bindings));
  window.addEventListener('keyup', (event) => {
    bindings.pressedKeys.delete(event.code);
  });
  bindings.renderer.domElement.addEventListener('pointerdown', (event) => {
    blurFocusedHudControl();
    if (!bindings.getViewPlayerUuid() && !bindings.getFollowPlayerUuid() && bindings.shouldStartFlyLook(event)) {
      event.preventDefault();
      bindings.renderer.domElement.requestPointerLock?.();
    }
  }, { capture: true });
  bindings.renderer.domElement.addEventListener('wheel', (event) => {
    if (bindings.getViewPlayerUuid() || bindings.getFollowPlayerUuid()) return;
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
  mapTimeInput.addEventListener('change', () => {
    bindings.applyLighting();
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
  bindPairedControl(terrainSpawnFrameInput, terrainSpawnFrameValueInput, { onSave: bindings.saveViewState });
  bindPairedControl(terrainSpawnBudgetInput, terrainSpawnBudgetValueInput, { onSave: bindings.saveViewState });
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
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    bindings.toggleRenderDetails();
  });
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
    if (!hudEl.classList.contains('open')) return;
    event.preventDefault();
    blurFocusedHudControl();
    setSettingsPanelOpen(false);
    bindings.saveViewState();
    return;
  }
  if (isTypingInHud()) return;
  if (MOVEMENT_KEY_CODES.has(event.code)) {
    event.preventDefault();
    bindings.pressedKeys.add(event.code);
  }
}

export function setSettingsPanelOpen(open: boolean) {
  hudEl.classList.toggle('open', open);
  panelToggle.classList.toggle('active', open);
  panelToggle.setAttribute('aria-expanded', String(open));
}

export function isTypingInHud() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement
    || active instanceof HTMLSelectElement
    || active instanceof HTMLTextAreaElement;
}

function blurFocusedHudControl() {
  if (isTypingInHud()) {
    (document.activeElement as HTMLElement).blur();
  }
}

function isFlyLookActive(domElement: HTMLElement) {
  return document.pointerLockElement === domElement;
}
