import * as THREE from 'three';
import { logClientEvent } from '../platform/client-log.ts';
import { loadMapTilePng } from './map-tile-loader.ts';
import { makeMapTileCacheKey, readMapTileCache, writeMapTileCache } from '../platform/mesh-cache.ts';
import { mapTileLightingTint } from '../scene/lighting.ts';
import { MAP_BACKDROP_Y } from '../scene/water.ts';
import { chunkId } from '../common/utils.ts';
import { spatialStaggerDelayMs } from '../common/spatial-stagger.ts';

const CHUNK_SIZE = 32;
const SKY_RGB = { r: 23, g: 52, b: 84 };
const RISE_START_Y = -48;
const RISE_MS = 140;
const RISE_FAILSAFE_MULTIPLIER = 1.5;
const REVEAL_STAGGER_MS = 360;
// How many map tiles download in parallel — an independent knob from voxel mesh concurrency.
let tileLoadConcurrency = 4;

export function setTileLoadConcurrency(value: number) {
  tileLoadConcurrency = Math.max(1, Math.floor(value) || 1);
}
const IMMEDIATE_TILE_LOAD_LIMIT = 96;
const TILE_QUEUE_SLICE_SIZE = 48;
const TILE_PROMOTIONS_PER_FRAME = 8;
const TILE_PROMOTION_BUDGET_MS = 3;

type RisingTile = {
  mesh: THREE.Mesh;
  chunkX: number;
  chunkZ: number;
  startedAt: number;
  startY: number;
  revealAt: number;
};

type MapTileEntry = {
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  image: CanvasImageSource | null;
  pixels: Uint8ClampedArray | null;
  pixelWidth: number;
  pixelHeight: number;
  chunkX: number;
  chunkZ: number;
  bytes: number;
};

type MapBackdropContext = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  enabled: boolean;
  formatVersion: string;
  motionEnabled: boolean;
};

type TileLoadRequest = {
  id: string;
  world: string;
  chunkX: number;
  chunkZ: number;
  scene: THREE.Scene;
  formatVersion: string;
  maxAnisotropy: number;
  motionEnabled: boolean;
  revealBaseAt: number;
};
type TileLoadResult = {
  installed: boolean;
  network: boolean;
};

type PreparedTile = {
  texture: THREE.Texture;
  image: CanvasImageSource | null;
};

type TilePromotionJob = {
  request: TileLoadRequest;
  generation: number;
  bytes: ArrayBuffer;
  prepared: PreparedTile;
  resolve: (installed: boolean) => void;
};

type TileLoadMode = 'cache-only' | 'network-only' | 'full';

const loadedTiles = new Map<string, MapTileEntry>();
const loadedTilesByCoord = new Map<string, MapTileEntry>();
const activeRise = new Map<string, RisingTile>();
const desiredTileLoads = new Map<string, TileLoadRequest>();
const inFlightTileLoads = new Map<string, {
  request: TileLoadRequest;
  mode: TileLoadMode;
  promise: Promise<TileLoadResult>;
}>();
const tilePromotionQueue: TilePromotionJob[] = [];
const activeTileTint = new THREE.Color(0xffffff);
let loadGeneration = 0;
let tileLoadGeneration = 0;
let tileLoadWorker: Promise<void> | null = null;
let tilePromotionWorker: Promise<void> | null = null;
let context: MapBackdropContext | null = null;
let activeStats = {
  loaded: 0,
  centerX: 0,
  centerZ: 0,
  radius: 0,
  chunks: 0,
  bytes: 0,
  loadMs: 0,
  textureSize: '',
  reused: false,
  fetches: 0,
  reuses: 0,
  anchorX: 0,
  anchorZ: 0,
  visibleTiles: 0,
  totalTiles: 0,
};

function easeOutCubic(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) ** 3;
}

function tileCacheKey(world: string, chunkX: number, chunkZ: number, formatVersion: string) {
  return makeMapTileCacheKey({ world, chunkX, chunkZ, formatVersion });
}

function tileMotionKey(chunkX: number, chunkZ: number) {
  return `${chunkX}:${chunkZ}`;
}

