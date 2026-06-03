import * as THREE from 'three';
export { createMobMarker, createPlayerMarker, disposeObject, updateMobMarkerHeight } from './players.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createChunkDebug } from './chunk-debug.js';
import {
  autoStreamInput,
  canvas,
  chunkXInput,
  chunkZInput,
  coordTargetEl,
  coordChunkEl,
  coordCameraEl,
  debugBoundsInput,
  experimentalDetailsStateEl,
  hudEl,
  infoCardEl,
  infoCardHeadEl,
  panelToggle,
  mapTilesInput,
  mapTimeInput,
  metricLoadedEl,
  metricMeshesEl,
  metricResourcesEl,
  metricGpuEl,
  metricDisposedEl,
  metricMobsEl,
  metricCenterEl,
  playersEl,
  playerUpdateRateInput,
  radiusInput,
  shadeDarknessInput,
  shadeDarknessValueInput,
  shadeSizeInput,
  shadeSizeValueInput,
  shaderEffectInput,
  showPlayersInput,
  showMobsInput,
  sunLightingInput,
  statusEl,
  timeCycleLabelEl,
  skySceneEl,
  skySunEl,
  skyMoonEl,
  skyStarsEl,
  treeShadeInput,
  waterModeInput,
  worldSelect,
} from './dom.js';
import {
  applyLightingEnvironment,
  applyLightingToObject,
  createTreeShadeObject,
  createLightingRig,
  lightingOptionsFromInputs,
  positionSkyObjects,
  updateTreeShadeObject,
} from './lighting.js';
import { logClientEvent, logClientTiming } from './client-log.js';
import { createFpsCounter, positionFpsCounter, updateFpsCounter } from './fps-counter.js';
import {
  mapBackdropStats,
  sampleMapBackdropColor,
  updateMapBackdrop,
} from './map-backdrop.js';
import {
  createMobMarker,
  createPlayerMarker,
  disposeObject,
  updateMobMarkerCard,
  updateMobMarkerHeight,
  updatePlayerMarkerCard,
  updatePlayerMarkerCardHeight,
} from './players.js';
import {
  createPostProcessing,
  renderPostProcessing,
  resizePostProcessing,
  setShaderEffect,
} from './postprocessing.js';
import { base64ToArrayBuffer, centerId, chunkId, delay, formatCoord, numberOr } from './utils.js';
import { isVectorState, loadStoredViewState, saveStoredViewState, vectorState } from './view-state.js';
import { applyWaterModeToObject, prepareWaterMaterials, tintWaterMaterialsFromMap, updateWaterMaterials } from './water.js';
import { makeTerrainCacheKey, readTerrainCache, writeTerrainCache } from './mesh-cache.js';

const SKY_COLOR = 0x173454;
const GRID_AXIS_COLOR = 0x58616a;
const GRID_LINE_COLOR = 0x343b42;
const EMPTY_GRID_SIZE = 1024;
const EMPTY_GRID_DIVISIONS = 128;
const EMPTY_GRID_CHUNK_SNAP = 32;
const EMPTY_GRID_Y = 96;
const TERRAIN_BATCH_SIZE = 16;
const DEFAULT_PLAYER_UPDATE_RATE_MS = 1000;
const FOCUSED_PLAYER_POLL_MIN_MS = 1000;
const EMPTY_PLAYER_POLL_MS = 15000;
const HIDDEN_PLAYER_POLL_MS = 30000;
const PLAYER_POLL_ERROR_MS = 10000;
const MOB_POLL_MS = 5000;
const EMPTY_MOB_POLL_MS = 12000;
const MOB_POLL_ERROR_MS = 15000;
const ENTITY_STREAM_FALLBACK_DELAY_MS = 4000;
const MAP_TIME_ACTIVE_POLL_MS = 5000;
const MAP_TIME_VISIBLE_POLL_MS = 10000;
const MAP_TIME_IDLE_POLL_MS = 30000;
const PLAYER_CONNECT_MOB_SAMPLE_DELAY_MS = 1500;
const FLY_LOOK_DISTANCE = 64;
const FLY_MOUSE_SENSITIVITY = 0.0022;
const FLY_MOVE_SPEED = 72;
const FLY_SPRINT_MULTIPLIER = 3;
const FLY_ZOOM_STEP = 18;
const FLY_ZOOM_MAX_TICKS = 6;
const FLY_MIN_Y = 8;
const FLY_MAX_Y = 1200;
const MOB_CARD_MIN_HEIGHT = 3.4;
const MOB_CARD_PLAYER_HEIGHT = 4.8;
const MOB_CARD_TREE_TOP_HEIGHT = 24;
const NOON_LIGHTING_TIME = {
  dayProgress: 0.5,
  sunlightFactor: 1,
  phase: 'noon',
  sunDirection: { x: 0.2, y: -1, z: 0.25 },
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const rendererPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(rendererPixelRatio);
renderer.setClearColor(SKY_COLOR, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 620, 4200);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 6000);
camera.position.set(88, 188, 88);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 122, 16);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 18;
controls.maxDistance = 1400;
controls.minPolarAngle = 0.01;
controls.maxPolarAngle = Math.PI - 0.01;
controls.screenSpacePanning = true;
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY,
};
controls.touches = {
  ONE: THREE.TOUCH.PAN,
  TWO: THREE.TOUCH.DOLLY_ROTATE,
};

const lightingRig = createLightingRig(scene, SKY_COLOR);
const postProcessing = createPostProcessing(renderer, scene, camera);
const fpsCounter = createFpsCounter(scene, camera, renderer);

const grid = new THREE.GridHelper(EMPTY_GRID_SIZE, EMPTY_GRID_DIVISIONS, GRID_AXIS_COLOR, GRID_LINE_COLOR);
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
  material.transparent = true;
  material.opacity = 0.42;
  material.depthTest = true;
  material.depthWrite = false;
}
grid.renderOrder = -50;
scene.add(grid);

const loader = new GLTFLoader();
const loadedChunks = new Map();
const playerMarkers = new Map();
const playerTiles = new Map();
const mobMarkers = new Map();
const disposalStats = {
  chunks: 0,
  geometries: 0,
  materials: 0,
  textures: 0,
};
let loadGeneration = 0;
let hasFocusedInitialGrid = false;
let activeCenterId = null;
let requestedCenterId = null;
let scheduledCenterId = null;
let streamTimer = null;
let controlLoadTimer = null;
let playerPollTimer = null;
let mobPollTimer = null;
let entityStream = null;
let entityStreamWorld = null;
let entityStreamPlayers = null;
let entityStreamMobs = null;
let entityStreamFallbackTimer = null;
let playerConnectMobSampleTimer = null;
const pressedKeys = new Set();
const clock = new THREE.Clock();
const initialParams = new URLSearchParams(window.location.search);
let experimentalDetailsEnabled = false;
let terrainFormatVersion = 'unknown';
let storedViewState = loadStoredViewState();
let hasRestoredCameraPose = false;
let hasStarted = false;
let lastViewStateSave = 0;
let flyYaw = 0;
let flyPitch = 0;
let worldTime = null;
let timePollTimer = null;
let viewPlayerUuid = null;
let followPlayerUuid = null;
const cameraModeStack = [];
let isRefreshingPlayers = false;
let lastPlayerCount = 0;
let lastPlayerPollFailed = false;
let isRefreshingMobs = false;
let lastMobCount = 0;
let lastMobPollFailed = false;
let entityStreamConnected = false;
let lastMobSourceStats = null;
let npcDetailsLoaded = false;
const npcDetailsById = new Map();
const npcDetailsAliases = new Map();

const tempPlayerTarget = new THREE.Vector3();
const tempMobTarget = new THREE.Vector3();
const tempPlayerCamera = new THREE.Vector3();
const tempPlayerLook = new THREE.Vector3();
const tempPlayerCardQuaternion = new THREE.Quaternion();
const tempPlayerParentQuaternion = new THREE.Quaternion();
const tempFollowDelta = new THREE.Vector3();
const tempCameraForward = new THREE.Vector3();
const tempCenteredPivot = new THREE.Vector3();
const tempFlyRight = new THREE.Vector3();
const tempFlyMove = new THREE.Vector3();
const tempFlyZoom = new THREE.Vector3();
const tempFlyEuler = new THREE.Euler(0, 0, 0, 'YXZ');

