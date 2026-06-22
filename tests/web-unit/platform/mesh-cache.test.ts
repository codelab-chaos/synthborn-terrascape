import assert from 'node:assert/strict';
import test from 'node:test';

import * as meshCache from '../../../src/main/resources/web/src/platform/mesh-cache.ts';

// A minimal in-memory fake IndexedDB sufficient for mesh-cache.ts. Real browsers
// and Node lack indexedDB here, so we install a fake on window/globalThis before the
// module under test ever calls openDb(). The module caches its db promise at module
// scope, so the fake must be installed (and stable) for the whole suite.

type StoreData = Map<string, Map<string, any>>;

function makeRequest<T>(resultFactory: () => T) {
  const req: any = { onsuccess: null, onerror: null, result: undefined, error: null };
  queueMicrotask(() => {
    try {
      req.result = resultFactory();
      req.onsuccess?.({ target: req });
    } catch (err) {
      req.error = err;
      req.onerror?.({ target: req });
    }
  });
  return req;
}

function makeObjectStore(store: Map<string, any>) {
  return {
    get: (key: string) => makeRequest(() => store.get(key)),
    put: (record: any) => makeRequest(() => { store.set(record.key, record); return record.key; }),
    count: () => makeRequest(() => store.size),
    clear: () => makeRequest(() => { store.clear(); return undefined; }),
    getAll: () => makeRequest(() => [...store.values()]),
  };
}

function makeDatabase(name: string, data: StoreData) {
  const storeNames = ['terrainMeshes', 'mapTileTextures'];
  for (const s of storeNames) if (!data.has(s)) data.set(s, new Map());
  return {
    name,
    objectStoreNames: {
      contains: (s: string) => data.has(s),
    },
    createObjectStore: (s: string) => { if (!data.has(s)) data.set(s, new Map()); return makeObjectStore(data.get(s)!); },
    transaction: (storeName: string) => {
      const tx: any = { oncomplete: null, onerror: null, onabort: null, error: null };
      queueMicrotask(() => tx.oncomplete?.({ target: tx }));
      return {
        ...tx,
        objectStore: (s: string) => {
          if (!data.has(s)) data.set(s, new Map());
          return makeObjectStore(data.get(s)!);
        },
        get oncomplete() { return tx.oncomplete; },
        set oncomplete(fn: any) { tx.oncomplete = fn; },
        get onerror() { return tx.onerror; },
        set onerror(fn: any) { tx.onerror = fn; },
        get onabort() { return tx.onabort; },
        set onabort(fn: any) { tx.onabort = fn; },
      };
    },
    close: () => {},
  };
}

const databases = new Map<string, StoreData>();

const fakeIndexedDB = {
  open: (name: string, _version?: number) => {
    const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null, result: undefined, error: null };
    if (!databases.has(name)) databases.set(name, new Map());
    const data = databases.get(name)!;
    const isNew = data.size === 0;
    const db = makeDatabase(name, data);
    req.result = db;
    queueMicrotask(() => {
      if (isNew) {
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req;
  },
};

// Install the fake before importing the module under test.
(globalThis as any).indexedDB = fakeIndexedDB;
(window as any).indexedDB = fakeIndexedDB;
// Ensure migration is treated as already done to keep tests deterministic.
window.localStorage.setItem('synthborn-terrascape.cacheMigrated', '1');

test('makeTerrainCacheKey composes a stable key with defaults applied', () => {
  const key = meshCache.makeTerrainCacheKey({
    world: 'w1', chunkX: 2, chunkZ: -3, formatVersion: 'v9',
    detailsEnabled: true, cosmeticsMode: '', visualDetailMode: '',
  });
  assert.equal(key, 'v9:details:plain:basic:w1:2:-3');
});

test('makeTerrainCacheKey reflects surface mode and provided cosmetic/detail modes', () => {
  const key = meshCache.makeTerrainCacheKey({
    world: 'w2', chunkX: 0, chunkZ: 0, formatVersion: 'v1',
    detailsEnabled: false, cosmeticsMode: 'fancy', visualDetailMode: 'high',
  });
  assert.equal(key, 'v1:surface:fancy:high:w2:0:0');
});

test('makeMapTileCacheKey composes the map tile key', () => {
  const key = meshCache.makeMapTileCacheKey({ world: 'w', chunkX: 5, chunkZ: 6, formatVersion: 'v2' });
  assert.equal(key, 'v2:map:w:5:6');
});

test('writeTerrainCache rejects empty payloads and stores valid ones', async () => {
  assert.equal(await meshCache.writeTerrainCache('k0', new Uint8Array(0)), false);
  const bytes = new Uint8Array([1, 2, 3]);
  const ok = await meshCache.writeTerrainCache('terrain-key', bytes, { foo: 'bar' });
  assert.equal(ok, true);
});

test('readTerrainCache returns a fresh record and null for missing keys', async () => {
  const bytes = new Uint8Array([9, 8, 7]);
  await meshCache.writeTerrainCache('terrain-read', bytes, { meta: 1 });
  const record = await meshCache.readTerrainCache('terrain-read');
  assert.ok(record);
  assert.deepEqual([...record.bytes], [9, 8, 7]);
  assert.equal(await meshCache.readTerrainCache('no-such-key'), null);
});

test('readTerrainCache treats stale records as a miss', async () => {
  // Directly inject a stale record into the fake store.
  const data = databases.get('synthborn-terrascape-cache')!;
  data.get('terrainMeshes')!.set('stale', {
    key: 'stale', bytes: new Uint8Array([1]), meta: {},
    updatedAt: Date.now() - (8 * 24 * 60 * 60 * 1000),
  });
  assert.equal(await meshCache.readTerrainCache('stale'), null);
});

test('writeMapTileCache enqueues and drains writes to the store', async () => {
  assert.equal(await meshCache.writeMapTileCache('mt0', new Uint8Array(0)), false);
  const queued = await meshCache.writeMapTileCache('map-key', new Uint8Array([4, 5, 6]), { z: 1 });
  assert.equal(queued, true);
  // Allow the async drain worker to flush the queue.
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 5));
  const record = await meshCache.readMapTileCache('map-key');
  assert.ok(record);
  assert.deepEqual([...record.bytes], [4, 5, 6]);
});

test('readMapTileCache returns null for unknown keys', async () => {
  assert.equal(await meshCache.readMapTileCache('absent'), null);
});

test('getMeshCacheStats reports counts across both stores', async () => {
  const stats = await meshCache.getMeshCacheStats();
  assert.ok(Number.isFinite(stats.terrain));
  assert.ok(Number.isFinite(stats.mapTiles));
  assert.equal(stats.total, stats.terrain + stats.mapTiles);
  assert.ok(stats.total >= 2); // we wrote at least one terrain and one map tile record
});

test('clearMeshCache empties both stores and returns the cleared counts', async () => {
  await meshCache.writeTerrainCache('clear-me', new Uint8Array([1]));
  const before = await meshCache.getMeshCacheStats();
  assert.ok(before.total > 0);
  const result = await meshCache.clearMeshCache();
  assert.equal(result.total, result.terrain + result.mapTiles);
  const after = await meshCache.getMeshCacheStats();
  assert.equal(after.total, 0);
});
