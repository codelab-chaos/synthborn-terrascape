import assert from 'node:assert/strict';
import test from 'node:test';

import { applyServerControls } from '../../../web/src/ui/server-controls.ts';
import {
  autoStreamInput,
  mapTilesInput,
  mobUpdateRateInput,
  playerUpdateRateInput,
  radiusInput,
  showMobsInput,
  showPlayersInput,
  terrainLoadSlotsInput,
  terrainLoadSlotsValueInput,
} from '../../../web/src/ui/dom.ts';

test('applyServerControls is a no-op for undefined controls', () => {
  assert.doesNotThrow(() => applyServerControls(undefined));
});

test('applyToggle forces disabled toggles off and greys them out', () => {
  showMobsInput.checked = true;
  showMobsInput.disabled = false;
  showPlayersInput.checked = true;
  mapTilesInput.checked = true;
  autoStreamInput.checked = true;

  applyServerControls({
    showMobs: false, // disabled => unchecked + disabled
    showPlayers: true, // enabled => left checked, not disabled
    mapTiles: false,
    autoStream: true,
  });

  assert.equal(showMobsInput.checked, false);
  assert.equal(showMobsInput.disabled, true);
  assert.equal(showPlayersInput.disabled, false);
  assert.equal(showPlayersInput.checked, true);
  assert.equal(mapTilesInput.disabled, true);
  assert.equal(autoStreamInput.disabled, false);
});

test('applyRateSelect rebuilds a per-second dropdown from server options', () => {
  applyServerControls({
    mobUpdateRate: { options: [1, 2, 4], default: 2 },
  });
  // The scaffold backs these rate controls with <input> stand-ins, so inspect the appended
  // <option> children directly rather than the <select>-only .options collection.
  const options = Array.from(mobUpdateRateInput.querySelectorAll('option'));
  // Stored as ms: 1/sec=1000, 2/sec=500, 4/sec=250.
  assert.deepEqual(options.map((o) => o.value), ['1000', '500', '250']);
  assert.deepEqual(options.map((o) => o.textContent), ['1/sec', '2/sec', '4/sec']);
});

test('applyRateSelect disables the select when spec.enabled is false', () => {
  playerUpdateRateInput.disabled = false;
  applyServerControls({
    playerUpdateRate: { options: [1, 2], enabled: false },
  });
  assert.equal(playerUpdateRateInput.disabled, true);
});

test('applyRangeControl clamps the current value into the configured bounds', () => {
  terrainLoadSlotsValueInput.value = '99';
  applyServerControls({
    chunksLoadedAtOnce: { min: 1, max: 8, default: 4 },
  });
  assert.equal(terrainLoadSlotsValueInput.min, '1');
  assert.equal(terrainLoadSlotsValueInput.max, '8');
  assert.equal(terrainLoadSlotsValueInput.value, '8');
  assert.equal(terrainLoadSlotsInput.value, '8');
});

test('applyRangeControl disabled snaps to the default and greys out', () => {
  applyServerControls({
    chunksLoadedAtOnce: { min: 1, max: 8, default: 5, enabled: false },
  });
  assert.equal(terrainLoadSlotsValueInput.value, '5');
  assert.equal(terrainLoadSlotsValueInput.disabled, true);
});

test('applyRadius uses the canonical radius setter with clamped bounds', () => {
  radiusInput.min = '';
  radiusInput.max = '';
  applyServerControls({
    streamRadius: { min: 0, max: 12, default: 6 },
  });
  assert.equal(radiusInput.min, '0');
  assert.equal(radiusInput.max, '12');
  const value = Number(radiusInput.value);
  assert.ok(value >= 0 && value <= 12);
});
