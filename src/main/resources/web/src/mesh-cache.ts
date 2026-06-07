const DB_NAME = 'synthworldview-cache';
const DB_VERSION = 2;
const TERRAIN_STORE = 'terrainMeshes';
const MAP_TILE_STORE = 'mapTileTextures';
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromise = null;
const mapTileWriteQueue = new Map();
let mapTileWriteWorker = null;

export function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled, cosmeticsMode, visualDetailMode }) {
  const details = detailsEnabled ? 'details' : 'surface';
  const cosmetics = cosmeticsMode || 'plain';
  const visualDetail = visualDetailMode || 'basic';
  return `${formatVersion}:${details}:${cosmetics}:${visualDetail}:${world}:${chunkX}:${chunkZ}`;
}

export async function readTerrainCache(key) {
  try {
    const db = await openDb();
    const record = await requestPromise(db.transaction(TERRAIN_STORE, 'readonly').objectStore(TERRAIN_STORE).get(key));
    if (!record?.bytes || Date.now() - record.updatedAt > MAX_RECORD_AGE_MS) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export function makeMapTileCacheKey({ world, chunkX, chunkZ, formatVersion }) {
  return `${formatVersion}:map:${world}:${chunkX}:${chunkZ}`;
}

export async function readMapTileCache(key) {
  try {
    const db = await openDb();
    const record = await requestPromise(db.transaction(MAP_TILE_STORE, 'readonly').objectStore(MAP_TILE_STORE).get(key));
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

export async function writeTerrainCache(key, bytes, meta = {}) {
  if (!bytes?.byteLength) return false;
  try {
    const db = await openDb();
    await requestPromise(db.transaction(TERRAIN_STORE, 'readwrite').objectStore(TERRAIN_STORE).put({
      key,
      bytes,
      meta,
      updatedAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
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

async function countStore(db, storeName) {
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  return requestPromise(store.count());
}

async function clearStore(db, storeName) {
  const count = await countStore(db, storeName);
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).clear();
  await transactionPromise(transaction);
  return count;
}

function openDb() {
  if (dbPromise) return dbPromise;
  if (!window.indexedDB) {
    dbPromise = Promise.reject(new Error('IndexedDB unavailable'));
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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
  return dbPromise;
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
