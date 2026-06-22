import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchArrayBufferWithRetry,
  loadTerrainChunkData,
  parseGltfBytes,
  readCosmeticOverlayBytes,
  terrainCacheKey,
  terrainCosmeticOverlayCacheKey,
  terrainCosmeticOverlayUrl,
  terrainUrl,
  writeCosmeticOverlayCache,
  writeTerrainChunkCache,
} from '../../../web/src/terrain/terrain-source.ts';
import { runtime } from '../../../web/src/scene/scene-context.ts';
import {
  cosmeticBlocksModeInput,
  visualDetailModeInput,
} from '../../../web/src/ui/dom.ts';

function withFetch(stub: typeof fetch, fn: () => Promise<void> | void) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.fetch = original;
    });
}

test('terrainUrl builds a plain url when cosmetics are off', () => {
  runtime.experimentalDetailsEnabled = false;
  const url = terrainUrl('my world', 3, -2);
  assert.equal(url, '/api/terrain/my%20world/3/-2.glb');
});

test('terrainUrl appends cosmetic params when baked mode is active', () => {
  runtime.experimentalDetailsEnabled = true;
  cosmeticBlocksModeInput.value = 'baked';
  visualDetailModeInput.value = 'all';
  const url = terrainUrl('w', 1, 1);
  assert.equal(url, '/api/terrain/w/1/1.glb?cosmetics=1&visualDetail=all');
  // reset for other tests
  runtime.experimentalDetailsEnabled = false;
  cosmeticBlocksModeInput.value = 'off';
});

test('terrainCacheKey encodes runtime + control state', () => {
  runtime.terrainFormatVersion = 'v9';
  runtime.experimentalDetailsEnabled = false;
  const key = terrainCacheKey('default', 5, 6);
  // formatVersion:details/surface:cosmetics:visualDetail:world:x:z
  assert.match(key, /^v9:surface:.*:default:5:6$/);
});

test('terrainCosmeticOverlayUrl and cache key are derived from world coords', () => {
  visualDetailModeInput.value = 'structures';
  const url = terrainCosmeticOverlayUrl('w', 2, 4);
  assert.equal(url, '/api/terrain/w/2/4.glb?cosmetics=only&visualDetail=structures');

  runtime.terrainFormatVersion = 'v3';
  const key = terrainCosmeticOverlayCacheKey('w', 2, 4);
  assert.match(key, /split-overlay/);
  assert.match(key, /:w:2:4$/);
});

test('fetchArrayBufferWithRetry returns the body on a successful response', async () => {
  const buf = new ArrayBuffer(16);
  await withFetch((async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => buf,
  })) as unknown as typeof fetch, async () => {
    const result = await fetchArrayBufferWithRetry('/api/terrain/w/0/0.glb');
    assert.equal(result.byteLength, 16);
  });
});

test('fetchArrayBufferWithRetry retries then throws after repeated failures', async () => {
  let calls = 0;
  await withFetch((async () => {
    calls += 1;
    return { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) };
  }) as unknown as typeof fetch, async () => {
    await assert.rejects(
      () => fetchArrayBufferWithRetry('/api/terrain/w/0/0.glb'),
      /Terrain request failed: 503/,
    );
  });
  assert.equal(calls, 3);
});

test('fetchArrayBufferWithRetry recovers on a later attempt', async () => {
  let calls = 0;
  const buf = new ArrayBuffer(4);
  await withFetch((async () => {
    calls += 1;
    if (calls < 2) throw new Error('network down');
    return { ok: true, status: 200, arrayBuffer: async () => buf };
  }) as unknown as typeof fetch, async () => {
    const result = await fetchArrayBufferWithRetry('/api/terrain/w/0/0.glb');
    assert.equal(result.byteLength, 4);
  });
  assert.equal(calls, 2);
});

test('loadTerrainChunkData reports stale when the load generation moved on', async () => {
  runtime.loadGeneration = 7;
  // generation arg (5) differs from runtime.loadGeneration (7) -> stale.
  const result = await loadTerrainChunkData('default', { chunkX: 0, chunkZ: 0 }, 5);
  assert.equal(result.ok, false);
  assert.equal(result.stale, true);
  assert.equal(result.network, false);
});

test('parseGltfBytes rejects on invalid bytes', async () => {
  // Not a valid GLB/GLTF buffer; the underlying loader should reject.
  await assert.rejects(() => parseGltfBytes(new ArrayBuffer(8)));
});

test('readCosmeticOverlayBytes falls back to network when nothing is cached', async () => {
  // IndexedDB is unavailable in the harness, so the cache read returns null and
  // the function fetches over the network.
  const buf = new ArrayBuffer(12);
  await withFetch((async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => buf,
  })) as unknown as typeof fetch, async () => {
    const result = await readCosmeticOverlayBytes('default', 1, 1);
    assert.equal(result.cached, false);
    assert.equal(result.bytes.byteLength, 12);
    assert.ok(typeof result.cacheKey === 'string');
  });
});

test('writeTerrainChunkCache and writeCosmeticOverlayCache resolve without throwing', async () => {
  // Cache writes are best-effort; with no IndexedDB they resolve to false.
  const bytes = new ArrayBuffer(8);
  const a = await writeTerrainChunkCache('default', 0, 0, bytes, { source: 'test' });
  assert.equal(typeof a, 'boolean');

  const b = await writeCosmeticOverlayCache('cache-key', bytes);
  assert.equal(typeof b, 'boolean');
});