function currentLightingOptions() {
  return lightingOptionsFromInputs({
    sunLightingInput,
    treeShadeInput,
    shadeSizeInput: shadeSizeValueInput,
    shadeDarknessInput: shadeDarknessValueInput,
    time: mapTimeInput.checked ? worldTime : NOON_LIGHTING_TIME,
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateMetrics() {
  const loaded = loadedChunks.size;
  const center = activeCenterId ? activeCenterId.split(':').slice(1).join(', ') : 'pending';
  const resources = collectResourceStats();
  const rendererMemory = renderer.info.memory;
  const mapBackdrop = mapBackdropStats();
  metricLoadedEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'}`
    + (mapBackdrop.loaded > 0
      ? ` · map backdrop ${mapBackdrop.chunks}x${mapBackdrop.chunks}`
        + (mapBackdrop.bytes > 0 ? ` ${formatBytes(mapBackdrop.bytes)}` : '')
        + (mapBackdrop.loadMs > 0 ? ` ${Math.round(mapBackdrop.loadMs)}ms` : '')
      : '');
  metricMeshesEl.textContent = `${resources.meshes}`;
  metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
  metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
  metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
  metricMobsEl.textContent = mobMetricText();
  metricCenterEl.textContent = center;
}

function mobMetricText() {
  if (!showMobsInput.checked) {
    return 'hidden';
  }
  const summary = summarizeMobTypes();
  const source = lastMobSourceStats?.source ? ` · ${lastMobSourceStats.source}` : '';
  return summary ? `${mobMarkers.size} · ${summary}${source}` : `${mobMarkers.size}${source}`;
}

function summarizeMobTypes() {
  const counts = new Map();
  for (const marker of mobMarkers.values()) {
    const type = marker.userData.mob?.type ?? marker.userData.mob?.category ?? 'Mob';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([type, count]) => `${type} ${count}`)
    .join(' · ');
}

async function loadNpcDetails() {
  try {
    const response = await fetch('/npc-details.json');
    if (!response.ok) {
      throw new Error(`NPC details request failed: ${response.status}`);
    }
    const data = await response.json();
    npcDetailsById.clear();
    npcDetailsAliases.clear();
    for (const entry of Object.values(data.entries ?? {})) {
      if (!entry?.id) continue;
      npcDetailsById.set(entry.id, entry);
      for (const alias of entry.aliases ?? []) {
        npcDetailsAliases.set(normalizeNpcKey(alias), entry);
      }
      npcDetailsAliases.set(normalizeNpcKey(entry.id), entry);
      npcDetailsAliases.set(normalizeNpcKey(entry.label), entry);
      npcDetailsAliases.set(normalizeNpcKey(entry.appearance), entry);
    }
    npcDetailsLoaded = true;
    logClientEvent('npc_details_loaded', {
      roles: npcDetailsById.size,
      aliases: npcDetailsAliases.size,
    });
  } catch (error) {
    npcDetailsLoaded = false;
    console.warn('NPC details lookup failed', error);
    logClientEvent('npc_details_failed', { error: error?.message ?? error });
  }
}

function enrichMob(mob, id) {
  const details = resolveNpcDetails(mob);
  const category = String(mob.category ?? details?.categoryPath ?? '').toLowerCase();
  const maxHealth = firstFiniteNumber(mob.maxHealth, mob.maxHp, details?.maxHealth, mob.hp, mob.health);
  const rawAttackDamage = firstFiniteNumber(mob.attackDamage, mob.damage, details?.attackDamage);
  const passiveCard = isPassiveMobCategory(category, rawAttackDamage);
  const attackDamage = passiveCard ? 0 : rawAttackDamage;
  return {
    ...mob,
    id,
    details,
    label: details?.label ?? mob.label ?? mob.type ?? id,
    maxHealth,
    hp: firstFiniteNumber(mob.health, mob.hp, maxHealth),
    attackDamage,
    iconUrl: details?.icon ? `/${details.icon}` : mob.iconUrl,
    passiveCard,
  };
}

function resolveNpcDetails(mob) {
  const candidates = [
    mob.id,
    mob.type,
    mob.label,
    mob.role,
    mob.appearance,
    stripRuntimeSuffix(mob.type),
    stripRuntimeSuffix(mob.label),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const exact = npcDetailsById.get(candidate);
    if (exact) return exact;
    const alias = npcDetailsAliases.get(normalizeNpcKey(candidate));
    if (alias) return alias;
  }
  return null;
}

function isPassiveMobCategory(category, attackDamage) {
  if (typeof attackDamage === 'number' && attackDamage > 0) {
    return false;
  }
  if (['passive', 'livestock', 'critter', 'flying', 'swimming'].some((value) => category.includes(value))) {
    return true;
  }
  return attackDamage === null && ['creature', 'avian', 'fish'].some((value) => category.includes(value));
}

function normalizeNpcKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function stripRuntimeSuffix(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/_(Wander|Patrol|Fighter|Archer|Scout|Soldier)$/i, '');
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadWorlds() {
  setStatus('Loading worlds');
  const response = await fetch('/api/worlds');
  const data = await response.json();
  experimentalDetailsEnabled = data.features?.experimentalDetails === true;
  terrainFormatVersion = data.features?.terrainFormatVersion ?? terrainFormatVersion;
  experimentalDetailsStateEl.textContent = experimentalDetailsEnabled
    ? 'Detailed trees: server on'
    : 'Detailed trees: server off';
  experimentalDetailsStateEl.classList.toggle('enabled', experimentalDetailsEnabled);
  worldSelect.replaceChildren();
  for (const world of data.worlds ?? []) {
    const option = document.createElement('option');
    option.value = world.name;
    option.textContent = world.name;
    worldSelect.append(option);
  }
  applyStoredWorld();
  applyInitialWorldParam();
  setStatus(worldSelect.value ? 'Ready' : 'No worlds found');
}

function applyInitialParams() {
  applyStoredInputs();
  applyNumberParam('chunkX', chunkXInput);
  applyNumberParam('chunkZ', chunkZInput);
  applyNumberParam('radius', radiusInput);
  applyBooleanParam('auto', autoStreamInput);
  applyBooleanParam('bounds', debugBoundsInput);
  applyBooleanParam('players', showPlayersInput);
  applyBooleanParam('mobs', showMobsInput);
  applyBooleanParam('sun', sunLightingInput);
  applyBooleanParam('shade', treeShadeInput);
  applyBooleanParam('mapTiles', mapTilesInput);
  applyBooleanParam('mapTime', mapTimeInput);
  applyFloatParam('shadeSize', shadeSizeInput, shadeSizeValueInput);
  applyFloatParam('shadeDarkness', shadeDarknessInput, shadeDarknessValueInput);
  applySelectParam('water', waterModeInput);
  applySelectParam('shader', shaderEffectInput);
  applySelectParam('playerRate', playerUpdateRateInput);
  setShaderEffect(postProcessing, shaderEffectInput.value);
  applyLighting();
}

function applyStoredInputs() {
  if (!storedViewState) return;
  setNumberInput(chunkXInput, storedViewState.chunkX);
  setNumberInput(chunkZInput, storedViewState.chunkZ);
  setNumberInput(radiusInput, storedViewState.radius);
  if (typeof storedViewState.auto === 'boolean') autoStreamInput.checked = storedViewState.auto;
  if (typeof storedViewState.bounds === 'boolean') debugBoundsInput.checked = storedViewState.bounds;
  if (typeof storedViewState.players === 'boolean') showPlayersInput.checked = storedViewState.players;
  if (typeof storedViewState.mobs === 'boolean') showMobsInput.checked = storedViewState.mobs;
  if (typeof storedViewState.sun === 'boolean') sunLightingInput.checked = storedViewState.sun;
  if (typeof storedViewState.shade === 'boolean') treeShadeInput.checked = storedViewState.shade;
  if (typeof storedViewState.mapTime === 'boolean') mapTimeInput.checked = storedViewState.mapTime;
  if (typeof storedViewState.mapTiles === 'boolean') mapTilesInput.checked = storedViewState.mapTiles;
  if (typeof storedViewState.renderDetails === 'boolean') setRenderDetailsOpen(storedViewState.renderDetails);
  setPairedControlValue(shadeSizeInput, shadeSizeValueInput, storedViewState.shadeSize);
  setPairedControlValue(shadeDarknessInput, shadeDarknessValueInput, storedViewState.shadeDarkness);
  if (typeof storedViewState.water === 'string') {
    applySelectValue(waterModeInput, storedViewState.water);
  }
  if (typeof storedViewState.shader === 'string') {
    applySelectValue(shaderEffectInput, storedViewState.shader);
  }
  if (typeof storedViewState.playerRate === 'string') {
    applySelectValue(playerUpdateRateInput, storedViewState.playerRate);
  }
}

function applyStoredWorld() {
  if (!storedViewState?.world) return;
  applySelectValue(worldSelect, storedViewState.world);
}

function applyInitialWorldParam() {
  const world = initialParams.get('world');
  if (!world) return;
  for (const option of worldSelect.options) {
    if (option.value === world) {
      worldSelect.value = world;
      return;
    }
  }
}

function applyNumberParam(name, input) {
  const value = initialParams.get(name);
  if (value === null || value.trim() === '') return;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) input.value = parsed;
}

function applyBooleanParam(name, input) {
  const value = initialParams.get(name);
  if (value === null) return;
  input.checked = ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function applyFloatParam(name, ...inputs) {
  const value = initialParams.get(name);
  if (value === null || value.trim() === '') return;
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    for (const input of inputs) {
      input.value = parsed;
    }
  }
}

function applySelectParam(name, input) {
  const value = initialParams.get(name);
  if (value === null) return;
  applySelectValue(input, value);
}

function applySelectValue(input, value) {
  for (const option of input.options) {
    if (option.value === value) {
      input.value = value;
      return;
    }
  }
}

function setNumberInput(input, value) {
  if (Number.isFinite(value)) {
    input.value = value;
  }
}

function setPairedControlValue(rangeInput, numberInput, value) {
  if (!Number.isFinite(value)) return;
  const normalized = normalizePairedValue(rangeInput, value);
  rangeInput.value = normalized;
  numberInput.value = normalized;
}

function normalizePairedValue(input, value) {
  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  const step = Number.parseFloat(input.step);
  let normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return Number.parseFloat(input.value);
  }
  if (Number.isFinite(min)) normalized = Math.max(min, normalized);
  if (Number.isFinite(max)) normalized = Math.min(max, normalized);
  if (Number.isFinite(step) && step > 0) {
    normalized = Math.round(normalized / step) * step;
  }
  return Number.parseFloat(normalized.toFixed(4));
}

async function loadGrid(options = {}) {
  const gridStarted = performance.now();
  const world = worldSelect.value;
  const centerX = options.centerX ?? Number.parseInt(chunkXInput.value, 10);
  const centerZ = options.centerZ ?? Number.parseInt(chunkZInput.value, 10);
  const radius = Math.max(0, numberOr(Number.parseInt(radiusInput.value, 10), 0));
  radiusInput.value = radius;
  if (!world || Number.isNaN(centerX) || Number.isNaN(centerZ)) {
    setStatus('Choose a world and integer chunk coordinates');
    return;
  }

  const generation = ++loadGeneration;
  const centerKey = centerId(world, centerX, centerZ);
  requestedCenterId = centerKey;
  scheduledCenterId = null;
  chunkXInput.value = centerX;
  chunkZInput.value = centerZ;

  if (options.focus === true && !hasFocusedInitialGrid) {
    focusGrid(centerX, centerZ, radius);
    hasFocusedInitialGrid = true;
  }

  const needed = chunkKeys(centerX, centerZ, radius);
  retainOnly(world, needed);
  updateMapTileLayer(centerX, centerZ, radius);
  updateMetrics();

  setStatus(`Loading ${needed.length} chunks around ${centerX}, ${centerZ}`);
  let completed = 0;
  let failed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let cacheReadMs = 0;
  let cacheParseMs = 0;
  const missing = [];
  for (const key of needed) {
    if (generation !== loadGeneration) return;
    if (loadedChunks.has(key.id)) {
      completed++;
    } else {
      missing.push(key);
    }
  }

  const networkMissing = [];
  const cacheReadStarted = performance.now();
  for (const key of missing) {
    if (generation !== loadGeneration) return;
    const cacheKey = terrainCacheKey(world, key.chunkX, key.chunkZ);
    const cached = await readTerrainCache(cacheKey);
    if (!cached?.bytes) {
      cacheMisses++;
      networkMissing.push(key);
      continue;
    }

    try {
      const parseStarted = performance.now();
      const gltf = await parseGltfBytes(cached.bytes);
      cacheParseMs += performance.now() - parseStarted;
      if (generation !== loadGeneration) return;
      addChunkObject(world, key.chunkX, key.chunkZ, gltf.scene);
      cacheHits++;
      completed++;
    } catch (error) {
      console.warn(`Cached terrain parse failed for ${key.chunkX},${key.chunkZ}`, error);
      logClientEvent('terrain_cache_parse_failed', {
        chunkX: key.chunkX,
        chunkZ: key.chunkZ,
        error: error?.message ?? error,
      });
      cacheMisses++;
      networkMissing.push(key);
    }
  }
  cacheReadMs = performance.now() - cacheReadStarted - cacheParseMs;
  if (cacheHits > 0) {
    setStatus(`Loaded ${completed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
    updateMetrics();
  }

  for (let i = 0; i < networkMissing.length;) {
    if (generation !== loadGeneration) return;
    const batch = networkMissing.slice(i, i + TERRAIN_BATCH_SIZE);
    i += batch.length;
    const results = await loadChunkBatch(world, batch, generation);
    for (const result of results) {
      if (generation !== loadGeneration) return;
      completed++;
      if (!result.ok) {
        failed++;
      }
    }
    setStatus(`Loaded ${completed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
    updateMetrics();
  }

  activeCenterId = centerKey;
  requestedCenterId = null;
  updateMapTileLayer(centerX, centerZ, radius);
  updateMetrics();
  setStatus(failed === 0
    ? `Loaded ${needed.length} chunks around ${centerX}, ${centerZ}`
    : `Loaded ${needed.length - failed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
  logClientTiming('grid_load', gridStarted, {
    world,
    centerX,
    centerZ,
    radius,
    needed: needed.length,
    alreadyLoaded: needed.length - missing.length,
    cacheHits,
    cacheMisses,
    networkChunks: networkMissing.length,
    failed,
    cacheReadMs: Math.round(cacheReadMs),
    cacheParseMs: Math.round(cacheParseMs),
  });
}

async function loadChunk(world, chunkX, chunkZ, generation) {
  const url = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb`;
  const started = performance.now();
  const gltf = await loadGltfWithRetry(url);
  if (generation !== loadGeneration) return false;
  addChunkObject(world, chunkX, chunkZ, gltf.scene);
  logClientTiming('terrain_single_load', started, { world, chunkX, chunkZ });
  return true;
}

async function loadChunkBatch(world, keys, generation) {
  if (keys.length === 0) return [];
  const started = performance.now();
  let fetchMs = 0;
  let jsonMs = 0;
  let decodeMs = 0;
  let parseMs = 0;
  let cacheWriteAttempts = 0;
  let base64Bytes = 0;
  try {
    const response = await fetch('/api/terrain/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world,
          chunks: keys.map((key) => ({ chunkX: key.chunkX, chunkZ: key.chunkZ })),
        }),
    });
    fetchMs = performance.now() - started;
    if (!response.ok) {
      throw new Error(`Batch terrain request failed: ${response.status}`);
    }

    const jsonStarted = performance.now();
    const data = await response.json();
    jsonMs = performance.now() - jsonStarted;
    const results = [];
    const cacheSummary = { generated: 0, disk: 0, memory: 0, other: 0 };
    for (const chunk of data.chunks ?? []) {
      if (generation !== loadGeneration) return results;
      if (chunk.ok && chunk.base64) {
        const source = chunk.cache ?? 'other';
        if (source in cacheSummary) {
          cacheSummary[source]++;
        } else {
          cacheSummary.other++;
        }
        base64Bytes += chunk.base64.length;
        const decodeStarted = performance.now();
        const bytes = base64ToArrayBuffer(chunk.base64);
        decodeMs += performance.now() - decodeStarted;
        cacheWriteAttempts++;
        writeTerrainCache(terrainCacheKey(world, chunk.chunkX, chunk.chunkZ), bytes.slice(0), {
          source,
          columns: chunk.columns,
          vertices: chunk.vertices,
          triangles: chunk.triangles,
          details: chunk.details,
        });
        const parseStarted = performance.now();
        const gltf = await parseGltfBytes(bytes);
        parseMs += performance.now() - parseStarted;
        if (generation !== loadGeneration) return results;
        addChunkObject(world, chunk.chunkX, chunk.chunkZ, gltf.scene);
        results.push({ ok: true, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
      } else {
        console.warn(`Failed to load chunk ${chunk.chunkX},${chunk.chunkZ}: ${chunk.error ?? 'unknown error'}`);
        results.push({ ok: false, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
      }
    }
    logClientTiming('terrain_batch_load', started, {
      world,
      requested: keys.length,
      ok: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      fetchMs: Math.round(fetchMs),
      jsonMs: Math.round(jsonMs),
      decodeMs: Math.round(decodeMs),
      parseMs: Math.round(parseMs),
      payloadKB: Math.round(base64Bytes / 1024),
      generated: cacheSummary.generated,
      disk: cacheSummary.disk,
      memory: cacheSummary.memory,
      cacheWrites: cacheWriteAttempts,
    });
    return results;
  } catch (error) {
    console.warn('Batch terrain request failed, falling back to single chunk requests', error);
    logClientEvent('terrain_batch_failed', {
      world,
      requested: keys.length,
      fetchMs: Math.round(fetchMs),
      jsonMs: Math.round(jsonMs),
      error: error?.message ?? error,
    });
    return await Promise.all(keys.map(async (key) => {
      try {
        return {
          ok: await loadChunk(world, key.chunkX, key.chunkZ, generation),
          chunkX: key.chunkX,
          chunkZ: key.chunkZ,
        };
      } catch (chunkError) {
        console.warn(`Failed to load chunk ${key.chunkX},${key.chunkZ}`, chunkError);
        return { ok: false, chunkX: key.chunkX, chunkZ: key.chunkZ };
      }
    }));
  }
}

function addChunkObject(world, chunkX, chunkZ, object) {
  object.position.set(chunkX * 32, 0, chunkZ * 32);
  prepareWaterMaterials(object);
  tintWaterMaterialsFromMap(object, sampleMapBackdropColor);
  applyWaterModeToObject(object, waterModeInput.value);
  const lightingOptions = currentLightingOptions();
  applyLightingToObject(object, lightingOptions);
  const shade = createTreeShadeObject(object, lightingOptions);
  if (shade) {
    object.add(shade);
  }
  const debug = createChunkDebug(chunkX, chunkZ, object);
  debug.visible = debugBoundsInput.checked;
  object.add(debug);
  scene.add(object);
  loadedChunks.set(chunkId(world, chunkX, chunkZ), {
    world,
    chunkX,
    chunkZ,
    object,
    debug,
    shade,
  });
  updateMapTileLayer();
}

async function parseGltfBytes(arrayBuffer) {
  return await loader.parseAsync(arrayBuffer, '');
}

async function loadGltfWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await loader.loadAsync(url);
    } catch (error) {
      lastError = error;
      await delay(150 * attempt);
    }
  }
  throw lastError;
}

function chunkKeys(centerX, centerZ, radius) {
  const keys = [];
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const chunkX = centerX + dx;
      const chunkZ = centerZ + dz;
      keys.push({
        chunkX,
        chunkZ,
        distance: Math.abs(dx) + Math.abs(dz),
        id: chunkId(worldSelect.value, chunkX, chunkZ),
      });
    }
  }
  return keys.sort((a, b) => a.distance - b.distance || a.chunkZ - b.chunkZ || a.chunkX - b.chunkX);
}

