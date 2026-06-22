import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VIEW_STATE_KEY,
  loadStoredViewState,
  saveStoredViewState,
  vectorState,
  isVectorState,
} from '../../../web/src/ui/view-state.ts';

const LEGACY_KEY = 'synthworldview.viewState.v1';

test('saveStoredViewState writes JSON and loadStoredViewState reads it back', () => {
  window.localStorage.clear();
  const state = { world: 'main', radius: 3 };
  assert.equal(saveStoredViewState(state), true);
  assert.equal(window.localStorage.getItem(VIEW_STATE_KEY), JSON.stringify(state));
  assert.deepEqual(loadStoredViewState(), state);
});

test('loadStoredViewState returns null when nothing stored', () => {
  window.localStorage.clear();
  assert.equal(loadStoredViewState(), null);
});

test('loadStoredViewState migrates the legacy key', () => {
  window.localStorage.clear();
  const legacy = JSON.stringify({ world: 'legacy' });
  window.localStorage.setItem(LEGACY_KEY, legacy);
  const result = loadStoredViewState();
  assert.deepEqual(result, { world: 'legacy' });
  // After migration the canonical key holds the value and legacy key is gone.
  assert.equal(window.localStorage.getItem(VIEW_STATE_KEY), legacy);
  assert.equal(window.localStorage.getItem(LEGACY_KEY), null);
});

test('loadStoredViewState returns null and warns on malformed JSON', () => {
  window.localStorage.clear();
  window.localStorage.setItem(VIEW_STATE_KEY, '{not json');
  assert.equal(loadStoredViewState(), null);
});

test('vectorState rounds each axis to 3 decimals', () => {
  assert.deepEqual(vectorState({ x: 1.23456, y: -2.5009, z: 3 }), {
    x: 1.235,
    y: -2.501,
    z: 3,
  });
});

test('isVectorState validates finite x/y/z', () => {
  assert.ok(isVectorState({ x: 0, y: 0, z: 0 }));
  assert.ok(!isVectorState(null));
  assert.ok(!isVectorState({ x: 1, y: 2 }));
  assert.ok(!isVectorState({ x: Number.NaN, y: 0, z: 0 }));
  assert.ok(!isVectorState({ x: Infinity, y: 0, z: 0 }));
});
