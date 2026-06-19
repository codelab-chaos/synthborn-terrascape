import { isVectorState, saveStoredViewState, vectorState } from './view-state.ts';
import {
  applyBooleanParam as applyBooleanControlParam,
  applyFloatParam as applyFloatControlParam,
  applyNumberParam as applyNumberControlParam,
  applySelectParam as applySelectControlParam,
  isTruthyParam,
  setNumberInput,
  setPairedControlValue,
} from '../library/control-values.ts';
import { camera, controls, initialParams, runtime } from '../scene/scene-context.ts';
import {
  applySelectValue,
  mobBlocksEnabled,
  radiusValue,
  readFloatControl,
  setRadiusControlValue,
  syncMobBlocksInputs,
  terrainLoadConcurrency,
  terrainPromotionBudgetMs,
  terrainPromotionsPerFrame,
  visualDetailMode,
  waterModeValue,
  TRI_STATE_VALUES_BY_ID,
} from './control-readers.ts';
import { applyLighting, fogControlRange } from '../scene/lighting-controls.ts';
import { applyCollapsedSectionState, collapsedSectionState } from '../library/collapsible-section.ts';
import { setSettingsPanelOpen } from './app-events.ts';
import { playerChunk } from '../camera/camera-director.ts';
import { syncFlyLookFromCamera } from '../camera/fly-camera.ts';
import { updateEntityVisibility } from '../entities/entity-feed.ts';
import {
  autoStreamInput,
  chunkXInput,
  chunkZInput,
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
  infoCardEl,
  infoCardHeadEl,
  landMotionInput,
  mapTilesInput,
  mapTimeInput,
  mobBlocksInput,
  playerUpdateRateInput,
  mobUpdateRateInput,
  radiusInput,
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

const VISUAL_DEFAULTS_VERSION = 2;

export function setRenderDetailsOpen(open) {
  const isOpen = open === true;
  infoCardEl.classList.toggle('collapsed', !isOpen);
  infoCardHeadEl.setAttribute('aria-expanded', String(isOpen));
  infoCardHeadEl.title = isOpen ? 'Hide render details' : 'Show render details';
}

export function toggleRenderDetails() {
  setRenderDetailsOpen(infoCardEl.classList.contains('collapsed'));
  saveViewState();
}

export function applyInitialParams() {
  applyStoredInputs();
  applyNumberParam('chunkX', chunkXInput);
  applyNumberParam('chunkZ', chunkZInput);
  applyNumberParam('radius', radiusInput);
  applyBooleanParam('auto', autoStreamInput);
  applyBooleanParam('bounds', debugBoundsInput);
  applyBooleanParam('players', showPlayersInput);
  applyBooleanParam('mobs', showMobsInput);
  applyBooleanParam('mobBlocks', mobBlocksInput);
  syncMobBlocksInputs(mobBlocksInput.checked);
  applyBooleanParam('shade', treeShadeInput);
  applyBooleanParam('mapTiles', mapTilesInput);
  applyCosmeticModeParam();
  applySelectParam('visualDetail', visualDetailModeInput);
  applyBooleanParam('landMotion', landMotionInput);
  applyBooleanParam('mapTime', mapTimeInput);
  applyNumberParam('terrainLoadSlots', terrainLoadSlotsValueInput);
  terrainLoadSlotsInput.value = terrainLoadSlotsValueInput.value;
  applyNumberParam('terrainSpawnFrame', terrainSpawnFrameValueInput);
  terrainSpawnFrameInput.value = terrainSpawnFrameValueInput.value;
  applyNumberParam('terrainSpawnMs', terrainSpawnBudgetValueInput);
  terrainSpawnBudgetInput.value = terrainSpawnBudgetValueInput.value;
  applyFloatParam('shadeSize', shadeSizeInput, shadeSizeValueInput);
  applyFloatParam('shadeDarkness', shadeDarknessInput, shadeDarknessValueInput);
  applySelectParam('water', waterModeInput);
  applyBooleanParam('fog', fogEnabledInput);
  applyFloatParam('fogNear', fogNearInput, fogNearValueInput);
  applyFloatParam('fogFar', fogFarInput, fogFarValueInput);
  applyFloatParam('fogStrength', fogStrengthInput, fogStrengthValueInput);
  applyFloatParam('fogHorizon', fogHorizonInput, fogHorizonValueInput);
  applySelectParam('playerRate', playerUpdateRateInput);
  applySelectParam('mobRate', mobUpdateRateInput);
  applyLighting();
  updateEntityVisibility();
}

function applyStoredInputs() {
  if (!runtime.storedViewState) return;
  if (runtime.storedViewState.visualDefaultsVersion !== VISUAL_DEFAULTS_VERSION) {
    applySelectValue(cosmeticBlocksModeInput, 'split');
    applySelectValue(visualDetailModeInput, 'all');
  }
  setNumberInput(chunkXInput, runtime.storedViewState.chunkX);
  setNumberInput(chunkZInput, runtime.storedViewState.chunkZ);
  setRadiusControlValue(runtime.storedViewState.radius);
  if (typeof runtime.storedViewState.auto === 'boolean') autoStreamInput.checked = runtime.storedViewState.auto;
  if (typeof runtime.storedViewState.bounds === 'boolean') debugBoundsInput.checked = runtime.storedViewState.bounds;
  if (typeof runtime.storedViewState.players === 'boolean') showPlayersInput.checked = runtime.storedViewState.players;
  if (typeof runtime.storedViewState.mobs === 'boolean') showMobsInput.checked = runtime.storedViewState.mobs;
  if (typeof runtime.storedViewState.mobBlocks === 'boolean') syncMobBlocksInputs(runtime.storedViewState.mobBlocks);
  if (typeof runtime.storedViewState.shade === 'boolean') treeShadeInput.checked = runtime.storedViewState.shade;
  if (typeof runtime.storedViewState.mapTime === 'boolean') mapTimeInput.checked = runtime.storedViewState.mapTime;
  if (typeof runtime.storedViewState.mapTiles === 'boolean') mapTilesInput.checked = runtime.storedViewState.mapTiles;
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.cosmeticsMode === 'string') {
    applySelectValue(cosmeticBlocksModeInput, runtime.storedViewState.cosmeticsMode);
  }
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.cosmetics === 'boolean' && !runtime.storedViewState.cosmeticsMode) {
    applySelectValue(cosmeticBlocksModeInput, runtime.storedViewState.cosmetics ? 'baked' : 'off');
  }
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.visualDetailMode === 'string') {
    applySelectValue(visualDetailModeInput, runtime.storedViewState.visualDetailMode);
  }
  if (typeof runtime.storedViewState.landMotion === 'boolean') landMotionInput.checked = runtime.storedViewState.landMotion;
  if (typeof runtime.storedViewState.renderDetails === 'boolean') setRenderDetailsOpen(runtime.storedViewState.renderDetails);
  if (typeof runtime.storedViewState.settingsOpen === 'boolean') setSettingsPanelOpen(runtime.storedViewState.settingsOpen);
  applyCollapsedSectionState(runtime.storedViewState.sections);
  setPairedControlValue(terrainLoadSlotsInput, terrainLoadSlotsValueInput, runtime.storedViewState.terrainLoadSlots);
  setPairedControlValue(terrainSpawnFrameInput, terrainSpawnFrameValueInput, runtime.storedViewState.terrainSpawnFrame);
  setPairedControlValue(terrainSpawnBudgetInput, terrainSpawnBudgetValueInput, runtime.storedViewState.terrainSpawnMs);
  setPairedControlValue(shadeSizeInput, shadeSizeValueInput, runtime.storedViewState.shadeSize);
  setPairedControlValue(shadeDarknessInput, shadeDarknessValueInput, runtime.storedViewState.shadeDarkness);
  if (typeof runtime.storedViewState.water === 'string') {
    applySelectValue(waterModeInput, runtime.storedViewState.water);
  }
  if (typeof runtime.storedViewState.fog === 'boolean') fogEnabledInput.checked = runtime.storedViewState.fog;
  setPairedControlValue(fogNearInput, fogNearValueInput, runtime.storedViewState.fogNear);
  setPairedControlValue(fogFarInput, fogFarValueInput, runtime.storedViewState.fogFar);
  setPairedControlValue(fogStrengthInput, fogStrengthValueInput, runtime.storedViewState.fogStrength);
  setPairedControlValue(fogHorizonInput, fogHorizonValueInput, runtime.storedViewState.fogHorizon);
  if (typeof runtime.storedViewState.playerRate === 'string') {
    applySelectValue(playerUpdateRateInput, runtime.storedViewState.playerRate);
  }
  if (typeof runtime.storedViewState.mobRate === 'string') {
    applySelectValue(mobUpdateRateInput, runtime.storedViewState.mobRate);
  }
}