function coordKey(chunkX: number, chunkZ: number) {
  return `${chunkX}:${chunkZ}`;
}

/** Stable coordinate noise keeps reveals organic without changing from run to run. */
export function tileRevealDelayMs(chunkX: number, chunkZ: number) {
  return spatialStaggerDelayMs(chunkX, chunkZ, REVEAL_STAGGER_MS);
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function textureFromPngBytes(bytes: ArrayBuffer, maxAnisotropy: number) {
  const blob = new Blob([bytes], { type: 'image/png' });
  const objectUrl = URL.createObjectURL(blob);
  return new Promise<{ texture: THREE.Texture; image: CanvasImageSource | null }>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(objectUrl, (texture) => {
      URL.revokeObjectURL(objectUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, maxAnisotropy);
      texture.needsUpdate = true;
      resolve({ texture, image: texture.image ?? null });
    }, undefined, (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    });
  });
}

function applyTileHeight(mesh: THREE.Mesh, chunkX: number, chunkZ: number, y = MAP_BACKDROP_Y) {
  mesh.position.set(
    chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
    y,
    chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
  );
}

function createTileMesh(texture: THREE.Texture, chunkX: number, chunkZ: number) {
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: activeTileTint,
    transparent: true,
    opacity: 0.98,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: false,
  });
  material.userData.terrascapeMapTile = true;
  const mesh = new THREE.Mesh(geometry, material);
  applyTileHeight(mesh, chunkX, chunkZ);
  mesh.name = `map-tile:${chunkX}:${chunkZ}`;
  mesh.renderOrder = 0;
  return mesh;
}

export function updateMapBackdropLighting(options) {
  activeTileTint.copy(mapTileLightingTint(options));
  for (const entry of loadedTiles.values()) {
    applyTileMaterialTint(entry.mesh.material, activeTileTint);
  }
}

function applyTileMaterialTint(material: THREE.Material | THREE.Material[], tint: THREE.Color) {
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) {
    const maybeColored = mat as THREE.Material & { color?: THREE.Color };
    if (!maybeColored?.color) continue;
    maybeColored.color.copy(tint);
    maybeColored.needsUpdate = true;
  }
}

function disposeTileEntry(entry: MapTileEntry) {
  entry.mesh.parent?.remove(entry.mesh);
  entry.texture.dispose();
  entry.mesh.geometry?.dispose();
  const material = entry.mesh.material;
  if (material && !Array.isArray(material)) {
    material.dispose();
  }
  entry.mesh.dispose?.();
}

function revealTile(entry: MapTileEntry, motionEnabled: boolean, revealBaseAt: number) {
  const key = tileMotionKey(entry.chunkX, entry.chunkZ);
  if (activeRise.has(key)) return;
  entry.mesh.visible = true;
  if (!motionEnabled) {
    applyTileHeight(entry.mesh, entry.chunkX, entry.chunkZ);
    return;
  }
  const startY = RISE_START_Y;
  entry.mesh.position.y = startY;
  entry.mesh.visible = false;
  activeRise.set(key, {
    mesh: entry.mesh,
    chunkX: entry.chunkX,
    chunkZ: entry.chunkZ,
    startedAt: 0,
    startY,
    revealAt: revealBaseAt + tileRevealDelayMs(entry.chunkX, entry.chunkZ),
  });
}

function yieldToRenderFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function installPreparedTile(
  request: TileLoadRequest,
  bytes: ArrayBuffer,
  prepared: PreparedTile,
) {
  const { id, scene, world, chunkX, chunkZ, motionEnabled, revealBaseAt } = request;
  // Overlapping terrain/tile batches can decode the same coordinate together.
  // Keep the first result and dispose the redundant texture before scene install.
  if (loadedTiles.has(id)) {
    prepared.texture.dispose();
    return false;
  }
  const mesh = createTileMesh(prepared.texture, chunkX, chunkZ);
  const entry: MapTileEntry = {
    mesh,
    texture: prepared.texture,
    image: prepared.image,
    pixels: null,
    pixelWidth: CHUNK_SIZE,
    pixelHeight: CHUNK_SIZE,
    chunkX,
    chunkZ,
    bytes: bytes.byteLength,
  };
  scene.add(mesh);
  loadedTiles.set(id, entry);
  loadedTilesByCoord.set(coordKey(chunkX, chunkZ), entry);
  revealTile(entry, motionEnabled, revealBaseAt);
  return true;
}

