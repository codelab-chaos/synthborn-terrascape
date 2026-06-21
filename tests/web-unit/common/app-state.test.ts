import assert from 'node:assert/strict';
import test from 'node:test';

import { AppRuntimeState } from '../../../src/main/resources/web/src/common/app-state.ts';

test('initializes app runtime state in one owned object', () => {
  const storedViewState = { world: 'default', radius: 3 };
  const state = new AppRuntimeState(storedViewState);
  assert.equal(state.storedViewState, storedViewState);
  assert.equal(state.loadGeneration, 0);
  assert.equal(state.terrainFormatVersion, 'unknown');
  assert.equal(state.hasStarted, false);
  assert.equal(state.viewPlayerUuid, null);
  assert.equal(state.lastPlayerCount, 0);
  assert.equal(state.entityStreamConnected, false);
});
