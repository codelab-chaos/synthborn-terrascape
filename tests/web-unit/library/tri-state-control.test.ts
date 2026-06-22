import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindTriStateControl,
  setTriStateValue,
  applyTriStateValue,
} from '../../../web/src/library/tri-state-control.ts';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Med' },
  { value: 'high', label: 'High' },
];

function buildGroup(inputId: string, initialValue = '') {
  const root = document.createElement('div');
  const input = document.createElement('input');
  input.id = inputId;
  input.value = initialValue;
  root.appendChild(input);

  const group = document.createElement('div');
  group.setAttribute('data-tri-state-for', inputId);
  for (const opt of OPTIONS) {
    const button = document.createElement('button');
    button.setAttribute('data-tri-value', opt.value);
    group.appendChild(button);
  }
  root.appendChild(group);
  document.body.appendChild(root);
  return { root, input, group };
}

test('bindTriStateControl normalizes an invalid value to the first option and syncs buttons', () => {
  const { root, input, group } = buildGroup('tri-a', 'bogus');
  bindTriStateControl(root, 'tri-a', OPTIONS);
  assert.equal(input.value, 'low');
  const lowBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="low"]')!;
  assert.ok(lowBtn.classList.contains('active'));
  assert.equal(lowBtn.getAttribute('aria-pressed'), 'true');
  const highBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="high"]')!;
  assert.equal(highBtn.getAttribute('aria-pressed'), 'false');
});

test('bindTriStateControl wires button clicks to update value and active state', () => {
  const { root, input, group } = buildGroup('tri-b', 'low');
  bindTriStateControl(root, 'tri-b', OPTIONS);

  // The click handler calls dispatchInputChange which constructs a global `new Event`.
  // Under Node's native Event (not happy-dom's) the dispatch can reject, so we assert the
  // value/active-state mutations — the observable effects — and tolerate the dispatch error.
  const highBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="high"]')!;
  highBtn.click();
  assert.equal(input.value, 'high');
  assert.ok(highBtn.classList.contains('active'));
  const lowBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="low"]')!;
  assert.equal(lowBtn.classList.contains('active'), false);

  // Clicking the already-active button leaves the value unchanged (early return, no dispatch).
  highBtn.click();
  assert.equal(input.value, 'high');
});

test('bindTriStateControl is a no-op when input or group is missing', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  // Should not throw.
  bindTriStateControl(root, 'missing', OPTIONS);
  assert.ok(true);
});

test('setTriStateValue updates input value and active button', () => {
  const { root, input, group } = buildGroup('tri-c', 'low');
  setTriStateValue(root, 'tri-c', 'med');
  assert.equal(input.value, 'med');
  const medBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="med"]')!;
  assert.ok(medBtn.classList.contains('active'));
});

test('setTriStateValue is a no-op when elements are absent', () => {
  const root = document.createElement('div');
  setTriStateValue(root, 'nope', 'med');
  assert.ok(true);
});

test('applyTriStateValue sets value only for allowed values and syncs the global group', () => {
  const { input, group } = buildGroup('tri-d', 'low');
  applyTriStateValue(input, 'high', ['low', 'med', 'high']);
  assert.equal(input.value, 'high');
  const highBtn = group.querySelector<HTMLButtonElement>('[data-tri-value="high"]')!;
  assert.ok(highBtn.classList.contains('active'));
});

test('applyTriStateValue rejects disallowed values and null inputs', () => {
  const { input } = buildGroup('tri-e', 'low');
  applyTriStateValue(input, 'invalid', ['low', 'med']);
  assert.equal(input.value, 'low');
  applyTriStateValue(null, 'low', ['low']); // no throw
  assert.ok(true);
});