function promotePreparedTile(
  request: TileLoadRequest,
  generation: number,
  bytes: ArrayBuffer,
  prepared: PreparedTile,
) {
  return new Promise<boolean>((resolve) => {
    tilePromotionQueue.push({ request, generation, bytes, prepared, resolve });
    startTilePromotionWorker();
  });
}

function startTilePromotionWorker() {
  if (tilePromotionWorker) return;
  tilePromotionWorker = processTilePromotionQueue().finally(() => {
    tilePromotionWorker = null;
    if (tilePromotionQueue.length > 0 && context?.enabled) startTilePromotionWorker();
  });
}

async function processTilePromotionQueue() {
  while (context?.enabled && tilePromotionQueue.length > 0) {
    // Always enter through a render frame. Without this boundary, individually
    // completing image decodes can repeatedly restart the worker in one frame and
    // accidentally bypass the promotion budget.
    await yieldToRenderFrame();
    if (!context?.enabled) break;
    const frameStarted = performance.now();
    let promoted = 0;
    while (tilePromotionQueue.length > 0) {
      if (
        promoted >= TILE_PROMOTIONS_PER_FRAME
        || (promoted > 0 && performance.now() - frameStarted >= TILE_PROMOTION_BUDGET_MS)
      ) break;

      const job = tilePromotionQueue.shift()!;
      const { request } = job;
      if (
        job.generation !== loadGeneration
        || desiredTileLoads.get(request.id) !== request
        || loadedTiles.has(request.id)
      ) {
        job.prepared.texture.dispose();
        job.resolve(loadedTiles.has(request.id));
        continue;
      }
      job.resolve(installPreparedTile(request, job.bytes, job.prepared));
      promoted += 1;
    }
    updateStats();
  }
}

function clearTilePromotionQueue() {
  for (const job of tilePromotionQueue.splice(0)) {
    job.prepared.texture.dispose();
    job.resolve(false);
  }
}

function updateStats() {
  let visibleTiles = 0;
  let totalBytes = 0;
  for (const entry of loadedTiles.values()) {
    if (entry.mesh.visible) visibleTiles += 1;
    totalBytes += entry.bytes;
  }
  activeStats = {
    ...activeStats,
    loaded: loadedTiles.size > 0 ? 1 : 0,
    bytes: totalBytes,
    textureSize: loadedTiles.size > 0 ? `${CHUNK_SIZE}x${CHUNK_SIZE}` : '',
    visibleTiles,
    totalTiles: loadedTiles.size,
  };
}

export function configureMapBackdrop(scene: THREE.Scene, renderer: THREE.WebGLRenderer, options) {
  context = {
    scene,
    renderer,
    enabled: options.enabled === true,
    formatVersion: options.formatVersion ?? 'v13',
    motionEnabled: options.motionEnabled !== false,
  };
  if (!context.enabled) {
    clearMapBackdrop(scene);
  }
}

export function pruneMapTiles(world: string, retainIds: Set<string>) {
  if (!context?.scene) return;
  const scene = context.scene;
  for (const [key, entry] of loadedTiles.entries()) {
    if (retainIds.has(key)) continue;
    scene.remove(entry.mesh);
    disposeTileEntry(entry);
    loadedTiles.delete(key);
    loadedTilesByCoord.delete(coordKey(entry.chunkX, entry.chunkZ));
    desiredTileLoads.delete(key);
    activeRise.delete(tileMotionKey(entry.chunkX, entry.chunkZ));
  }
  updateStats();
}

