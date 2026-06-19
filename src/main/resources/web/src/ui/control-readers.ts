import { numberOr } from '../common/utils.ts';
import { MAP_HORIZON_MARGIN } from '../tile-map/map-backdrop.ts';
import {
  floatControlValue,
  mapTileRetainRadiusFor,
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

export function mapTileRetainRadius(terrainRadius, streamLoad = false) {
  return mapTileRetainRadiusFor(terrainRadius, streamLoad, MAP_HORIZON_MARGIN, AUTO_STREAM_RETAIN_MARGIN);
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
  radiusRangeInput.value = normalized;
  radiusInput.value = normalized;
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
