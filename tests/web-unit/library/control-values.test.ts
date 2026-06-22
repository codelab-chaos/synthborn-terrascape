import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyBooleanParam,
  applyFloatParam,
  applyNumberParam,
  applySelectValue,
  isTruthyParam,
  normalizePairedValue,
  setNumberInput,
  setPairedControlValue,
} from '../../../web/src/library/control-values.ts';

// The control helpers only read/write plain properties, so duck-typed objects stand in for the
// real DOM input elements. (The addEventListener-based bind* helpers are DOM-bound → runtime tier.)
const input = (props = {}): any => ({ value: '', checked: false, ...props });

test('isTruthyParam recognises common truthy spellings', () => {
  for (const v of ['1', 'true', 'YES', 'On']) assert.equal(isTruthyParam(v), true);
  for (const v of ['0', 'false', 'no', 'off', '']) assert.equal(isTruthyParam(v), false);
});

test('applyNumberParam parses integers and ignores junk', () => {
  const el = input();
  assert.equal(applyNumberParam(new URLSearchParams('radius=8'), 'radius', el), 8);
  assert.equal(el.value, '8');
  assert.equal(applyNumberParam(new URLSearchParams('radius=nope'), 'radius', el), null);
  assert.equal(applyNumberParam(new URLSearchParams(''), 'radius', el), null);
  assert.equal(applyNumberParam(new URLSearchParams('radius=  '), 'radius', el), null);
});

test('applyBooleanParam sets checked only when present', () => {
  const el = input();
  assert.equal(applyBooleanParam(new URLSearchParams('players=1'), 'players', el), true);
  assert.equal(el.checked, true);
  assert.equal(applyBooleanParam(new URLSearchParams('players=off'), 'players', el), true);
  assert.equal(el.checked, false);
  assert.equal(applyBooleanParam(new URLSearchParams(''), 'players', el), false);
});

test('applyFloatParam writes to every target input', () => {
  const a = input();
  const b = input();
  assert.equal(applyFloatParam(new URLSearchParams('fog=0.5'), 'fog', a, b), 0.5);
  assert.equal(a.value, '0.5');
  assert.equal(b.value, '0.5');
  assert.equal(applyFloatParam(new URLSearchParams('fog=NaN'), 'fog', a), null);
});

test('setNumberInput only writes finite values', () => {
  const el = input();
  assert.equal(setNumberInput(el, 12), true);
  assert.equal(el.value, '12');
  assert.equal(setNumberInput(el, Number.NaN), false);
});

test('normalizePairedValue clamps to range and snaps to step', () => {
  const el = input({ min: '0', max: '10', step: '1' });
  assert.equal(normalizePairedValue(el, 7.3), 7);
  assert.equal(normalizePairedValue(el, 99), 10);
  assert.equal(normalizePairedValue(el, -5), 0);
});

test('normalizePairedValue falls back to current value when given junk', () => {
  const el = input({ min: '0', max: '10', step: '1', value: '4' });
  assert.equal(normalizePairedValue(el, Number.NaN), 4);
});

test('normalizePairedValue snaps fractional steps', () => {
  const el = input({ min: '0.5', max: '2.2', step: '0.05' });
  assert.equal(normalizePairedValue(el, 2.8), 2.2);
  assert.equal(normalizePairedValue(el, 1.07), 1.05);
});

test('setPairedControlValue mirrors the normalized value to both inputs', () => {
  const range = input({ min: '0', max: '10', step: '1' });
  const number = input();
  assert.equal(setPairedControlValue(range, number, 7.3), 7);
  assert.equal(range.value, '7');
  assert.equal(number.value, '7');
  assert.equal(setPairedControlValue(range, number, Number.NaN), null);
});

test('applySelectValue handles selects, plain inputs, and null', () => {
  const select: any = { id: 's', tagName: 'SELECT', value: '', options: [{ value: 'a' }, { value: 'b' }] };
  assert.equal(applySelectValue(select, 'b'), true);
  assert.equal(select.value, 'b');
  assert.equal(applySelectValue(select, 'missing'), false);

  const text: any = { id: 't', tagName: 'INPUT', value: '' };
  assert.equal(applySelectValue(text, 'hello'), true);
  assert.equal(text.value, 'hello');

  assert.equal(applySelectValue(null, 'x'), false);
});