/** Load map tiles in caller-provided order, cache first, then direct chunk PNG fetches. */
export async function loadMapTilesForKeys(
  world: string,
  keys: { chunkX: number; chunkZ: number }[],
  options: { immediate?: boolean; replace?: boolean } = {},
) {
  if (!context?.enabled || !context.scene || keys.length === 0) return;
  const { scene, renderer, formatVersion, motionEnabled } = context;
  const revealMotion = motionEnabled;
  const revealBaseAt = performance.now();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;

  if (options.replace) {
    for (const [id] of desiredTileLoads) {
      if (!inFlightTileLoads.has(id)) {
        desiredTileLoads.delete(id);
      }
    }
  }

  let queued = 0;
  const immediateRequests: TileLoadRequest[] = [];
  for (const key of keys) {
    const id = chunkId(world, key.chunkX, key.chunkZ);
    if (loadedTiles.has(id)) continue;
    const request = {
      id,
      world,
      chunkX: key.chunkX,
      chunkZ: key.chunkZ,
      scene,
      formatVersion,
      maxAnisotropy,
      motionEnabled: revealMotion,
      revealBaseAt,
    };
    desiredTileLoads.set(id, request);
    immediateRequests.push(request);
    queued += 1;
  }
  if (queued === 0) {
    if (desiredTileLoads.size > 0) {
      startTileLoadWorker();
    }
    return;
  }

  tileLoadGeneration += 1;
  let loadedImmediateTiles = false;
  if (options.immediate === true && immediateRequests.length > 0 && immediateRequests.length <= IMMEDIATE_TILE_LOAD_LIMIT) {
    const networkRequests = await hydrateCachedTiles(immediateRequests, loadGeneration);
    await runWithConcurrency(networkRequests, tileLoadConcurrency, async (request) => {
      if (desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) return;
      try {
        const result = await loadTileRequest(request, loadGeneration, 'network-only');
        if (result.installed || loadedTiles.has(request.id)) {
          desiredTileLoads.delete(request.id);
        }
      } catch (error) {
        desiredTileLoads.delete(request.id);
        console.warn(`Failed to load map tile ${request.chunkX},${request.chunkZ}`, error);
      }
    });
    updateStats();
    loadedImmediateTiles = true;
  }
  startTileLoadWorker();
  if (loadedImmediateTiles) return;
  return tileLoadWorker;
}

function startTileLoadWorker() {
  if (!tileLoadWorker) {
    tileLoadWorker = processTileLoadQueue().finally(() => {
      tileLoadWorker = null;
      if (desiredTileLoads.size > 0 && context?.enabled) {
        startTileLoadWorker();
      }
    });
  }
}

async function processTileLoadQueue() {
  while (context?.enabled && desiredTileLoads.size > 0) {
    const generation = loadGeneration;
    const queueGeneration = tileLoadGeneration;
    const started = performance.now();
    let networkMissing = 0;
    const requests = [...desiredTileLoads.values()]
      .filter((request) => {
        return !loadedTiles.has(request.id) && desiredTileLoads.get(request.id) === request;
      })
      .slice(0, TILE_QUEUE_SLICE_SIZE);
    if (requests.length === 0) {
      desiredTileLoads.clear();
      break;
    }

    const networkRequests = await hydrateCachedTiles(requests, generation);
    await runWithConcurrency(networkRequests, tileLoadConcurrency, async (request) => {
      if (generation !== loadGeneration) return;
      if (desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) return;
      try {
        const result = await loadTileRequest(request, generation, 'network-only');
        if (result.network) networkMissing += 1;
        if (result.installed || loadedTiles.has(request.id) || desiredTileLoads.get(request.id) !== request) {
          desiredTileLoads.delete(request.id);
        }
      } catch (error) {
        desiredTileLoads.delete(request.id);
        console.warn(`Failed to load map tile ${request.chunkX},${request.chunkZ}`, error);
        logClientEvent('map_tile_single_failed', {
          world: request.world,
          chunkX: request.chunkX,
          chunkZ: request.chunkZ,
          error: error?.message ?? error,
        });
      }
    });

    activeStats.fetches += 1;
    activeStats.loadMs = performance.now() - started;
    updateStats();
    logClientEvent('map_tiles_stream', {
      world: requests[0]?.world ?? 'unknown',
      requested: requests.length,
      pending: desiredTileLoads.size,
      installed: loadedTiles.size,
      network: networkMissing,
      ms: Math.round(activeStats.loadMs),
      visibleTiles: activeStats.visibleTiles,
    });

    if (queueGeneration === tileLoadGeneration || generation !== loadGeneration) {
      break;
    }
  }
}

