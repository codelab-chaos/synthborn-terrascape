const DB_NAME = 'synthworldview-cache';
const DB_VERSION = 1;
const TERRAIN_STORE = 'terrainMeshes';
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromise = null;

export function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled }) {
  const details = detailsEnabled ? 'details' : 'surface';
  return `${formatVersion}:${details}:${world}:${chunkX}:${chunkZ}`;
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