function retainOnly(world, needed) {
  const keep = new Set(needed.map((key) => key.id));
  for (const [id, entry] of loadedChunks) {
    if (entry.world !== world || !keep.has(id)) {
      disposeChunk(id, entry);
    }
  }
}

function disposeChunk(id, entry) {
  scene.remove(entry.object);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  entry.object.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) textures.add(value);
        }
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  disposalStats.chunks++;
  disposalStats.geometries += geometries.size;
  disposalStats.materials += materials.size;
  disposalStats.textures += textures.size;
  loadedChunks.delete(id);
  updateMapTileLayer();
  updateMetrics();
}

function collectResourceStats() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let meshes = 0;
  let triangles = 0;

  for (const entry of loadedChunks.values()) {
    entry.object.traverse((object) => {
      if (object.isMesh) meshes++;
      if (object.geometry) {
        geometries.add(object.geometry);
        const position = object.geometry.getAttribute('position');
        const triangleCount = object.geometry.index
          ? object.geometry.index.count / 3
          : (position?.count ?? 0) / 3;
        triangles += Math.floor(triangleCount);
      }
      if (object.material) {
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of objectMaterials) {
          materials.add(material);
          for (const value of Object.values(material)) {
            if (value?.isTexture) textures.add(value);
          }
        }
      }
    });
  }

  return {
    meshes,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
    triangles,
  };
}