async function hydrateCachedTiles(requests: TileLoadRequest[], generation: number) {
  await Promise.all(requests.map(async (request) => {
    if (generation !== loadGeneration
      || desiredTileLoads.get(request.id) !== request
      || loadedTiles.has(request.id)) return;
    try {
      const result = await loadTileRequest(request, generation, 'cache-only');
      if (result.installed || loadedTiles.has(request.id)) {
        desiredTileLoads.delete(request.id);
      }
    } catch {
      // A corrupt cached PNG falls through to a fresh network copy below.
    }
  }));
  return requests.filter((request) => {
    return generation === loadGeneration
      && desiredTileLoads.get(request.id) === request
      && !loadedTiles.has(request.id);
  });
}

async function loadTileRequest(
  request: TileLoadRequest,
  generation: number,
  mode: TileLoadMode = 'full',
): Promise<TileLoadResult> {
  if (loadedTiles.has(request.id)) return { installed: false, network: false };
  const existing = inFlightTileLoads.get(request.id);
  if (existing && desiredTileLoads.get(request.id) === existing.request) {
    const result = await existing.promise;
    if (result.installed || mode === 'cache-only' || existing.mode !== 'cache-only') return result;
  }

  const task = loadTileRequestUncached(request, generation, mode).finally(() => {
    if (inFlightTileLoads.get(request.id)?.promise === task) {
      inFlightTileLoads.delete(request.id);
    }
  });
  inFlightTileLoads.set(request.id, { request, mode, promise: task });
  return task;
}

async function loadTileRequestUncached(
  request: TileLoadRequest,
  generation: number,
  mode: TileLoadMode,
): Promise<TileLoadResult> {
  const cacheKey = tileCacheKey(request.world, request.chunkX, request.chunkZ, request.formatVersion);
  if (mode !== 'network-only') {
    const cached = await readMapTileCache(cacheKey);
    if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) {
      return { installed: false, network: false };
    }
    if (cached?.bytes) {
      const prepared = await textureFromPngBytes(cached.bytes, request.maxAnisotropy);
      if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request) {
        prepared.texture.dispose();
        return { installed: false, network: false };
      }
      const created = await promotePreparedTile(request, generation, cached.bytes, prepared);
      if (created) activeStats.reuses += 1;
      return { installed: created || loadedTiles.has(request.id), network: false };
    }
    if (mode === 'cache-only') return { installed: false, network: false };
  }

  const result = await loadMapTilePng(request.world, request.chunkX, request.chunkZ);
  if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) {
    return { installed: false, network: true };
  }
  void writeMapTileCache(cacheKey, result.bytes.slice(0), { source: result.source });
  const prepared = await textureFromPngBytes(result.bytes, request.maxAnisotropy);
  if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request) {
    prepared.texture.dispose();
    return { installed: false, network: true };
  }
  const created = await promotePreparedTile(request, generation, result.bytes, prepared);
  return { installed: created || loadedTiles.has(request.id), network: true };
}

/** @deprecated Use configureMapBackdrop + loadMapTilesForKeys with terrain batches. */
export function updateMapBackdrop(scene, renderer, options) {
  configureMapBackdrop(scene, renderer, options);
  activeStats.centerX = options.centerX ?? 0;
  activeStats.centerZ = options.centerZ ?? 0;
  activeStats.radius = options.meshRadius ?? 0;
  activeStats.chunks = (options.meshRadius ?? 0) * 2 + 1;
  activeStats.anchorX = options.centerX ?? 0;
  activeStats.anchorZ = options.centerZ ?? 0;
}

export function setMapTileChunkCovered(_chunkX: number, _chunkZ: number, _covered: boolean) {
  // Bedrock map tiles stay visible; terrain depth buffer occludes them.
}