export function applyStoredWorld() {
  if (!runtime.storedViewState?.world) return;
  applySelectValue(worldSelect, runtime.storedViewState.world);
}

export function applyInitialWorldParam() {
  const world = initialParams.get('world');
  if (!world) return;
  for (const option of worldSelect.options) {
    if (option.value === world) {
      worldSelect.value = world;
      return;
    }
  }
}

function applyNumberParam(name, input) {
  const parsed = applyNumberControlParam(initialParams, name, input);
  if (parsed === null) return;
  if (input === radiusInput) {
    setRadiusControlValue(parsed);
  }
}

function applyBooleanParam(name, input) {
  applyBooleanControlParam(initialParams, name, input);
}

function applyCosmeticModeParam() {
  const mode = initialParams.get('cosmeticsMode');
  if (mode === 'off' || mode === 'baked' || mode === 'split') {
    applySelectValue(cosmeticBlocksModeInput, mode);
    return;
  }
  const legacy = initialParams.get('cosmetics');
  if (legacy === null) return;
  applySelectValue(cosmeticBlocksModeInput, isTruthyParam(legacy) ? 'baked' : 'off');
}

function applyFloatParam(name, ...inputs) {
  applyFloatControlParam(initialParams, name, ...inputs);
}

function applySelectParam(name, input) {
  applySelectControlParam(initialParams, name, input, TRI_STATE_VALUES_BY_ID);
}