function applyWaterMode() {
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
    applyWaterModeToObject(entry.object, waterModeInput.value);
  }
}

function terrainCacheKey(world, chunkX, chunkZ) {
  return makeTerrainCacheKey({
    world,
    chunkX,
    chunkZ,
    formatVersion: terrainFormatVersion,
    detailsEnabled: experimentalDetailsEnabled,
  });
}

function applyMapWaterTint() {
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
  }
}

function updateMapTileLayer(centerX = Number.parseInt(chunkXInput.value, 10), centerZ = Number.parseInt(chunkZInput.value, 10)) {
  grid.visible = !mapTilesInput.checked;
  updateMapBackdrop(scene, renderer, {
    enabled: mapTilesInput.checked,
    world: worldSelect.value,
    centerX,
    centerZ,
    meshRadius: Math.max(0, numberOr(Number.parseInt(radiusInput.value, 10), 0)),
    coveredChunks: mapCoveredChunks(worldSelect.value),
  });
  updateMetrics();
}

function mapCoveredChunks(world) {
  const covered = new Set();
  for (const entry of loadedChunks.values()) {
    if (entry.world === world && entry.object?.parent === scene) {
      covered.add(`${entry.chunkX}:${entry.chunkZ}`);
    }
  }
  return covered;
}

function applyLighting() {
  const options = currentLightingOptions();
  applyLightingEnvironment(scene, renderer, lightingRig, options);
  for (const entry of loadedChunks.values()) {
    applyLightingToObject(entry.object, options);
    updateTreeShadeObject(entry.shade, options);
  }
}

function updateTimeRibbon() {
  if (!worldTime) {
    timeCycleLabelEl.value = '--:--';
    renderSky(0.5);
    return;
  }

  const progress = normalizedProgress(worldTime.dayProgress);
  const totalMinutes = Math.floor(progress * 24 * 60);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const phase = typeof worldTime.phase === 'string' && worldTime.phase.length > 0
    ? worldTime.phase.replace(/_/g, ' ')
    : 'cycle';
  timeCycleLabelEl.value = `${pad2(hour)}:${pad2(minute)} ${phase}`;
  renderSky(progress);
}

// Sky palette keyframes sampled from the in-game references (deep-navy night, peach dawn,
// vivid teal-blue noon, fiery dusk). Each entry is [progress, topRGB, bottomRGB].
const SKY_KEYFRAMES = [
  { p: 0.00, top: [12, 18, 46], bottom: [26, 32, 70] },
  { p: 0.20, top: [40, 54, 110], bottom: [120, 80, 120] },
  { p: 0.27, top: [70, 96, 175], bottom: [243, 170, 135] },
  { p: 0.34, top: [78, 152, 212], bottom: [205, 234, 240] },
  { p: 0.50, top: [46, 142, 216], bottom: [208, 240, 244] },
  { p: 0.66, top: [78, 152, 212], bottom: [205, 234, 240] },
  { p: 0.73, top: [86, 70, 150], bottom: [240, 118, 64] },
  { p: 0.80, top: [44, 42, 104], bottom: [120, 70, 120] },
  { p: 0.90, top: [16, 22, 54], bottom: [30, 36, 76] },
  { p: 1.00, top: [12, 18, 46], bottom: [26, 32, 70] },
];

function renderSky(progress) {
  const { top, bottom } = skyColors(progress);
  skySceneEl.style.background = `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;

  const day = dayFactor(progress);
  placeSkyBody(skySunEl, (progress - 0.25) / 0.5, day);
  const moonProgress = progress >= 0.5 ? progress : progress + 1;
  placeSkyBody(skyMoonEl, (moonProgress - 0.75) / 0.5, 1 - day);
  skyStarsEl.style.opacity = (1 - day).toFixed(3);
}

function skyColors(progress) {
  let lo = SKY_KEYFRAMES[0];
  let hi = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];
  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    if (progress >= SKY_KEYFRAMES[i].p && progress <= SKY_KEYFRAMES[i + 1].p) {
      lo = SKY_KEYFRAMES[i];
      hi = SKY_KEYFRAMES[i + 1];
      break;
    }
  }
  const t = (progress - lo.p) / (hi.p - lo.p || 1);
  return { top: lerpColor(lo.top, hi.top, t), bottom: lerpColor(lo.bottom, hi.bottom, t) };
}

// Position a celestial body along its horizon-to-horizon arc; t in [0,1], clamped.
function placeSkyBody(el, t, opacity) {
  const clamped = Math.max(0, Math.min(1, t));
  const arc = Math.sin(clamped * Math.PI);
  el.style.left = `${6 + clamped * 88}%`;
  el.style.top = `${78 - arc * 62}%`;
  el.style.opacity = opacity.toFixed(3);
}

// 0 at night, 1 in full day, smooth across dawn (~0.25) and dusk (~0.75).
function dayFactor(progress) {
  return Math.min(smoothstep(0.21, 0.30, progress), 1 - smoothstep(0.70, 0.79, progress));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpColor(a, b, t) {
  const channel = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function normalizedProgress(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return ((value % 1) + 1) % 1;
}

function pad2(value) {
  return Math.max(0, Math.min(99, Math.floor(value))).toString().padStart(2, '0');
}

async function refreshWorldTime() {
  if (!worldSelect.value) {
    return;
  }
  try {
    const response = await fetch(`/api/time/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Time request failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.ok) {
      worldTime = data;
      applyLighting();
      updateTimeRibbon();
    }
  } catch (error) {
    console.warn('World time refresh failed', error);
    logClientEvent('world_time_refresh_failed', { error: error?.message ?? error });
  }
}

function worldTimePollDelayMs() {
  if (mapTimeInput.checked) {
    return MAP_TIME_ACTIVE_POLL_MS;
  }
  return lastPlayerCount > 0 ? MAP_TIME_VISIBLE_POLL_MS : MAP_TIME_IDLE_POLL_MS;
}

function restartWorldTimePolling(delayMs = worldTimePollDelayMs()) {
  clearTimeout(timePollTimer);
  timePollTimer = setTimeout(async () => {
    await refreshWorldTime();
    restartWorldTimePolling();
  }, delayMs);
}

async function refreshPlayers() {
  if (!worldSelect.value || isRefreshingPlayers) {
    return;
  }
  isRefreshingPlayers = true;
  try {
    const response = await fetch(`/api/players/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Player request failed: ${response.status}`);
    }
    const data = await response.json();
    lastPlayerPollFailed = false;
    updatePlayers(data.players ?? []);
  } catch (error) {
    lastPlayerPollFailed = true;
    console.warn('Player refresh failed', error);
    logClientEvent('player_refresh_failed', { error: error?.message ?? error });
  } finally {
    isRefreshingPlayers = false;
  }
}

function playerUpdateRateMs() {
  const parsed = Number.parseInt(playerUpdateRateInput.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYER_UPDATE_RATE_MS;
}

function playerPollDelayMs() {
  if (lastPlayerPollFailed) {
    return PLAYER_POLL_ERROR_MS;
  }
  if (!showPlayersInput.checked) {
    return HIDDEN_PLAYER_POLL_MS;
  }
  if (lastPlayerCount <= 0) {
    return EMPTY_PLAYER_POLL_MS;
  }
  const requestedRate = playerUpdateRateMs();
  return viewPlayerUuid || followPlayerUuid
    ? Math.max(requestedRate, FOCUSED_PLAYER_POLL_MIN_MS)
    : requestedRate;
}

function restartPlayerPolling(delayMs = playerPollDelayMs()) {
  clearTimeout(playerPollTimer);
  if (entityStreamConnected) return;
  playerPollTimer = setTimeout(async () => {
    await refreshPlayers();
    restartPlayerPolling();
  }, delayMs);
}

async function refreshMobs() {
  if (!worldSelect.value || !showMobsInput.checked || isRefreshingMobs) {
    return;
  }
  isRefreshingMobs = true;
  try {
    const response = await fetch(`/api/mobs/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Mob request failed: ${response.status}`);
    }
    const data = await response.json();
    lastMobPollFailed = false;
    lastMobSourceStats = data.sourceStats ?? null;
    updateMobs(data.mobs ?? []);
  } catch (error) {
    lastMobPollFailed = true;
    console.warn('Mob refresh failed', error);
    logClientEvent('mob_refresh_failed', { error: error?.message ?? error });
  } finally {
    isRefreshingMobs = false;
  }
}

function mobPollDelayMs() {
  if (!showMobsInput.checked) {
    return null;
  }
  if (lastMobPollFailed) {
    return MOB_POLL_ERROR_MS;
  }
  return lastMobCount > 0 ? MOB_POLL_MS : EMPTY_MOB_POLL_MS;
}

function restartMobPolling(delayMs = mobPollDelayMs()) {
  clearTimeout(mobPollTimer);
  mobPollTimer = null;
  if (delayMs === null || entityStreamConnected) return;
  mobPollTimer = setTimeout(async () => {
    await refreshMobs();
    restartMobPolling();
  }, delayMs);
}

function wantsEntityStream() {
  return worldSelect.value && (showPlayersInput.checked || showMobsInput.checked);
}