export function clearMapBackdrop(scene) {
  loadGeneration += 1;
  clearTilePromotionQueue();
  activeRise.clear();
  for (const entry of loadedTiles.values()) {
    scene.remove(entry.mesh);
    disposeTileEntry(entry);
  }
  loadedTiles.clear();
  loadedTilesByCoord.clear();
  desiredTileLoads.clear();
  activeStats = {
    loaded: 0,
    centerX: 0,
    centerZ: 0,
    radius: 0,
    chunks: 0,
    bytes: 0,
    loadMs: 0,
    textureSize: '',
    reused: false,
    fetches: activeStats.fetches,
    reuses: 0,
    anchorX: 0,
    anchorZ: 0,
    visibleTiles: 0,
    totalTiles: 0,
  };
}

export function mapBackdropStats() {
  return Object.assign(activeStats, {
    pending: desiredTileLoads.size,
    inFlight: inFlightTileLoads.size,
    promotionPending: tilePromotionQueue.length,
  });
}

export function mapTileSceneStats() {
  let meshCount = 0;
  let visibleCount = 0;
  for (const entry of loadedTiles.values()) {
    meshCount += 1;
    if (entry.mesh.visible) visibleCount += 1;
  }
  return {
    meshCount,
    visibleCount,
    ...mapBackdropStats(),
  };
}

export function tickMapTileMotion(motionEnabled: boolean) {
  const now = performance.now();
  for (const [key, rising] of [...activeRise.entries()]) {
    const found = loadedTilesByCoord.get(coordKey(rising.chunkX, rising.chunkZ));
    if (found?.mesh !== rising.mesh) {
      activeRise.delete(key);
      continue;
    }

    if (!motionEnabled) {
      rising.mesh.visible = true;
      applyTileHeight(rising.mesh, rising.chunkX, rising.chunkZ);
      activeRise.delete(key);
      continue;
    }

    if (now < rising.revealAt) continue;
    if (rising.startedAt === 0) {
      rising.startedAt = now;
      rising.mesh.visible = true;
    }

    const elapsed = now - rising.startedAt;
    const duration = Math.max(1, RISE_MS);
    const rawT = elapsed / duration;
    rising.mesh.position.y = THREE.MathUtils.lerp(
      rising.startY,
      MAP_BACKDROP_Y,
      easeOutCubic(Math.min(1, rawT)),
    );

    if (rawT >= 1 || elapsed >= duration * RISE_FAILSAFE_MULTIPLIER) {
      applyTileHeight(rising.mesh, rising.chunkX, rising.chunkZ);
      activeRise.delete(key);
    }
  }

  updateStats();
  return activeRise.size;
}

export function mapTileMotionActive() {
  return activeRise.size > 0;
}

function ensureTilePixels(entry: MapTileEntry) {
  if (entry.pixels || !entry.image) return entry.pixels;
  const image = entry.image as { width?: number; height?: number };
  const width = image.width ?? CHUNK_SIZE;
  const height = image.height ?? CHUNK_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context2d = canvas.getContext('2d', { willReadFrequently: true });
  if (!context2d) return null;
  context2d.drawImage(entry.image, 0, 0);
  entry.pixelWidth = width;
  entry.pixelHeight = height;
  entry.pixels = context2d.getImageData(0, 0, width, height).data;
  return entry.pixels;
}

export function auditMapTiles(scene: THREE.Scene) {
  const issues: string[] = [];
  const tiles = [];
  for (const entry of loadedTiles.values()) {
    const material = entry.mesh.material as THREE.MeshBasicMaterial;
    const texture = material?.map;
    const image = texture?.image as { width?: number; height?: number } | undefined;
    const worldX = entry.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const worldZ = entry.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
    const sample = sampleMapBackdropColor(worldX, worldZ);
    const row = {
      chunkX: entry.chunkX,
      chunkZ: entry.chunkZ,
      visible: entry.mesh.visible,
      inScene: entry.mesh.parent === scene,
      y: entry.mesh.position.y,
      hasTexture: Boolean(texture),
      textureWidth: image?.width ?? 0,
      textureHeight: image?.height ?? 0,
      bytes: entry.bytes,
      sample,
    };
    tiles.push(row);
    if (!row.inScene) issues.push(`missing_scene:${entry.chunkX},${entry.chunkZ}`);
    if (!row.hasTexture) issues.push(`missing_texture:${entry.chunkX},${entry.chunkZ}`);
    if (row.textureWidth < 8 || row.textureHeight < 8) issues.push(`tiny_texture:${entry.chunkX},${entry.chunkZ}`);
    if (!row.visible) issues.push(`not_visible:${entry.chunkX},${entry.chunkZ}`);
    if (!sample) issues.push(`sample_failed:${entry.chunkX},${entry.chunkZ}`);
  }
  return {
    ok: issues.length === 0 && tiles.length > 0,
    count: tiles.length,
    issues,
    tiles: tiles.slice(0, 8),
  };
}

