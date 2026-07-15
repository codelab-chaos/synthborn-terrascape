const DB_NAME = 'synthborn-terrascape-cache';
const LEGACY_DB_NAME = 'synthworldview-cache';
const CACHE_MIGRATION_KEY = 'synthborn-terrascape.cacheMigrated';
const DB_VERSION = 2;
const TERRAIN_STORE = 'terrainMeshes';
const MAP_TILE_STORE = 'mapTileTextures';
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CacheRecord = {
  key: string;
  bytes: ArrayBuffer;
  meta?: Record<string, unknown>;
  updatedAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;
type QueuedTerrainWrite = {
  record: CacheRecord;
  settle: Array<(written: boolean) => void>;
};
const terrainWriteQueue = new Map<string, QueuedTerrainWrite>();
let terrainWriteWorker: Promise<unknown> | null = null;
const mapTileWriteQueue = new Map<string, CacheRecord>();
let mapTileWriteWorker: Promise<unknown> | null = null;

export function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled, cosmeticsMode, visualDetailMode }) {
  const details = detailsEnabled ? 'details' : 'surface';
  const cosmetics = cosmeticsMode || 'plain';
  const visualDetail = visualDetailMode || 'basic';
  return `${formatVersion}:${details}:${cosmetics}:${visualDetail}:${world}:${chunkX}:${chunkZ}`;
}