function restartEntityStream() {
  clearTimeout(entityStreamFallbackTimer);
  if (!('EventSource' in window) || !wantsEntityStream()) {
    closeEntityStream();
    restartPlayerPolling();
    restartMobPolling();
    return;
  }

  const includePlayers = showPlayersInput.checked;
  const includeMobs = showMobsInput.checked;
  if (entityStream
      && entityStreamWorld === worldSelect.value
      && entityStreamPlayers === includePlayers
      && entityStreamMobs === includeMobs) {
    return;
  }

  closeEntityStream();
  entityStreamWorld = worldSelect.value;
  entityStreamPlayers = includePlayers;
  entityStreamMobs = includeMobs;
  const params = new URLSearchParams({
    players: includePlayers ? '1' : '0',
    mobs: includeMobs ? '1' : '0',
  });
  entityStream = new EventSource(`/api/entities/stream/${encodeURIComponent(worldSelect.value)}?${params}`);
  entityStream.addEventListener('open', () => {
    entityStreamConnected = true;
    clearTimeout(playerPollTimer);
    clearTimeout(mobPollTimer);
    clearTimeout(entityStreamFallbackTimer);
  });
  entityStream.addEventListener('entities', (event) => {
    entityStreamConnected = true;
    clearTimeout(playerPollTimer);
    clearTimeout(mobPollTimer);
    try {
      applyEntitySnapshot(JSON.parse(event.data));
    } catch (error) {
      console.warn('Entity stream parse failed', error);
      logClientEvent('entity_stream_parse_failed', { error: error?.message ?? error });
    }
  });
  entityStream.addEventListener('error', () => {
    entityStreamConnected = false;
    scheduleEntityFallbackPolling();
  });
}

function closeEntityStream() {
  clearTimeout(entityStreamFallbackTimer);
  if (entityStream) {
    entityStream.close();
  }
  entityStream = null;
  entityStreamWorld = null;
  entityStreamPlayers = null;
  entityStreamMobs = null;
  entityStreamConnected = false;
}

function scheduleEntityFallbackPolling() {
  clearTimeout(entityStreamFallbackTimer);
  entityStreamFallbackTimer = setTimeout(() => {
    if (entityStreamConnected) return;
    restartPlayerPolling(0);
    restartMobPolling(0);
  }, ENTITY_STREAM_FALLBACK_DELAY_MS);
}

function applyEntitySnapshot(snapshot) {
  if (!snapshot?.ok) return;
  if (snapshot.world && snapshot.world !== worldSelect.value) return;
  if (showPlayersInput.checked) {
    updatePlayers(snapshot.players ?? []);
  }
  if (showMobsInput.checked) {
    lastMobSourceStats = snapshot.mobSourceStats ?? null;
    updateMobs(snapshot.mobs ?? []);
  }
}

function updatePlayers(players) {
  const previousPlayerCount = lastPlayerCount;
  lastPlayerCount = players.length;
  if (previousPlayerCount !== lastPlayerCount) {
    logClientEvent('player_count_changed', {
      players: lastPlayerCount,
      nextPollMs: playerPollDelayMs(),
    });
    restartWorldTimePolling();
    if (lastPlayerCount > previousPlayerCount) {
      schedulePlayerConnectMobSample(players);
    }
  }
  const seen = new Set();

  if (!showPlayersInput.checked) {
    playersEl.replaceChildren();
    playersEl.textContent = 'Players hidden';
  } else if (players.length === 0) {
    playersEl.replaceChildren();
    playersEl.textContent = 'No players';
  } else if (playersEl.childNodes.length === 1 && playersEl.firstChild.nodeType === Node.TEXT_NODE) {
    playersEl.replaceChildren();
  }

  let tileIndex = 0;
  for (const player of players) {
    seen.add(player.uuid);
    const existingMarker = playerMarkers.get(player.uuid);
    const markerIsLegacy = existingMarker && !existingMarker.userData.card;
    if (markerIsLegacy) {
      scene.remove(existingMarker);
      disposeObject(existingMarker);
      playerMarkers.delete(player.uuid);
    }
    const marker = playerMarkers.get(player.uuid) ?? createPlayerMarker(player);
    if (!existingMarker || markerIsLegacy) {
      marker.position.set(player.x, player.y, player.z);
      marker.rotation.y = player.yaw ?? 0;
    }
    marker.userData.targetPosition ??= new THREE.Vector3();
    marker.userData.targetPosition.set(player.x, player.y, player.z);
    marker.userData.targetYaw = player.yaw ?? marker.userData.targetYaw ?? 0;
    marker.visible = showPlayersInput.checked;
    marker.userData.player = player;
    updatePlayerMarkerCard(marker, player);
    updatePlayerMarkerCardHeight(marker, 4.35);
    playerMarkers.set(player.uuid, marker);
    if (!marker.parent) {
      scene.add(marker);
    }

    if (!showPlayersInput.checked) {
      continue;
    }

    const tile = playerTiles.get(player.uuid) ?? createPlayerTile(player);
    if (!playerTiles.has(player.uuid)) {
      playerTiles.set(player.uuid, tile);
    }
    updatePlayerTile(tile, player);
    ensurePlayerTileOrder(tile.element, tileIndex++);
  }

  for (const [uuid, marker] of playerMarkers) {
    if (!seen.has(uuid)) {
      scene.remove(marker);
      disposeObject(marker);
      playerMarkers.delete(uuid);
      playerTiles.get(uuid)?.element.remove();
      playerTiles.delete(uuid);
      if (viewPlayerUuid === uuid) {
        popCameraMode();
      }
      if (followPlayerUuid === uuid) {
        popCameraMode();
      }
    }
  }

  updateEntityVisibility();
}

function ensurePlayerTileOrder(tileElement, index) {
  const current = playersEl.children[index] ?? null;
  if (current === tileElement) {
    return;
  }
  if (tileElement.parentElement !== playersEl) {
    playersEl.insertBefore(tileElement, current);
    return;
  }
  playersEl.insertBefore(tileElement, current);
}

function schedulePlayerConnectMobSample(players) {
  if (!worldSelect.value || !showMobsInput.checked) return;
  clearTimeout(playerConnectMobSampleTimer);
  const sampledPlayers = players.map((player) => compactObject({
    uuid: player.uuid,
    name: player.name,
    x: roundCoord(player.x),
    y: roundCoord(player.y),
    z: roundCoord(player.z),
  }));
  playerConnectMobSampleTimer = setTimeout(() => {
    sampleMobFeedOnPlayerConnect(sampledPlayers);
  }, PLAYER_CONNECT_MOB_SAMPLE_DELAY_MS);
}

async function sampleMobFeedOnPlayerConnect(players) {
  const world = worldSelect.value;
  if (!world || !showMobsInput.checked) return;
  try {
    const response = await fetch(`/api/mobs/${encodeURIComponent(world)}`);
    if (!response.ok) {
      throw new Error(`Mob sample request failed: ${response.status}`);
    }
    const data = await response.json();
    const mobs = Array.isArray(data.mobs) ? data.mobs : [];
    logClientEvent('mob_connect_sample', {
      world,
      players: players.length,
      player: players[0] ?? null,
      mobs: mobs.length,
      types: summarizeItems(mobs, (mob) => mob.type ?? mob.label ?? 'Mob'),
      categories: summarizeItems(mobs, (mob) => mob.category ?? 'unknown'),
      sources: summarizeItems(mobs, (mob) => mob.source ?? 'unknown'),
      sourceStats: compactMobSourceStats(data.sourceStats),
      nearest: nearestMobsForSample(mobs, players[0], 12),
    });
  } catch (error) {
    logClientEvent('mob_connect_sample_failed', { error: error?.message ?? error });
  }
}

function summarizeItems(items, selector, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const key = String(selector(item) ?? 'unknown');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join('|');
}

function compactMobSourceStats(stats) {
  if (!stats || typeof stats !== 'object') return null;
  return compactObject({
    source: stats.source,
    chunks: stats.chunks,
    accepted: stats.accepted,
    duplicate: stats.duplicate,
    outsideRadar: stats.outsideRadar,
    nonMob: stats.nonMob,
    skippedTypes: summarizeCountsObject(stats.skippedTypes, 8),
  });
}

function summarizeCountsObject(countsObject, limit = 10) {
  return Object.entries(countsObject ?? {})
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join('|');
}

function nearestMobsForSample(mobs, player, limit) {
  return mobs
    .map((mob) => ({
      mob,
      distance: distanceBetween(mob, player),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ mob, distance }) => compactObject({
      type: mob.type,
      label: mob.label,
      category: mob.category,
      source: mob.source,
      x: roundCoord(mob.x),
      y: roundCoord(mob.y),
      z: roundCoord(mob.z),
      d: Number.isFinite(distance) ? Math.round(distance) : null,
    }));
}

