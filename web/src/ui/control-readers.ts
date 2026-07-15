import { numberOr } from '../common/utils.ts';
import {
  floatControlValue,
  radiusReadout,
  safeWaterMode,
  terrainTuningControlValue,
} from '../common/view-preferences.ts';
import { applySelectValue as applyControlSelectValue, normalizePairedValue } from '../library/control-values.ts';
import { runtime } from '../scene/scene-context.ts';
import {
  cosmeticBlocksModeInput,
  landMotionInput,
  mobBlocksInput,
  mobBlocksPanelInput,
  radiusDiameterEl,
  radiusInput,
  radiusRangeInput,
  terrainLoadSlotsValueInput,
  mapTileRadiusValueInput,
  tileLoadSlotsValueInput,
  terrainSpawnBudgetValueInput,
  terrainSpawnFrameValueInput,
  visualDetailModeInput,
  waterModeInput,
} from './dom.ts';

export const COSMETIC_MODE_VALUES = ['off', 'baked', 'split'];
export const VISUAL_DETAIL_VALUES = ['basic', 'structures', 'all'];
export const TRI_STATE_VALUES_BY_ID = {
  'cosmetic-blocks-mode': COSMETIC_MODE_VALUES,
  'visual-detail-mode': VISUAL_DETAIL_VALUES,
};

export const AUTO_STREAM_RETAIN_MARGIN = 1;
const DEFAULT_TERRAIN_LOAD_CONCURRENCY = 4;
const DEFAULT_TERRAIN_PROMOTION_BUDGET_MS = 4;
const DEFAULT_TERRAIN_PROMOTIONS_PER_FRAME = 2;
const DEFAULT_MAP_TILE_RADIUS = 16;
const DEFAULT_TILE_LOAD_CONCURRENCY = 4;

// Map tile distance is an independent knob, but never smaller than the voxel mesh radius — tiles
// must at least cover the loaded meshes (below that, tiles add nothing the voxels don't already).
export function mapTileRadius() {
  return Math.max(terrainTuningValue(mapTileRadiusValueInput, DEFAULT_MAP_TILE_RADIUS), radiusValue());
}

export function tileLoadConcurrency() {
  return terrainTuningValue(tileLoadSlotsValueInput, DEFAULT_TILE_LOAD_CONCURRENCY);
}

export function terrainLoadConcurrency() {
  return terrainTuningValue(terrainLoadSlotsValueInput, DEFAULT_TERRAIN_LOAD_CONCURRENCY);
}

export function terrainPromotionBudgetMs() {
  return terrainTuningValue(terrainSpawnBudgetValueInput, DEFAULT_TERRAIN_PROMOTION_BUDGET_MS);
}

export function terrainPromotionsPerFrame() {
  return terrainTuningValue(terrainSpawnFrameValueInput, DEFAULT_TERRAIN_PROMOTIONS_PER_FRAME);
}

export function terrainTuningValue(input, fallback) {
  return terrainTuningControlValue(input, fallback);
}

export function readFloatControl(input, fallback) {
  return floatControlValue(input, fallback);
}

export function landMotionEnabled() {
  return landMotionInput?.checked !== false;
}

export function mobBlocksEnabled() {
  return mobBlocksInput.checked === true;
}

export function syncMobBlocksInputs(checked) {
  mobBlocksInput.checked = checked === true;
  mobBlocksPanelInput.checked = checked === true;
}

export function cosmeticBlocksMode() {
  if (!runtime.experimentalDetailsEnabled) return 'off';
  const value = cosmeticBlocksModeInput?.value;
  return value === 'baked' || value === 'split' ? value : 'off';
}

export function cosmeticBlocksBaked() {
  return cosmeticBlocksMode() === 'baked';
}

export function cosmeticBlocksSplit() {
  return cosmeticBlocksMode() === 'split';
}

export function visualDetailMode() {
  const value = visualDetailModeInput?.value;
  return value === 'basic' || value === 'structures' || value === 'all' ? value : 'all';
}

export function applySelectValue(input, value) {
  applyControlSelectValue(input, value, TRI_STATE_VALUES_BY_ID);
}

export function setRadiusControlValue(value) {
  const normalized = normalizePairedValue(radiusRangeInput, Math.round(Number(value)));
  radiusRangeInput.value = String(normalized);
  radiusInput.value = String(normalized);
  updateRadiusReadout();
  return normalized;
}

export function radiusValue() {
  return Math.max(0, numberOr(Number.parseInt(radiusInput.value, 10), 0));
}

export function updateRadiusReadout() {
  radiusDiameterEl.textContent = radiusReadout(radiusValue()).text;
}

export function waterModeValue() {
  return safeWaterMode(waterModeInput.value);
}