export function restoreCameraPose() {
  if (!runtime.storedViewState || hasExplicitViewParams()) {
    return false;
  }
  const cameraState = runtime.storedViewState.camera;
  const targetState = runtime.storedViewState.target;
  if (!isVectorState(cameraState) || !isVectorState(targetState)) {
    return false;
  }

  camera.position.set(cameraState.x, cameraState.y, cameraState.z);
  controls.target.set(targetState.x, targetState.y, targetState.z);
  controls.update();
  syncFlyLookFromCamera();
  runtime.hasFocusedInitialGrid = true;
  runtime.hasRestoredCameraPose = true;
  return true;
}

function hasExplicitViewParams() {
  return ['world', 'chunkX', 'chunkZ', 'radius'].some((name) => initialParams.has(name));
}

export function saveViewState() {
  if (!runtime.hasStarted || !worldSelect.value) return;
  const target = controls.target;
  const chunk = playerChunk();
  const state = {
    world: worldSelect.value,
    visualDefaultsVersion: VISUAL_DEFAULTS_VERSION,
    chunkX: Number.parseInt(chunkXInput.value, 10) || chunk.chunkX,
    chunkZ: Number.parseInt(chunkZInput.value, 10) || chunk.chunkZ,
    radius: radiusValue(),
    auto: autoStreamInput.checked,
    bounds: debugBoundsInput.checked,
    players: showPlayersInput.checked,
    mobs: showMobsInput.checked,
    mobBlocks: mobBlocksEnabled(),
    renderDetails: !infoCardEl.classList.contains('collapsed'),
    settingsOpen: hudEl.classList.contains('open'),
    sections: collapsedSectionState(),
    shade: treeShadeInput.checked,
    mapTime: mapTimeInput.checked,
    mapTiles: mapTilesInput.checked,
    cosmeticsMode: cosmeticBlocksModeInput.value,
    visualDetailMode: visualDetailMode(),
    landMotion: landMotionInput.checked,
    terrainLoadSlots: terrainLoadConcurrency(),
    terrainSpawnFrame: terrainPromotionsPerFrame(),
    terrainSpawnMs: terrainPromotionBudgetMs(),
    shadeSize: Number.parseFloat(shadeSizeValueInput.value),
    shadeDarkness: Number.parseFloat(shadeDarknessValueInput.value),
    water: waterModeValue(),
    fog: fogEnabledInput.checked,
    fogNear: fogControlRange().near,
    fogFar: fogControlRange().far,
    fogStrength: readFloatControl(fogStrengthValueInput, 0.9),
    fogHorizon: readFloatControl(fogHorizonValueInput, 0.65),
    playerRate: playerUpdateRateInput.value,
    mobRate: mobUpdateRateInput.value,
    camera: vectorState(camera.position),
    target: vectorState(target),
  };
  if (saveStoredViewState(state)) {
    runtime.storedViewState = state;
  }
}

export function maybeSaveViewState() {
  if (runtime.viewPlayerUuid || runtime.followPlayerUuid) return;
  const now = performance.now();
  if (now - runtime.lastViewStateSave < 500) return;
  runtime.lastViewStateSave = now;
  saveViewState();
}