function distanceBetween(a, b) {
  if (![a?.x, a?.y, a?.z, b?.x, b?.y, b?.z].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function roundCoord(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function compactObject(object) {
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

function updateMobs(mobs) {
  if (!showMobsInput.checked && mobs.length > 0) {
    return;
  }
  const previousMobCount = lastMobCount;
  lastMobCount = mobs.length;
  if (previousMobCount !== lastMobCount) {
    logClientEvent('mob_count_changed', {
      mobs: lastMobCount,
      nextPollMs: mobPollDelayMs(),
    });
  }

  const seen = new Set();
  for (const mob of mobs) {
    const id = String(mob.id ?? `${mob.type}:${mob.x}:${mob.y}:${mob.z}`);
    const enrichedMob = enrichMob(mob, id);
    seen.add(id);
    const marker = mobMarkers.get(id) ?? createMobMarker(enrichedMob);
    if (!mobMarkers.has(id)) {
      marker.position.set(mob.x, mob.y, mob.z);
    }
    marker.userData.targetPosition ??= new THREE.Vector3();
    marker.userData.targetPosition.set(mob.x, mob.y, mob.z);
    marker.userData.mob = enrichedMob;
    updateMobMarkerCard(marker, enrichedMob);
    marker.visible = showMobsInput.checked;
    mobMarkers.set(id, marker);
    if (!marker.parent) {
      scene.add(marker);
    }
  }

  for (const [id, marker] of mobMarkers) {
    if (!seen.has(id)) {
      scene.remove(marker);
      disposeObject(marker);
      mobMarkers.delete(id);
    }
  }

  updateEntityVisibility();
}

function clearMobs() {
  updateMobs([]);
  lastMobPollFailed = false;
  lastMobSourceStats = null;
}

function createPlayerTile(player) {
  const tile = document.createElement('div');
  tile.className = 'player-tile';

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'player-tile-main';
  main.title = 'Move camera to player';
  main.addEventListener('click', () => focusPlayer(player.uuid));

  const avatar = document.createElement('span');
  avatar.className = 'player-avatar';

  const name = document.createElement('span');
  name.className = 'player-name';
  main.append(avatar, name);

  const actions = document.createElement('div');
  actions.className = 'player-actions';

  const eyeButton = document.createElement('button');
  eyeButton.type = 'button';
  eyeButton.className = `player-icon-button${viewPlayerUuid === player.uuid ? ' active' : ''}`;
  eyeButton.textContent = '\u{1F441}\uFE0F';
  eyeButton.title = 'Attach camera to player view';
  eyeButton.setAttribute('aria-label', 'Attach camera to player view');
  eyeButton.setAttribute('aria-pressed', String(viewPlayerUuid === player.uuid));
  eyeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setPlayerEyeView(viewPlayerUuid === player.uuid ? null : player.uuid);
  });

  const walkButton = document.createElement('button');
  walkButton.type = 'button';
  walkButton.className = `player-icon-button${followPlayerUuid === player.uuid ? ' active' : ''}`;
  walkButton.textContent = '\u{1F6B6}';
  walkButton.title = 'Follow player from isometric view';
  walkButton.setAttribute('aria-label', 'Follow player from isometric view');
  walkButton.setAttribute('aria-pressed', String(followPlayerUuid === player.uuid));
  walkButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setPlayerFollow(followPlayerUuid === player.uuid ? null : player.uuid);
  });

  actions.append(eyeButton, walkButton);
  tile.append(main, actions);
  return {
    element: tile,
    avatar,
    avatarUrl: null,
    avatarImage: null,
    name,
    eyeButton,
    walkButton,
  };
}

function updatePlayerTile(tile, player) {
  const initials = playerInitials(player.name);
  if (tile.avatar.firstChild?.nodeType === Node.TEXT_NODE) {
    tile.avatar.firstChild.nodeValue = initials;
  } else {
    tile.avatar.prepend(document.createTextNode(initials));
  }
  const avatarUrl = player.avatarUrl ?? playerAvatarUrl(player);
  if (avatarUrl && avatarUrl !== tile.avatarUrl) {
    tile.avatarUrl = avatarUrl;
    tile.avatar.classList.remove('loaded');
    tile.avatarImage?.remove();
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'lazy';
    image.src = avatarUrl;
    image.addEventListener('load', () => tile.avatar.classList.add('loaded'));
    image.addEventListener('error', () => {
      image.remove();
      if (tile.avatarImage === image) {
        tile.avatarImage = null;
      }
      tile.avatar.classList.remove('loaded');
    });
    tile.avatarImage = image;
    tile.avatar.append(image);
  } else if (!avatarUrl && tile.avatarUrl) {
    tile.avatarUrl = null;
    tile.avatarImage?.remove();
    tile.avatarImage = null;
    tile.avatar.classList.remove('loaded');
  }
  tile.name.textContent = player.name;
  tile.eyeButton.classList.toggle('active', viewPlayerUuid === player.uuid);
  tile.eyeButton.setAttribute('aria-pressed', String(viewPlayerUuid === player.uuid));
  tile.walkButton.classList.toggle('active', followPlayerUuid === player.uuid);
  tile.walkButton.setAttribute('aria-pressed', String(followPlayerUuid === player.uuid));
}

function playerInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function playerAvatarUrl(player) {
  if (!player?.uuid || !player?.name) return null;
  return `/api/player-avatar/${encodeURIComponent(player.uuid)}.png?name=${encodeURIComponent(player.name)}`;
}

function focusPlayer(uuid) {
  const marker = playerMarkers.get(uuid);
  if (!marker) return;
  const target = marker.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  const offset = new THREE.Vector3(34, 28, 34);
  resetCameraModes();
  controls.target.copy(target);
  camera.position.copy(target).add(offset);
  controls.update();
  syncFlyLookFromCamera();
  saveViewState();
  updatePlayers(currentPlayersFromMarkers());
}

function setPlayerEyeView(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('eye', uuid);
    updateEyeCamera();
  } else if (viewPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

function setPlayerFollow(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('follow', uuid);
  } else if (followPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

function pushCameraMode(mode, uuid) {
  if ((mode === 'eye' && viewPlayerUuid === uuid) || (mode === 'follow' && followPlayerUuid === uuid)) {
    popCameraMode();
    return;
  }

  cameraModeStack.push(captureCameraModeState());
  applyCameraMode(mode, uuid);
}

function popCameraMode() {
  while (cameraModeStack.length > 0) {
    const previous = cameraModeStack.pop();
    if (restoreCameraModeState(previous)) {
      updatePlayers(currentPlayersFromMarkers());
      restartPlayerPolling();
      return;
    }
  }
  resetCameraModes();
}

function currentPlayersFromMarkers() {
  return Array.from(playerMarkers.values()).map((markerEntry) => markerEntry.userData.player).filter(Boolean);
}

function resetCameraModes() {
  cameraModeStack.length = 0;
  viewPlayerUuid = null;
  followPlayerUuid = null;
  controls.enabled = false;
}

function captureCameraModeState() {
  return {
    camera: camera.position.clone(),
    target: controls.target.clone(),
    viewPlayerUuid,
    followPlayerUuid,
    controlsEnabled: false,
  };
}

function restoreCameraModeState(state) {
  if (!state) return false;
  if (state.viewPlayerUuid && !playerMarkers.has(state.viewPlayerUuid)) return false;
  if (state.followPlayerUuid && !playerMarkers.has(state.followPlayerUuid)) return false;

  camera.position.copy(state.camera);
  controls.target.copy(state.target);
  viewPlayerUuid = state.viewPlayerUuid;
  followPlayerUuid = state.followPlayerUuid;
  controls.enabled = false;
  controls.update();
  syncFlyLookFromCamera();
  saveViewState();
  return true;
}

function applyCameraMode(mode, uuid) {
  viewPlayerUuid = mode === 'eye' ? uuid : null;
  followPlayerUuid = mode === 'follow' ? uuid : null;
  controls.enabled = false;
}

function updateDebugBounds() {
  for (const entry of loadedChunks.values()) {
    entry.debug.visible = debugBoundsInput.checked;
  }
}

function setRenderDetailsOpen(open) {
  const isOpen = open === true;
  infoCardEl.classList.toggle('collapsed', !isOpen);
  infoCardHeadEl.setAttribute('aria-expanded', String(isOpen));
  infoCardHeadEl.title = isOpen ? 'Hide render details' : 'Show render details';
}

function toggleRenderDetails() {
  setRenderDetailsOpen(infoCardEl.classList.contains('collapsed'));
  saveViewState();
}

function updateEntityVisibility() {
  for (const marker of playerMarkers.values()) {
    marker.visible = showPlayersInput.checked;
  }
  for (const marker of mobMarkers.values()) {
    marker.visible = showMobsInput.checked;
  }
  if (!showPlayersInput.checked) {
    playersEl.textContent = 'Players hidden';
  }
}

function exposeDebugState() {
  window.__synthWorldviewDebug = {
    fpsCounter,
    loadedChunks,
    playerMarkers,
    playerTiles,
    mobMarkers,
    entityStreamState: () => ({
      connected: entityStreamConnected,
      world: entityStreamWorld,
      players: entityStreamPlayers,
      mobs: entityStreamMobs,
      available: 'EventSource' in window,
    }),
    npcDetailsState: () => ({
      loaded: npcDetailsLoaded,
      entries: npcDetailsById.size,
      aliases: npcDetailsAliases.size,
    }),
    loadGrid: (options = {}) => loadGrid(options),
    mapBackdropStats,
    terrainFormatVersion: () => terrainFormatVersion,
    activeCenterId: () => activeCenterId,
    requestedCenterId: () => requestedCenterId,
    updatePlayersForTest: (players) => updatePlayers(players),
    updateMobsForTest: (mobs) => updateMobs(mobs),
    waterMaterialSummary: () => waterMaterialSummary(),
    cameraPose: () => ({
      camera: vectorState(camera.position),
      target: vectorState(controls.target),
      fov: camera.fov,
    }),
    streamAnchorChunk: () => playerChunk(),
    skySummary: () => ({
      background: displayColor(scene.background),
      fogType: scene.fog?.isFogExp2 ? 'FogExp2' : (scene.fog?.isFog ? 'Fog' : null),
      fogNear: scene.fog?.near ?? null,
      fogFar: scene.fog?.far ?? null,
      fogDensity: scene.fog?.density ?? null,
      fogColor: displayColor(scene.fog?.color),
      starsVisible: lightingRig.stars.visible === true,
      skyVisible: lightingRig.sky.visible === true,
    }),
    lightingSummary: () => ({
      ambientIntensity: lightingRig.ambient.intensity,
      sunIntensity: lightingRig.sun.intensity,
      starsOpacity: lightingRig.stars.material.opacity,
    }),
    setWorldTimeForTest: (time) => {
      worldTime = time;
      mapTimeInput.checked = true;
      applyLighting();
      updateTimeRibbon();
    },
    flyLook: () => ({
      yaw: flyYaw,
      pitch: flyPitch,
      pointerLocked: isFlyLookActive(),
    }),
    applyFlyLookDelta: (movementX, movementY) => {
      flyYaw -= Number(movementX) * FLY_MOUSE_SENSITIVITY;
      flyPitch -= Number(movementY) * FLY_MOUSE_SENSITIVITY;
      applyFlyLook();
    },
    zoomFlyView: (deltaY) => {
      zoomFlyView(Number(deltaY));
    },
    setCameraPose: ({ camera: cameraState, target: targetState, lookAt }) => {
      if (isVectorState(cameraState)) {
        camera.position.set(cameraState.x, cameraState.y, cameraState.z);
      }
      if (isVectorState(targetState)) {
        controls.target.set(targetState.x, targetState.y, targetState.z);
      }
      controls.update();
      if (isVectorState(lookAt)) {
        camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
      }
      syncFlyLookFromCamera();
    },
  };
}

function waterMaterialSummary() {
  const summaries = [];
  for (const entry of loadedChunks.values()) {
    entry.object.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.name !== 'worldview-water' && material?.userData?.worldviewWater !== true) continue;
        summaries.push({
          type: material.type,
          vertexColors: material.vertexColors === true,
          toneMapped: material.toneMapped === true,
          fog: material.fog === true,
          transparent: material.transparent === true,
          opacity: material.opacity,
          color: material.userData?.worldviewWaterColor ? displayColor(material.userData.worldviewWaterColor) : null,
          alpha: material.uniforms?.alpha?.value ?? null,
          time: material.uniforms?.time?.value ?? null,
          waveHeight: material.uniforms?.waveHeight?.value ?? null,
          waveFrequency: material.uniforms?.waveFrequency?.value ?? null,
          shaderMix: material.uniforms?.shaderMix?.value ?? null,
          distortionScale: material.uniforms?.distortionScale?.value ?? null,
          hasNormalSampler: Boolean(material.uniforms?.normalSampler?.value),
          hasReflectionSampler: Boolean(material.uniforms?.reflectionSampler?.value),
        });
      }
    });
  }
  return summaries;
}

