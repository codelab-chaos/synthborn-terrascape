import assert from 'node:assert/strict';
import test from 'node:test';

import { loadWorlds } from '../../../web/src/ui/world-selector.ts';
import { runtime } from '../../../web/src/scene/scene-context.ts';
import { worldSelect, statusEl } from '../../../web/src/ui/dom.ts';

function stubFetch(payload: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    status: 200,
    ok: true,
    json: async () => payload,
  })) as any;
  return () => { globalThis.fetch = original; };
}

test('loadWorlds populates the world select, applies features, and reports Ready', async () => {
  runtime.storedViewState = null;
  const restore = stubFetch({
    features: { experimentalDetails: true, terrainFormatVersion: 'v9' },
    clientControls: undefined,
    worlds: [{ name: 'alpha' }, { name: 'beta' }],
  });
  try {
    await loadWorlds();
    const values = Array.from(worldSelect.options).map((o) => o.value);
    assert.deepEqual(values, ['alpha', 'beta']);
    assert.equal(runtime.experimentalDetailsEnabled, true);
    assert.equal(runtime.terrainFormatVersion, 'v9');
    assert.equal(worldSelect.value, 'alpha');
    assert.equal(statusEl.textContent, 'Ready');
  } finally {
    restore();
  }
});

test('loadWorlds reports "No worlds found" for an empty list', async () => {
  runtime.storedViewState = null;
  const restore = stubFetch({ worlds: [] });
  try {
    await loadWorlds();
    assert.equal(worldSelect.options.length, 0);
    assert.equal(statusEl.textContent, 'No worlds found');
  } finally {
    restore();
  }
});
