import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COSMETIC_MODE_VALUES,
  VISUAL_DETAIL_VALUES,
  TRI_STATE_VALUES_BY_ID,
  AUTO_STREAM_RETAIN_MARGIN,
  mapTileRadius,
  tileLoadConcurrency,
  terrainLoadConcurrency,
  terrainPromotionBudgetMs,
  terrainPromotionsPerFrame,
  terrainTuningValue,
  readFloatControl,
  landMotionEnabled,
  mobBlocksEnabled,
  syncMobBlocksInputs,
  cosmeticBlocksMode,
  cosmeticBlocksBaked,
  cosmeticBlocksSplit,
  visualDetailMode,
  applySelectValue,
  setRadiusControlValue,
  radiusValue,
  updateRadiusReadout,
  waterModeValue,
} from '../../../src/main/resources/web/src/ui/control-readers.ts';
import { runtime } from '../../../src/main/resources/web/src/scene/scene-context.ts';
import {
  cosmeticBlocksModeInput,
  landMotionInput,
  mobBlocksInput,
  mobBlocksPanelInput,
  radiusDiameterEl,
  radiusInput,
  radiusRangeInput,
  terrainLoadSlotsValueInput,
  visualDetailModeInput,
  waterModeInput,
} from '../../../src/main/resources/web/src/ui/dom.ts';

test('constant tables describe the tri-state controls', () => {
  assert.deepEqual(COSMETIC_MODE_VALUES, ['off', 'baked', 'split']);
  assert.deepEqual(VISUAL_DETAIL_VALUES, ['basic', 'structures', 'all']);
  assert.equal(TRI_STATE_VALUES_BY_ID['cosmetic-blocks-mode'], COSMETIC_MODE_VALUES);
  assert.equal(TRI_STATE_VALUES_BY_ID['visual-detail-mode'], VISUAL_DETAIL_VALUES);
  assert.equal(AUTO_STREAM_RETAIN_MARGIN, 1);
});

test('terrainTuningValue parses the input or falls back, clamping to min/max', () => {
  terrainLoadSlotsValueInput.value = '7';
  terrainLoadSlotsValueInput.min = '';
  terrainLoadSlotsValueInput.max = '';
  assert.equal(terrainTuningValue(terrainLoadSlotsValueInput, 4), 7);
  terrainLoadSlotsValueInput.value = '';
  assert.equal(terrainTuningValue(terrainLoadSlotsValueInput, 4), 4);
  // Clamp above max.
  terrainLoadSlotsValueInput.value = '99';
  terrainLoadSlotsValueInput.min = '1';
  terrainLoadSlotsValueInput.max = '8';
  assert.equal(terrainTuningValue(terrainLoadSlotsValueInput, 4), 8);
});

test('terrain tuning readers default when their inputs are blank', () => {
  // Blank value/min/max => fallback. (terrainLoadSlotsValueInput is shared, so clear it.)
  terrainLoadSlotsValueInput.value = '';
  terrainLoadSlotsValueInput.min = '';
  terrainLoadSlotsValueInput.max = '';
  assert.equal(terrainLoadConcurrency(), 4);
  assert.equal(tileLoadConcurrency(), 4);
  assert.equal(terrainPromotionBudgetMs(), 4);
  assert.equal(terrainPromotionsPerFrame(), 2);
});

test('mapTileRadius is never smaller than the stream radius', () => {
  setRadiusControlValue(20);
  // mapTileRadiusValueInput is blank => default 16, but radius is 20.
  assert.equal(mapTileRadius(), 20);
});

test('readFloatControl parses floats and falls back', () => {
  const input: any = { value: '0.42' };
  assert.equal(readFloatControl(input, 1), 0.42);
  assert.equal(readFloatControl({ value: '' }, 0.9), 0.9);
});

test('landMotionEnabled is true unless explicitly unchecked', () => {
  landMotionInput.checked = true;
  assert.equal(landMotionEnabled(), true);
  landMotionInput.checked = false;
  assert.equal(landMotionEnabled(), false);
});

test('syncMobBlocksInputs mirrors both inputs and mobBlocksEnabled reads them', () => {
  syncMobBlocksInputs(true);
  assert.equal(mobBlocksInput.checked, true);
  assert.equal(mobBlocksPanelInput.checked, true);
  assert.equal(mobBlocksEnabled(), true);
  syncMobBlocksInputs(false);
  assert.equal(mobBlocksInput.checked, false);
  assert.equal(mobBlocksEnabled(), false);
});

test('cosmeticBlocksMode returns off unless experimental details are enabled', () => {
  runtime.experimentalDetailsEnabled = false;
  cosmeticBlocksModeInput.value = 'split';
  assert.equal(cosmeticBlocksMode(), 'off');

  runtime.experimentalDetailsEnabled = true;
  cosmeticBlocksModeInput.value = 'baked';
  assert.equal(cosmeticBlocksMode(), 'baked');
  assert.equal(cosmeticBlocksBaked(), true);
  assert.equal(cosmeticBlocksSplit(), false);

  cosmeticBlocksModeInput.value = 'split';
  assert.equal(cosmeticBlocksSplit(), true);

  cosmeticBlocksModeInput.value = 'bogus';
  assert.equal(cosmeticBlocksMode(), 'off');
  runtime.experimentalDetailsEnabled = false;
});

test('visualDetailMode validates the select value with an all fallback', () => {
  visualDetailModeInput.value = 'structures';
  assert.equal(visualDetailMode(), 'structures');
  visualDetailModeInput.value = 'nope';
  assert.equal(visualDetailMode(), 'all');
});

test('applySelectValue applies an allowed tri-state value', () => {
  applySelectValue(cosmeticBlocksModeInput, 'baked');
  assert.equal(cosmeticBlocksModeInput.value, 'baked');
});

test('setRadiusControlValue / radiusValue / updateRadiusReadout stay in sync', () => {
  radiusRangeInput.min = '0';
  radiusRangeInput.max = '32';
  const normalized = setRadiusControlValue(5);
  assert.equal(radiusInput.value, String(normalized));
  assert.equal(radiusValue(), Number(normalized));
  updateRadiusReadout();
  assert.match(radiusDiameterEl.textContent ?? '', /chunks/);
});

test('waterModeValue normalises arbitrary input', () => {
  waterModeInput.value = 'transparent';
  assert.equal(waterModeValue(), 'transparent');
  waterModeInput.value = 'garbage';
  assert.equal(waterModeValue(), 'solid');
});
