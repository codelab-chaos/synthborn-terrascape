import assert from 'node:assert/strict';
import test from 'node:test';

import {
  floatControlValue,
  fogRangeFromControls,
  radiusReadout,
  safeWaterMode,
  terrainTuningControlValue,
} from '../../../web/src/common/view-preferences.ts';

test('normalizes view preference controls', () => {
  assert.equal(terrainTuningControlValue({ value: '99', min: '1', max: '12' }, 4), 12);
  assert.equal(terrainTuningControlValue({ value: 'nope', min: '1', max: '12' }, 4), 4);
  assert.equal(floatControlValue({ value: '2.8', min: '0', max: '1.5' }, 0.5), 1.5);
  assert.deepEqual(fogRangeFromControls({ value: '700', min: '40', max: '1200' }, { value: '200', min: '120', max: '2600' }), {
    near: 700,
    far: 701,
  });
  assert.equal(safeWaterMode('shader'), 'solid');
  assert.equal(safeWaterMode('transparent'), 'transparent');
  assert.deepEqual(radiusReadout(3), {
    radius: 3,
    diameter: 7,
    chunks: 49,
    text: '7 x 7 chunks, 49 meshes',
  });
});
