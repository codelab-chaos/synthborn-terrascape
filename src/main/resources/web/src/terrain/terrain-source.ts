import { logClientEvent, logClientTiming } from '../platform/client-log.ts';
import { apiFetch } from '../platform/api-client.ts';
import { readTerrainCache, writeTerrainCache } from '../platform/mesh-cache.ts';
import {
  terrainCacheKeyFor,
  terrainCosmeticOverlayCacheKeyFor,
  terrainCosmeticOverlayUrlFor,
  terrainUrlFor,
} from '../common/terrain-requests.ts';
import { delay } from '../common/utils.ts';
import { loader, runtime } from '../scene/scene-context.ts';
import {
  cosmeticBlocksMode,
  visualDetailMode,
} from '../ui/control-readers.ts';

export async function loadTerrainChunkData(world, key, generation) {
  const cacheKey = terrainCacheKey(world, key.chunkX, key.chunkZ);
  const readStarted = performance.now();
  const cached = await readTerrainCache(cacheKey);
  const cacheReadMs = performance.now() - readStarted;

  if (generation !== runtime.loadGeneration) {
    return { ok: false, key, stale: true, cacheReadMs, cacheParseMs: 0, cacheHit: false, cacheMiss: false, network: false };
  }

  if (cached?.bytes) {
    try {
      const parseStarted = performance.now();
      const gltf = await parseGltfBytes(cached.bytes);
      return {
        ok: true,
        world,
        key,
        gltf,
        source: 'cache',
        cacheReadMs,
        cacheParseMs: performance.now() - parseStarted,
        cacheHit: true,
        cacheMiss: false,
        network: false,
      };
    } catch (error) {
      console.warn(`Cached terrain parse failed for ${key.chunkX},${key.chunkZ}`, error);
      logClientEvent('terrain_cache_parse_failed', {
        chunkX: key.chunkX,
        chunkZ: key.chunkZ,
        error: error?.message ?? error,
      });
    }
  }

  const url = terrainUrl(world, key.chunkX, key.chunkZ);
  const started = performance.now();
  const bytes = await fetchArrayBufferWithRetry(url);
  const parseStarted = performance.now();
  const gltf = await parseGltfBytes(bytes);
  logClientTiming('terrain_single_load', started, { world, chunkX: key.chunkX, chunkZ: key.chunkZ });
  return {
    ok: true,
    world,
    key,
    gltf,
    bytes,
    source: 'network',
    cacheReadMs,
    cacheParseMs: performance.now() - parseStarted,
    cacheHit: false,
    cacheMiss: true,
    network: true,
  };
}

export function writeTerrainChunkCache(world, chunkX, chunkZ, bytes, meta = {}) {
  return writeTerrainCache(terrainCacheKey(world, chunkX, chunkZ), bytes.slice(0), meta);
}

export async function readCosmeticOverlayBytes(world, chunkX, chunkZ) {
  const cacheKey = terrainCosmeticOverlayCacheKey(world, chunkX, chunkZ);
  const cached = await readTerrainCache(cacheKey);
  if (cached?.bytes) {
    return { bytes: cached.bytes, cacheKey, cached: true };
  }
  return {
    bytes: await fetchArrayBufferWithRetry(terrainCosmeticOverlayUrl(world, chunkX, chunkZ)),
    cacheKey,
    cached: false,
  };
}

export function writeCosmeticOverlayCache(cacheKey, bytes) {
  return writeTerrainCache(cacheKey, bytes.slice(0), { source: 'cosmetic-overlay' });
}

export async function parseGltfBytes(arrayBuffer) {
  return await loader.parseAsync(arrayBuffer, '');
}

export async function fetchArrayBufferWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await apiFetch(url);
      if (!response.ok) {
        throw new Error(`Terrain request failed: ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      await delay(150 * attempt);
    }
  }
  throw lastError;
}

export function terrainCacheKey(world, chunkX, chunkZ) {
  return terrainCacheKeyFor(world, chunkX, chunkZ, {
    terrainFormatVersion: runtime.terrainFormatVersion,
    experimentalDetailsEnabled: runtime.experimentalDetailsEnabled,
    cosmeticsMode: cosmeticBlocksMode(),
    visualDetailMode: visualDetailMode(),
  });
}

export function terrainUrl(world, chunkX, chunkZ) {
  return terrainUrlFor(world, chunkX, chunkZ, {
    cosmeticsMode: cosmeticBlocksMode(),
    visualDetailMode: visualDetailMode(),
  });
}

export function terrainCosmeticOverlayCacheKey(world, chunkX, chunkZ) {
  return terrainCosmeticOverlayCacheKeyFor(world, chunkX, chunkZ, {
    terrainFormatVersion: runtime.terrainFormatVersion,
    experimentalDetailsEnabled: runtime.experimentalDetailsEnabled,
    visualDetailMode: visualDetailMode(),
  });
}

export function terrainCosmeticOverlayUrl(world, chunkX, chunkZ) {
  return terrainCosmeticOverlayUrlFor(world, chunkX, chunkZ, visualDetailMode());
}