export function probeMapTilePixel(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  renderFrame: () => void,
  chunkX: number,
  chunkZ: number,
) {
  const entry = loadedTilesByCoord.get(coordKey(chunkX, chunkZ));
  if (!entry) {
    return { ok: false, error: 'tile_missing' };
  }

  const savedVisibility = new Map<THREE.Object3D, boolean>();
  scene.traverse((object) => {
    savedVisibility.set(object, object.visible);
  });

  scene.traverse((object) => {
    if (object === entry.mesh) {
      object.visible = true;
      return;
    }
    if (object === scene) return;
    object.visible = false;
  });

  const worldX = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
  const worldZ = chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
  const savedPosition = camera.position.clone();
  const savedQuaternion = camera.quaternion.clone();
  const savedUp = camera.up.clone();
  const savedBackground = scene.background;
  const savedFog = scene.fog;

  camera.position.set(worldX, 12, worldZ);
  camera.up.set(0, 0, -1);
  camera.lookAt(worldX, MAP_BACKDROP_Y, worldZ);
  camera.updateMatrixWorld(true);

  scene.background = null;
  scene.fog = null;
  renderFrame();

  const canvas = renderer.domElement;
  const gl = renderer.getContext() as WebGLRenderingContext;
  const pixel = new Uint8Array(4);
  const x = Math.floor(canvas.width / 2);
  const y = Math.floor(canvas.height / 2);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  for (const [object, visible] of savedVisibility.entries()) {
    object.visible = visible;
  }
  camera.position.copy(savedPosition);
  camera.quaternion.copy(savedQuaternion);
  camera.up.copy(savedUp);
  camera.updateMatrixWorld(true);
  scene.background = savedBackground;
  scene.fog = savedFog;

  const sampled = sampleMapBackdropColor(worldX, worldZ);
  const skyDistance = Math.hypot(
    pixel[0] - SKY_RGB.r,
    pixel[1] - SKY_RGB.g,
    pixel[2] - SKY_RGB.b,
  );
  const sampleDistance = sampled
    ? Math.hypot(pixel[0] - sampled.r, pixel[1] - sampled.g, pixel[2] - sampled.b)
    : Number.POSITIVE_INFINITY;
  const notSky = skyDistance > 24;
  const mapTint = pixel[1] >= pixel[0] && pixel[1] >= pixel[2];

  return {
    ok: notSky && sampled != null && (mapTint || sampleDistance < 96),
    pixel: { r: pixel[0], g: pixel[1], b: pixel[2] },
    sampled,
    skyDistance: Math.round(skyDistance),
    sampleDistance: Math.round(sampleDistance),
    mapTint,
  };
}

export function sampleMapBackdropColor(worldX, worldZ) {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    return null;
  }
  const chunkX = Math.floor(worldX / CHUNK_SIZE);
  const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
  const entry = loadedTilesByCoord.get(coordKey(chunkX, chunkZ));
  if (!entry?.image) return null;

  const localX = worldX - chunkX * CHUNK_SIZE;
  const localZ = worldZ - chunkZ * CHUNK_SIZE;
  const u = localX / CHUNK_SIZE;
  const v = 1 - (localZ / CHUNK_SIZE);
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;

  const pixels = ensureTilePixels(entry);
  if (!pixels) return null;
  const x = Math.max(0, Math.min(entry.pixelWidth - 1, Math.floor(u * entry.pixelWidth)));
  const y = Math.max(0, Math.min(entry.pixelHeight - 1, Math.floor(v * entry.pixelHeight)));
  const offset = (y * entry.pixelWidth + x) * 4;
  return { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
}
