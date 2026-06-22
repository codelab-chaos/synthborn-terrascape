import assert from 'node:assert/strict';
import test from 'node:test';

import { createTimeRibbon } from '../../../web/src/ui/time-ribbon.ts';

function makeRibbon() {
  const labelEl: any = { value: '' };
  const sceneEl: any = { style: {} };
  const sunEl: any = { style: {} };
  const moonEl: any = { style: {} };
  const starsEl: any = { style: {} };
  const ribbon = createTimeRibbon({ labelEl, sceneEl, sunEl, moonEl, starsEl });
  return { ribbon, labelEl, sceneEl, sunEl, moonEl, starsEl };
}

test('update with no world time shows placeholder and renders midday sky', () => {
  const { ribbon, labelEl, sceneEl } = makeRibbon();
  ribbon.update(null);
  assert.equal(labelEl.value, '--:--');
  assert.match(sceneEl.style.background, /^linear-gradient\(180deg, rgb\(/);
});

test('update renders clock label, phase, and sky gradient from day progress', () => {
  const { ribbon, labelEl, sceneEl, sunEl, moonEl, starsEl } = makeRibbon();
  // 0.5 day progress => noon (12:00).
  ribbon.update({ dayProgress: 0.5, phase: 'high_noon' });
  assert.equal(labelEl.value, '12:00 high noon');
  assert.match(sceneEl.style.background, /linear-gradient/);
  assert.match(sunEl.style.left, /%$/);
  assert.match(moonEl.style.top, /%$/);
  // At noon the day factor is 1 so stars opacity is 0.
  assert.equal(starsEl.style.opacity, '0.000');
});

test('update wraps out-of-range progress and defaults phase to "cycle"', () => {
  const { ribbon, labelEl } = makeRibbon();
  // 1.25 wraps to 0.25 (06:00), empty phase => "cycle".
  ribbon.update({ dayProgress: 1.25, phase: '' });
  assert.equal(labelEl.value, '06:00 cycle');
});

test('update handles a non-finite progress as 0 (midnight) and bright stars', () => {
  const { ribbon, labelEl, starsEl } = makeRibbon();
  ribbon.update({ dayProgress: Number.NaN, phase: 'night' });
  assert.equal(labelEl.value, '00:00 night');
  assert.equal(starsEl.style.opacity, '1.000');
});