function displayColor(color) {
  const srgb = color.clone().convertLinearToSRGB();
  return {
    r: Math.round(srgb.r * 255),
    g: Math.round(srgb.g * 255),
    b: Math.round(srgb.b * 255),
  };
}

function focusGrid(centerX, centerZ, radius) {
  const center = new THREE.Vector3(centerX * 32 + 16, 122, centerZ * 32 + 16);
  camera.position.set(center.x, center.y + 58, center.z);
  controls.target.copy(center);
  camera.lookAt(center);
  controls.update();
  syncFlyLookFromCamera();
  updateFlyTarget();
  saveViewState();
}

function restoreCameraPose() {
  if (!storedViewState || hasExplicitViewParams()) {
    return false;
  }
  const cameraState = storedViewState.camera;
  const targetState = storedViewState.target;
  if (!isVectorState(cameraState) || !isVectorState(targetState)) {
    return false;
  }

  camera.position.set(cameraState.x, cameraState.y, cameraState.z);
  controls.target.set(targetState.x, targetState.y, targetState.z);
  controls.update();
  syncFlyLookFromCamera();
  hasFocusedInitialGrid = true;
  hasRestoredCameraPose = true;
  return true;
}

function hasExplicitViewParams() {
  return ['world', 'chunkX', 'chunkZ', 'radius'].some((name) => initialParams.has(name));
}

function saveViewState() {
  if (!hasStarted || !worldSelect.value) return;
  const target = controls.target;
  const chunk = playerChunk();
  const state = {
    world: worldSelect.value,
    chunkX: Number.parseInt(chunkXInput.value, 10) || chunk.chunkX,
    chunkZ: Number.parseInt(chunkZInput.value, 10) || chunk.chunkZ,
    radius: Math.max(0, Number.parseInt(radiusInput.value, 10) || 0),
    auto: autoStreamInput.checked,
    bounds: debugBoundsInput.checked,
    players: showPlayersInput.checked,
    mobs: showMobsInput.checked,
    renderDetails: !infoCardEl.classList.contains('collapsed'),
    sun: sunLightingInput.checked,
    shade: treeShadeInput.checked,
    mapTime: mapTimeInput.checked,
    mapTiles: mapTilesInput.checked,
    shadeSize: Number.parseFloat(shadeSizeValueInput.value),
    shadeDarkness: Number.parseFloat(shadeDarknessValueInput.value),
    water: waterModeInput.value,
    shader: shaderEffectInput.value,
    playerRate: playerUpdateRateInput.value,
    camera: vectorState(camera.position),
    target: vectorState(target),
  };
  if (saveStoredViewState(state)) {
    storedViewState = state;
  }
}

function maybeSaveViewState() {
  if (viewPlayerUuid || followPlayerUuid) return;
  const now = performance.now();
  if (now - lastViewStateSave < 500) return;
  lastViewStateSave = now;
  saveViewState();
}

function playerChunk() {
  const anchor = streamAnchorPosition();
  return {
    chunkX: Math.floor(anchor.x / 32),
    chunkZ: Math.floor(anchor.z / 32),
  };
}

function streamAnchorPosition() {
  const focusedMarker = playerMarkers.get(viewPlayerUuid) ?? playerMarkers.get(followPlayerUuid);
  const playerMarker = focusedMarker ?? playerMarkers.values().next().value;
  const targetPosition = playerMarker?.userData?.targetPosition;
  if (targetPosition) {
    return targetPosition;
  }
  if (playerMarker?.position) {
    return playerMarker.position;
  }
  return camera.position;
}

function updateCoordinates() {
  const target = controls.target;
  const chunk = playerChunk();
  coordTargetEl.textContent = `${formatCoord(target.x)}, ${formatCoord(target.y)}, ${formatCoord(target.z)}`;
  coordChunkEl.textContent = `${chunk.chunkX}, ${chunk.chunkZ}`;
  coordCameraEl.textContent = `${formatCoord(camera.position.x)}, ${formatCoord(camera.position.y)}, ${formatCoord(camera.position.z)}`;
}

function updateEmptyGrid() {
  grid.position.set(
    Math.round(camera.position.x / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP,
    EMPTY_GRID_Y,
    Math.round(camera.position.z / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP);
}

function syncFlyLookFromCamera() {
  camera.getWorldDirection(tempCameraForward);
  if (tempCameraForward.lengthSq() < 0.0001) return;
  flyYaw = Math.atan2(-tempCameraForward.x, -tempCameraForward.z);
  flyPitch = Math.asin(Math.max(-1, Math.min(1, tempCameraForward.y)));
}

function applyFlyLook() {
  flyPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, flyPitch));
  tempFlyEuler.set(flyPitch, flyYaw, 0);
  camera.quaternion.setFromEuler(tempFlyEuler);
  updateFlyTarget();
}

function updateFlyTarget() {
  camera.getWorldDirection(tempCameraForward);
  tempCenteredPivot.copy(camera.position).addScaledVector(tempCameraForward, FLY_LOOK_DISTANCE);
  controls.target.copy(tempCenteredPivot);
}

function zoomFlyView(deltaY) {
  if (viewPlayerUuid || !Number.isFinite(deltaY) || deltaY === 0) return;
  camera.getWorldDirection(tempCameraForward);
  if (tempCameraForward.lengthSq() < 0.0001) return;

  const ticks = Math.max(-FLY_ZOOM_MAX_TICKS, Math.min(FLY_ZOOM_MAX_TICKS, deltaY / 100));
  tempFlyZoom.copy(tempCameraForward).multiplyScalar(-ticks * FLY_ZOOM_STEP);
  const nextY = camera.position.y + tempFlyZoom.y;
  if (nextY < FLY_MIN_Y || nextY > FLY_MAX_Y) {
    tempFlyZoom.y = Math.max(FLY_MIN_Y, Math.min(FLY_MAX_Y, nextY)) - camera.position.y;
  }
  camera.position.add(tempFlyZoom);
  updateFlyTarget();
}

function shouldStartFlyLook(event) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey;
}

function isFlyLookActive() {
  return document.pointerLockElement === renderer.domElement;
}

function maybeAutoStream() {
  if (!autoStreamInput.checked || !hasFocusedInitialGrid || !worldSelect.value) return;
  const player = playerChunk();
  const playerId = centerId(worldSelect.value, player.chunkX, player.chunkZ);
  if (playerId === activeCenterId || playerId === requestedCenterId || playerId === scheduledCenterId) return;

  clearTimeout(streamTimer);
  scheduledCenterId = playerId;
  streamTimer = setTimeout(() => {
    scheduledCenterId = null;
    loadGrid({ centerX: player.chunkX, centerZ: player.chunkZ }).catch((error) => setStatus(error.message));
  }, 250);
}

