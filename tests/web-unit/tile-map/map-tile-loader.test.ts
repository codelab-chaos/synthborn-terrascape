import assert from 'node:assert/strict';
import test from 'node:test';

import { loadMapTilePng } from '../../../web/src/tile-map/map-tile-loader.ts';

function makeResponse({ ok = true, status = 200, bytes = new ArrayBuffer(16), cacheHeader = null } = {}) {
  return {
    ok,
    status,
    headers: {
      get(name: string) {
        if (name === 'X-Terrascape-Cache') return cacheHeader;
        return null;
      },
    },
    arrayBuffer: async () => bytes,
  };
}

test('loadMapTilePng requests the correct url and returns bytes plus cache source', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const bytes = new ArrayBuffer(42);
  try {
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url));
      return makeResponse({ bytes, cacheHeader: 'disk' });
    }) as typeof fetch;

    const result = await loadMapTilePng('my world', 3, -7);
    assert.equal(result.bytes, bytes);
    assert.equal(result.source, 'disk');
    assert.equal(calls.length, 1);
    assert.equal(calls[0], '/api/terrain/my%20world/3/-7.map.png');
  } finally {
    globalThis.fetch = original;
  }
});

test('loadMapTilePng falls back to "other" when cache header missing', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => makeResponse({ cacheHeader: null })) as unknown as typeof fetch;
    const result = await loadMapTilePng('default', 0, 0);
    assert.equal(result.source, 'other');
  } finally {
    globalThis.fetch = original;
  }
});

test('loadMapTilePng throws on non-ok response', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => makeResponse({ ok: false, status: 503 })) as unknown as typeof fetch;
    await assert.rejects(
      () => loadMapTilePng('default', 1, 1),
      /Map tile request failed: 503/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
