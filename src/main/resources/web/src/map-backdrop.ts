import * as THREE from 'three';
import { logClientEvent } from './client-log.js';
import { loadMapTilePng } from './library/map-tile-loader.js';
import { makeMapTileCacheKey, readMapTileCache, writeMapTileCache } from './mesh-cache.js';
import { MAP_BACKDROP_Y } from './water.js';
import { chunkId } from './utils.js';

const CHUNK_SIZE = 32;
/** Map tiles extend this many chunks beyond the voxel terrain square on each side. */
export const MAP_HORIZON_MARGIN = 40;
const SKY_RGB = { r: 23, g: 52, b: 84 };
const RISE_START_Y = -48;
const RISE_MS = 200;
const RISE_FAILSAFE_MULTIPLIER = 1.5;
const PROMOTE_PER_FRAME = 512;

type RisingTile = {
  mesh: THREE.Mesh;
  chunkX: number;
  chunkZ: number;
  startedAt: number;
  startY: number;
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

const loadedTiles = new Map<string, MapTileEntry>();
const pendingRise: RisingTile[] = [];
const activeRise = new Map<string, RisingTile>();
let loadGeneration = 0;
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
    transparent: true,
    opacity: 0.98,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  applyTileHeight(mesh, chunkX, chunkZ);
  mesh.name = `map-tile:${chunkX}:${chunkZ}`;
  mesh.renderOrder = 0;
  mesh.frustumCulled = false;
  return mesh;
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

function revealTile(entry: MapTileEntry, motionEnabled: boolean) {
  const key = tileMotionKey(entry.chunkX, entry.chunkZ);
  if (activeRise.has(key) || pendingRise.some((rising) => tileMotionKey(rising.chunkX, rising.chunkZ) === key)) {
    return;
  }
  entry.mesh.visible = true;
  if (!motionEnabled) {
    applyTileHeight(entry.mesh, entry.chunkX, entry.chunkZ);
    return;
  }
  const startY = RISE_START_Y;
  entry.mesh.position.y = startY;
  pendingRise.push({
    mesh: entry.mesh,
    chunkX: entry.chunkX,
    chunkZ: entry.chunkZ,
    startedAt: 0,
    startY,
  });
}

async function installTile(
  scene: THREE.Scene,
  world: string,
  chunkX: number,
  chunkZ: number,
  bytes: ArrayBuffer,
  maxAnisotropy: number,
  motionEnabled: boolean,
) {
  const id = chunkId(world, chunkX, chunkZ);
  if (loadedTiles.has(id)) return loadedTiles.get(id)!;

  const { texture, image } = await textureFromPngBytes(bytes, maxAnisotropy);
  const mesh = createTileMesh(texture, chunkX, chunkZ);
  const entry: MapTileEntry = {
    mesh,
    texture,
    image,
    pixels: null,
    pixelWidth: CHUNK_SIZE,
    pixelHeight: CHUNK_SIZE,
    chunkX,
    chunkZ,
    bytes: bytes.byteLength,
  };
  scene.add(mesh);
  loadedTiles.set(id, entry);
  revealTile(entry, motionEnabled);
  return entry;
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
    activeRise.delete(tileMotionKey(entry.chunkX, entry.chunkZ));
  }
  pendingRise.splice(0, pendingRise.length, ...pendingRise.filter((rising) => {
    const id = chunkId(world, rising.chunkX, rising.chunkZ);
    return retainIds.has(id);
  }));
  updateStats();
}

/** Load map tiles in caller-provided order, cache first, then direct chunk PNG fetches. */
export async function loadMapTilesForKeys(
  world: string,
  keys: { chunkX: number; chunkZ: number }[],
  options: { immediate?: boolean } = {},
) {
  if (!context?.enabled || !context.scene || keys.length === 0) return;
  const generation = loadGeneration;
  const { scene, renderer, formatVersion, motionEnabled } = context;
  const revealMotion = options.immediate === true ? false : motionEnabled;
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;

  const missing = keys.filter((key) => !loadedTiles.has(chunkId(world, key.chunkX, key.chunkZ)));
  if (missing.length === 0) return;

  const started = performance.now();
  const networkMissing: { chunkX: number; chunkZ: number }[] = [];

  for (const key of missing) {
    if (generation !== loadGeneration) return;
    const cacheKey = tileCacheKey(world, key.chunkX, key.chunkZ, formatVersion);
    const cached = await readMapTileCache(cacheKey);
    if (generation !== loadGeneration) return;
    if (cached?.bytes) {
      await installTile(scene, world, key.chunkX, key.chunkZ, cached.bytes, maxAnisotropy, revealMotion);
      activeStats.reuses += 1;
      continue;
    }
    networkMissing.push(key);
  }

  for (const key of networkMissing) {
    if (generation !== loadGeneration) return;
    try {
      const result = await loadMapTilePng(world, key.chunkX, key.chunkZ);
      if (generation !== loadGeneration) return;
      const cacheKey = tileCacheKey(world, key.chunkX, key.chunkZ, formatVersion);
      writeMapTileCache(cacheKey, result.bytes.slice(0), { source: result.source });
      await installTile(
        scene,
        world,
        key.chunkX,
        key.chunkZ,
        result.bytes,
        maxAnisotropy,
        revealMotion,
      );
    } catch (error) {
      console.warn(`Failed to load map tile ${key.chunkX},${key.chunkZ}`, error);
      logClientEvent('map_tile_single_failed', {
        world,
        chunkX: key.chunkX,
        chunkZ: key.chunkZ,
        error: error?.message ?? error,
      });
    }
  }

  activeStats.fetches += 1;
  activeStats.loadMs = performance.now() - started;
  updateStats();
  logClientEvent('map_tiles_stream', {
    world,
    requested: keys.length,
    installed: loadedTiles.size,
    network: networkMissing.length,
    ms: Math.round(activeStats.loadMs),
    visibleTiles: activeStats.visibleTiles,
  });
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
  pendingRise.splice(0, pendingRise.length);
  activeRise.clear();
  for (const entry of loadedTiles.values()) {
    scene.remove(entry.mesh);
    disposeTileEntry(entry);
  }
  loadedTiles.clear();
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
  return activeStats;
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
    ...activeStats,
  };
}

export function tickMapTileMotion(motionEnabled: boolean) {
  const now = performance.now();
  let promoted = 0;
  while (pendingRise.length > 0 && promoted < PROMOTE_PER_FRAME) {
    const rising = pendingRise.shift();
    if (!rising) break;
    const key = tileMotionKey(rising.chunkX, rising.chunkZ);
    rising.startedAt = now;
    activeRise.set(key, rising);
    promoted += 1;
  }

  for (const [key, rising] of [...activeRise.entries()]) {
    const found = [...loadedTiles.values()].find((tile) => tile.mesh === rising.mesh);
    if (!found) {
      activeRise.delete(key);
      continue;
    }

    if (!motionEnabled) {
      applyTileHeight(rising.mesh, rising.chunkX, rising.chunkZ);
      activeRise.delete(key);
      continue;
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
  return activeRise.size + pendingRise.length;
}

export function mapTileMotionActive() {
  return activeRise.size > 0 || pendingRise.length > 0;
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
  const entry = [...loadedTiles.values()].find((tile) => tile.chunkX === chunkX && tile.chunkZ === chunkZ);
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
  const entry = [...loadedTiles.values()].find((tile) => tile.chunkX === chunkX && tile.chunkZ === chunkZ);
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