function scheduleControlGridLoad() {
  if (!hasStarted) return;
  clearTimeout(controlLoadTimer);
  controlLoadTimer = setTimeout(() => {
    loadGrid().catch((error) => setStatus(error.message));
    saveViewState();
  }, 350);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  resizePostProcessing(postProcessing, width, height, rendererPixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  positionFpsCounter(fpsCounter);
}

function handleKeyboardNavigation(deltaSeconds) {
  if (viewPlayerUuid || pressedKeys.size === 0 || isTypingInHud()) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  if (forward.lengthSq() < 0.0001) return;
  forward.normalize();

  tempFlyRight.crossVectors(forward, camera.up);
  if (tempFlyRight.lengthSq() < 0.0001) {
    tempFlyRight.set(1, 0, 0);
  } else {
    tempFlyRight.normalize();
  }
  tempFlyMove.set(0, 0, 0);

  if (pressedKeys.has('KeyW')) tempFlyMove.add(forward);
  if (pressedKeys.has('KeyS')) tempFlyMove.sub(forward);
  if (pressedKeys.has('KeyA') || pressedKeys.has('KeyQ')) tempFlyMove.sub(tempFlyRight);
  if (pressedKeys.has('KeyD') || pressedKeys.has('KeyE')) tempFlyMove.add(tempFlyRight);
  if (pressedKeys.has('Space') || pressedKeys.has('KeyR') || pressedKeys.has('PageUp')) tempFlyMove.y += 1;
  if (pressedKeys.has('KeyC') || pressedKeys.has('PageDown')) tempFlyMove.y -= 1;

  if (tempFlyMove.lengthSq() === 0) return;
  tempFlyMove.normalize();

  const boost = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? FLY_SPRINT_MULTIPLIER : 1;
  tempFlyMove.multiplyScalar(FLY_MOVE_SPEED * boost * deltaSeconds);
  camera.position.add(tempFlyMove);
  updateFlyTarget();
}

function updatePlayerMarkers(deltaSeconds) {
  const alpha = 1 - Math.exp(-deltaSeconds * 10);
  for (const marker of playerMarkers.values()) {
    const targetPosition = marker.userData.targetPosition;
    if (targetPosition) {
      marker.position.lerp(targetPosition, alpha);
    }
    const targetYaw = marker.userData.targetYaw;
    if (Number.isFinite(targetYaw)) {
      marker.rotation.y = lerpAngle(marker.rotation.y, targetYaw, alpha);
    }
    const card = marker.userData.card;
    if (card) {
      marker.getWorldQuaternion(tempPlayerParentQuaternion);
      tempPlayerCardQuaternion.copy(tempPlayerParentQuaternion).invert().multiply(camera.quaternion);
      card.quaternion.copy(tempPlayerCardQuaternion);
    }
  }
}

function updateMobMarkers(deltaSeconds, elapsedSeconds) {
  const alpha = 1 - Math.exp(-deltaSeconds * 5);
  const playerHeightSource = playerMarkers.get(viewPlayerUuid) ?? playerMarkers.get(followPlayerUuid);
  const desiredWorldY = playerHeightSource
    ? playerHeightSource.position.y + MOB_CARD_PLAYER_HEIGHT
    : camera.position.y;
  for (const marker of mobMarkers.values()) {
    const targetPosition = marker.userData.targetPosition;
    if (targetPosition) {
      tempMobTarget.copy(targetPosition);
      tempMobTarget.y += 0.25 + Math.sin(elapsedSeconds * 3.2 + marker.name.length) * 0.08;
      marker.position.lerp(tempMobTarget, alpha);
      const cardHeight = clamp(
        desiredWorldY - targetPosition.y,
        MOB_CARD_MIN_HEIGHT,
        MOB_CARD_TREE_TOP_HEIGHT,
      );
      updateMobMarkerHeight(marker, cardHeight);
    }
    const badge = marker.userData.badge;
    if (badge) {
      badge.quaternion.copy(camera.quaternion);
    }
  }
}

function updatePlayerCameraMode(deltaSeconds) {
  if (viewPlayerUuid) {
    updateEyeCamera();
    return;
  }
  if (followPlayerUuid) {
    updateWalkFollowCamera(deltaSeconds);
  }
}

function updateEyeCamera() {
  const marker = playerMarkers.get(viewPlayerUuid);
  if (!marker) {
    setPlayerEyeView(null);
    return;
  }
  tempPlayerCamera.set(0, 2.45, -0.44);
  tempPlayerLook.set(0, 2.45, -12);
  marker.localToWorld(tempPlayerCamera);
  marker.localToWorld(tempPlayerLook);
  camera.position.copy(tempPlayerCamera);
  controls.target.copy(tempPlayerLook);
  camera.lookAt(tempPlayerLook);
}

function updateWalkFollowCamera(deltaSeconds) {
  const marker = playerMarkers.get(followPlayerUuid);
  if (!marker) {
    setPlayerFollow(null);
    return;
  }
  tempPlayerTarget.copy(marker.position);
  tempPlayerTarget.y += 2.1;
  const alpha = 1 - Math.exp(-deltaSeconds * 4.8);
  tempFollowDelta.copy(tempPlayerTarget).sub(controls.target).multiplyScalar(alpha);
  controls.target.add(tempFollowDelta);
  camera.position.add(tempFollowDelta);
}

function lerpAngle(current, target, alpha) {
  const delta = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + delta * alpha;
}

function isTypingInHud() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement
    || active instanceof HTMLSelectElement
    || active instanceof HTMLTextAreaElement;
}

function animate() {
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  const elapsedSeconds = clock.elapsedTime;
  updatePlayerMarkers(deltaSeconds);
  updateMobMarkers(deltaSeconds, elapsedSeconds);
  handleKeyboardNavigation(deltaSeconds);
  updatePlayerCameraMode(deltaSeconds);
  if (!viewPlayerUuid && !followPlayerUuid) {
    updateFlyTarget();
  }
  positionSkyObjects(lightingRig, camera.position);
  updateEmptyGrid();
  updateFpsCounter(fpsCounter, deltaSeconds);
  maybeAutoStream();
  updateCoordinates();
  updateWaterMaterials(scene, renderer, elapsedSeconds, camera);
  renderPostProcessing(postProcessing, renderer, scene, camera, deltaSeconds, elapsedSeconds);
  updateMetrics();
  maybeSaveViewState();
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  if (isTypingInHud()) return;
  if ([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'KeyQ',
    'KeyE',
    'KeyR',
    'KeyC',
    'Space',
    'PageUp',
    'PageDown',
    'ShiftLeft',
    'ShiftRight',
  ].includes(event.code)) {
    event.preventDefault();
    pressedKeys.add(event.code);
  }
});
window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!viewPlayerUuid && shouldStartFlyLook(event)) {
    event.preventDefault();
    renderer.domElement.requestPointerLock?.();
  }
}, { capture: true });
renderer.domElement.addEventListener('wheel', (event) => {
  if (viewPlayerUuid) return;
  event.preventDefault();
  zoomFlyView(event.deltaY);
}, { passive: false });
window.addEventListener('mousemove', (event) => {
  if (!isFlyLookActive() || viewPlayerUuid) return;
  flyYaw -= event.movementX * FLY_MOUSE_SENSITIVITY;
  flyPitch -= event.movementY * FLY_MOUSE_SENSITIVITY;
  applyFlyLook();
});
window.addEventListener('worldview:map-backdrop-loaded', applyMapWaterTint);
debugBoundsInput.addEventListener('change', updateDebugBounds);
debugBoundsInput.addEventListener('change', saveViewState);
showPlayersInput.addEventListener('change', () => {
  updateEntityVisibility();
  restartEntityStream();
  restartPlayerPolling();
  saveViewState();
});
showMobsInput.addEventListener('change', () => {
  clearTimeout(mobPollTimer);
  mobPollTimer = null;
  if (!showMobsInput.checked) {
    clearMobs();
  }
  updateEntityVisibility();
  restartEntityStream();
  if (showMobsInput.checked) {
    restartMobPolling(0);
  }
  saveViewState();
});
waterModeInput.addEventListener('change', () => {
  applyWaterMode();
  saveViewState();
});
playerUpdateRateInput.addEventListener('change', () => {
  restartPlayerPolling();
  saveViewState();
});
shaderEffectInput.addEventListener('change', () => {
  setShaderEffect(postProcessing, shaderEffectInput.value);
  saveViewState();
});
for (const input of [sunLightingInput, treeShadeInput]) {
  const eventName = input.type === 'range' ? 'input' : 'change';
  input.addEventListener(eventName, () => {
    applyLighting();
    saveViewState();
  });
}
mapTimeInput.addEventListener('change', () => {
  applyLighting();
  restartWorldTimePolling();
  saveViewState();
});
mapTilesInput.addEventListener('change', () => {
  updateMapTileLayer();
  saveViewState();
});
syncPairedControl(shadeSizeInput, shadeSizeValueInput);
syncPairedControl(shadeDarknessInput, shadeDarknessValueInput);
worldSelect.addEventListener('change', () => {
  closeEntityStream();
  updatePlayers([]);
  clearMobs();
  restartEntityStream();
  refreshWorldTime();
  restartPlayerPolling();
  restartMobPolling();
  restartWorldTimePolling();
  scheduleControlGridLoad();
  saveViewState();
});
for (const input of [chunkXInput, chunkZInput, radiusInput]) {
  input.addEventListener('input', scheduleControlGridLoad);
  input.addEventListener('change', scheduleControlGridLoad);
}
panelToggle.addEventListener('click', () => {
  const open = hudEl.classList.toggle('open');
  panelToggle.classList.toggle('active', open);
  panelToggle.setAttribute('aria-expanded', String(open));
});
setRenderDetailsOpen(!storedViewState || storedViewState.renderDetails !== false);
infoCardHeadEl.addEventListener('click', toggleRenderDetails);
infoCardHeadEl.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggleRenderDetails();
});
applyInitialParams();
exposeDebugState();
resize();
updateTimeRibbon();
animate();
await loadWorlds();
await loadNpcDetails();
if (worldSelect.value) {
  hasStarted = true;
  const restoredCameraPose = restoreCameraPose();
  await refreshWorldTime();
  await loadGrid({ focus: !restoredCameraPose }).catch((error) => setStatus(error.message));
  restartEntityStream();
  restartPlayerPolling();
  restartMobPolling();
  restartWorldTimePolling();
  saveViewState();
}

function syncPairedControl(rangeInput, numberInput, applyUpdate = applyLighting) {
  rangeInput.addEventListener('input', () => {
    numberInput.value = rangeInput.value;
    applyUpdate();
    saveViewState();
  });
  numberInput.addEventListener('input', () => {
    const parsed = Number.parseFloat(numberInput.value);
    if (Number.isFinite(parsed)) {
      rangeInput.value = normalizePairedValue(rangeInput, parsed);
    }
    applyUpdate();
    saveViewState();
  });
  numberInput.addEventListener('change', () => {
    setPairedControlValue(rangeInput, numberInput, Number.parseFloat(numberInput.value));
    applyUpdate();
    saveViewState();
  });
}
