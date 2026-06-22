import assert from 'node:assert/strict';
import test from 'node:test';

import { updateChunkPlaceholders } from '../../../web/src/terrain/chunk-placeholder-sync.ts';
import {
  chunkPlaceholderManager,
  loadedChunks,
  runtime,
} from '../../../web/src/scene/scene-context.ts';
import { autoStreamInput, radiusInput, worldSelect } from '../../../web/src/ui/dom.ts';

// happy-dom's <select> only accepts values backed by an <option>.
function ensureWorldOption() {
  if (!worldSelect.querySelector('option[value=""]')) {
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '';
    worldSelect.appendChild(blank);
  }
  if (!worldSelect.querySelector('option[value="default"]')) {
    const opt = document.createElement('option');
    opt.value = 'default';
    opt.textContent = 'default';
    worldSelect.appendChild(opt);
  }
}

function clearPlaceholders() {
  ensureWorldOption();
  // Drain any leftover placeholders by finishing their fade cycles, then reset state.
  chunkPlaceholderManager.update(10);
  loadedChunks.clear();
}

test('updateChunkPlaceholders bails out when no world is selected', () => {
  clearPlaceholders();
  worldSelect.value = '';
  runtime.hasFocusedInitialGrid = true;
  const before = chunkPlaceholderManager.count();
  updateChunkPlaceholders();
  assert.equal(chunkPlaceholderManager.count(), before);
});

test('updateChunkPlaceholders bails out before the initial grid is focused', () => {
  clearPlaceholders();
  worldSelect.value = 'default';
  runtime.hasFocusedInitialGrid = false;
  updateChunkPlaceholders();
  assert.equal(chunkPlaceholderManager.count(), 0);
});

test('updateChunkPlaceholders clears placeholders when nothing should be shown', () => {
  clearPlaceholders();
  worldSelect.value = 'default';
  runtime.hasFocusedInitialGrid = true;
  autoStreamInput.checked = false;
  runtime.requestedCenterId = null;
  runtime.activeCenterId = null;

  // Seed a placeholder so we can observe it being cleared.
  chunkPlaceholderManager.sync('default', [{ chunkX: 50, chunkZ: 50, id: 'default:50:50' }], new Set());
  assert.ok(chunkPlaceholderManager.count() >= 1);

  updateChunkPlaceholders();
  // shouldShow=false -> sync with empty keys -> waiting placeholders disposed.
  assert.equal(chunkPlaceholderManager.waitingCount(), 0);
});

test('updateChunkPlaceholders shows placeholders around the player when auto-stream is on', () => {
  clearPlaceholders();
  worldSelect.value = 'default';
  runtime.hasFocusedInitialGrid = true;
  runtime.requestedCenterId = null;
  runtime.activeCenterId = null;
  autoStreamInput.checked = true;
  radiusInput.value = '1';

  updateChunkPlaceholders();
  // radius 1 -> 3x3 grid of placeholders (none loaded).
  assert.equal(chunkPlaceholderManager.count(), 9);

  clearPlaceholders();
  autoStreamInput.checked = false;
});

test('updateChunkPlaceholders shows placeholders when a center load is requested', () => {
  clearPlaceholders();
  worldSelect.value = 'default';
  runtime.hasFocusedInitialGrid = true;
  autoStreamInput.checked = false;
  runtime.requestedCenterId = 'default:0:0';
  radiusInput.value = '0';

  updateChunkPlaceholders();
  // requestedCenterId != null -> shouldShow true; radius 0 -> 1 placeholder.
  assert.equal(chunkPlaceholderManager.count(), 1);

  clearPlaceholders();
  runtime.requestedCenterId = null;
});