export async function readTerrainCache(key) {
  try {
    const db = await openDb();
    const record = await requestPromise<CacheRecord | undefined>(db.transaction(TERRAIN_STORE, 'readonly').objectStore(TERRAIN_STORE).get(key));
    if (!record?.bytes || Date.now() - record.updatedAt > MAX_RECORD_AGE_MS) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/**
 * Reads every requested terrain record through one IndexedDB transaction.
 * All get requests are queued before we await any of them, so cache I/O is not
 * artificially limited by terrain network concurrency.
 */
export async function readTerrainCaches(keys: string[]) {
  const records = new Map<string, CacheRecord>();
  if (keys.length === 0) return records;

  try {
    const db = await openDb();
    const store = db.transaction(TERRAIN_STORE, 'readonly').objectStore(TERRAIN_STORE);
    const requested = keys.map((key) => requestPromise<CacheRecord | undefined>(store.get(key)));
    const results = await Promise.all(requested);
    const now = Date.now();
    for (const record of results) {
      if (record?.bytes && now - record.updatedAt <= MAX_RECORD_AGE_MS) {
        records.set(record.key, record);
      }
    }
  } catch {
    // Cache access is best-effort. An empty batch naturally falls through to
    // network loading in the terrain stream.
  }
  return records;
}

export function makeMapTileCacheKey({ world, chunkX, chunkZ, formatVersion }) {
  return `${formatVersion}:map:${world}:${chunkX}:${chunkZ}`;
}

export async function readMapTileCache(key) {
  try {
    const db = await openDb();
    const record = await requestPromise<CacheRecord | undefined>(db.transaction(MAP_TILE_STORE, 'readonly').objectStore(MAP_TILE_STORE).get(key));
    if (!record?.bytes || Date.now() - record.updatedAt > MAX_RECORD_AGE_MS) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export async function writeMapTileCache(key, bytes, meta = {}) {
  if (!bytes?.byteLength) return false;
  mapTileWriteQueue.set(key, { key, bytes, meta, updatedAt: Date.now() });
  if (!mapTileWriteWorker) {
    mapTileWriteWorker = drainMapTileWriteQueue().finally(() => {
      mapTileWriteWorker = null;
      if (mapTileWriteQueue.size > 0) {
        mapTileWriteWorker = drainMapTileWriteQueue().finally(() => {
          mapTileWriteWorker = null;
        });
      }
    });
  }
  return true;
}

async function drainMapTileWriteQueue() {
  try {
    const db = await openDb();
    while (mapTileWriteQueue.size > 0) {
      const records = [...mapTileWriteQueue.values()].slice(0, 64);
      for (const record of records) {
        mapTileWriteQueue.delete(record.key);
      }
      const transaction = db.transaction(MAP_TILE_STORE, 'readwrite');
      const store = transaction.objectStore(MAP_TILE_STORE);
      for (const record of records) {
        store.put(record);
      }
      await transactionPromise(transaction);
    }
  } catch {
    return false;
  }
}

export function writeTerrainCache(key, bytes, meta = {}) {
  if (!bytes?.byteLength) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const existing = terrainWriteQueue.get(key);
    const queued: QueuedTerrainWrite = {
      record: { key, bytes, meta, updatedAt: Date.now() },
      settle: existing ? [...existing.settle, resolve] : [resolve],
    };
    terrainWriteQueue.set(key, queued);
    startTerrainWriteWorker();
  });
}

function startTerrainWriteWorker() {
  if (terrainWriteWorker) return;
  // Let writes queued in the same turn coalesce before opening the transaction.
  terrainWriteWorker = Promise.resolve().then(drainTerrainWriteQueue).finally(() => {
    terrainWriteWorker = null;
    if (terrainWriteQueue.size > 0) startTerrainWriteWorker();
  });
}

async function drainTerrainWriteQueue() {
  while (terrainWriteQueue.size > 0) {
    const queued = [...terrainWriteQueue.entries()].slice(0, 64);
    for (const [key, item] of queued) {
      if (terrainWriteQueue.get(key) === item) terrainWriteQueue.delete(key);
    }
    try {
      const db = await openDb();
      const transaction = db.transaction(TERRAIN_STORE, 'readwrite');
      const store = transaction.objectStore(TERRAIN_STORE);
      for (const [, item] of queued) store.put(item.record);
      await transactionPromise(transaction);
      queued.forEach(([, item]) => item.settle.forEach((settle) => settle(true)));
    } catch {
      queued.forEach(([, item]) => item.settle.forEach((settle) => settle(false)));
    }
  }
}

export async function getMeshCacheStats() {
  try {
    const db = await openDb();
    const terrain = await countStore(db, TERRAIN_STORE);
    const mapTiles = await countStore(db, MAP_TILE_STORE);
    return { terrain, mapTiles, total: terrain + mapTiles };
  } catch {
    return { terrain: 0, mapTiles: 0, total: 0 };
  }
}

export async function clearMeshCache() {
  for (const item of terrainWriteQueue.values()) {
    item.settle.forEach((settle) => settle(false));
  }
  terrainWriteQueue.clear();
  mapTileWriteQueue.clear();
  mapTileWriteWorker = null;

  try {
    const db = await openDb();
    const terrain = await clearStore(db, TERRAIN_STORE);
    const mapTiles = await clearStore(db, MAP_TILE_STORE);
    return { terrain, mapTiles, total: terrain + mapTiles };
  } catch (error) {
    dbPromise = null;
    throw error;
  }
}

async function countStore(db: IDBDatabase, storeName: string) {
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  return requestPromise(store.count());
}

async function clearStore(db: IDBDatabase, storeName: string) {
  const count = await countStore(db, storeName);
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).clear();
  await transactionPromise(transaction);
  return count;
}

function openLegacyDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

async function migrateLegacyMeshCacheIfNeeded() {
  if (window.localStorage.getItem(CACHE_MIGRATION_KEY) === '1') return;
  try {
    const legacyDb = await openLegacyDb();
    const nextDb = await openDatabase(DB_NAME);
    for (const storeName of [TERRAIN_STORE, MAP_TILE_STORE]) {
      const records = await readAllStoreRecords(legacyDb, storeName);
      if (records.length === 0) continue;
      const transaction = nextDb.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      for (const record of records) {
        store.put(record);
      }
      await transactionPromise(transaction);
    }
    legacyDb.close();
    window.localStorage.setItem(CACHE_MIGRATION_KEY, '1');
  } catch {
    // Legacy cache missing or migration not possible; fresh cache is fine.
  }
}

function readAllStoreRecords(db: IDBDatabase, storeName: string) {
  return new Promise<CacheRecord[]>((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TERRAIN_STORE)) {
        db.createObjectStore(TERRAIN_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(MAP_TILE_STORE)) {
        db.createObjectStore(MAP_TILE_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function openDb() {
  if (dbPromise) return dbPromise;
  if (!window.indexedDB) {
    dbPromise = Promise.reject(new Error('IndexedDB unavailable'));
    return dbPromise;
  }

  dbPromise = migrateLegacyMeshCacheIfNeeded().then(() => openDatabase(DB_NAME));
  return dbPromise;
}

function requestPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionPromise(transaction: IDBTransaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
