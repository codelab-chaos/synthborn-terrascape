import * as THREE from 'three';
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
  panelToggle,
  mapTilesInput,
  metricLoadedEl,
  metricMeshesEl,
  metricResourcesEl,
  metricGpuEl,
  metricDisposedEl,
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
import { createFpsCounter, positionFpsCounter, updateFpsCounter } from './fps-counter.js';
import {
  mapBackdropStats,
  updateMapBackdrop,
} from './map-backdrop.js';
import { createPlayerMarker, disposeObject } from './players.js';
import {
  createPostProcessing,
  renderPostProcessing,
  resizePostProcessing,
  setShaderEffect,
} from './postprocessing.js';
import { base64ToArrayBuffer, centerId, chunkId, delay, formatCoord, numberOr } from './utils.js';
import { isVectorState, loadStoredViewState, saveStoredViewState, vectorState } from './view-state.js';
import { applyWaterModeToObject, prepareWaterMaterials } from './water.js';

const SKY_COLOR = 0x173454;
const GRID_AXIS_COLOR = 0x58616a;
const GRID_LINE_COLOR = 0x343b42;
const EMPTY_GRID_SIZE = 1024;
const EMPTY_GRID_DIVISIONS = 128;
const EMPTY_GRID_CHUNK_SNAP = 32;
const EMPTY_GRID_Y = 96;
const TERRAIN_BATCH_SIZE = 8;
const DEFAULT_PLAYER_UPDATE_RATE_MS = 250;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const rendererPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(rendererPixelRatio);
renderer.setClearColor(SKY_COLOR, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 620, 4200);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
camera.position.set(88, 188, 88);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 122, 16);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 18;
controls.maxDistance = 1400;
controls.minPolarAngle = 0.01;
controls.maxPolarAngle = Math.PI - 0.01;
controls.screenSpacePanning = true;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
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
const pressedKeys = new Set();
const clock = new THREE.Clock();
const initialParams = new URLSearchParams(window.location.search);
let experimentalDetailsEnabled = false;
let storedViewState = loadStoredViewState();
let hasRestoredCameraPose = false;
let hasStarted = false;
let lastViewStateSave = 0;
let worldTime = null;
let timePollTimer = null;
let viewPlayerUuid = null;
let followPlayerUuid = null;
const cameraModeStack = [];
let isRefreshingPlayers = false;

const tempPlayerTarget = new THREE.Vector3();
const tempPlayerCamera = new THREE.Vector3();
const tempPlayerLook = new THREE.Vector3();
const tempFollowDelta = new THREE.Vector3();

function currentLightingOptions() {
  return lightingOptionsFromInputs({
    sunLightingInput,
    treeShadeInput,
    shadeSizeInput: shadeSizeValueInput,
    shadeDarknessInput: shadeDarknessValueInput,
    time: worldTime,
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
    + (mapBackdrop.loaded > 0 ? ` · map backdrop ${mapBackdrop.chunks}x${mapBackdrop.chunks}` : '');
  metricMeshesEl.textContent = `${resources.meshes}`;
  metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
  metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
  metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
  metricCenterEl.textContent = center;
}

async function loadWorlds() {
  setStatus('Loading worlds');
  const response = await fetch('/api/worlds');
  const data = await response.json();
  experimentalDetailsEnabled = data.features?.experimentalDetails === true;
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
  applyBooleanParam('sun', sunLightingInput);
  applyBooleanParam('shade', treeShadeInput);
  applyBooleanParam('mapTiles', mapTilesInput);
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
  if (typeof storedViewState.sun === 'boolean') sunLightingInput.checked = storedViewState.sun;
  if (typeof storedViewState.shade === 'boolean') treeShadeInput.checked = storedViewState.shade;
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
  updateMetrics();

  setStatus(`Loading ${needed.length} chunks around ${centerX}, ${centerZ}`);
  let completed = 0;
  let failed = 0;
  const missing = [];
  for (const key of needed) {
    if (generation !== loadGeneration) return;
    if (loadedChunks.has(key.id)) {
      completed++;
    } else {
      missing.push(key);
    }
  }

  for (let i = 0; i < missing.length;) {
    if (generation !== loadGeneration) return;
    const batch = missing.slice(i, i + TERRAIN_BATCH_SIZE);
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
}

async function loadChunk(world, chunkX, chunkZ, generation) {
  const url = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb`;
  const gltf = await loadGltfWithRetry(url);
  if (generation !== loadGeneration) return false;
  addChunkObject(world, chunkX, chunkZ, gltf.scene);
  return true;
}

async function loadChunkBatch(world, keys, generation) {
  if (keys.length === 0) return [];
  try {
    const response = await fetch('/api/terrain/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world,
          chunks: keys.map((key) => ({ chunkX: key.chunkX, chunkZ: key.chunkZ })),
        }),
    });
    if (!response.ok) {
      throw new Error(`Batch terrain request failed: ${response.status}`);
    }

    const data = await response.json();
    const results = [];
    for (const chunk of data.chunks ?? []) {
      if (generation !== loadGeneration) return results;
      if (chunk.ok && chunk.base64) {
        const gltf = await parseGltfBytes(base64ToArrayBuffer(chunk.base64));
        if (generation !== loadGeneration) return results;
        addChunkObject(world, chunk.chunkX, chunk.chunkZ, gltf.scene);
        results.push({ ok: true, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
      } else {
        console.warn(`Failed to load chunk ${chunk.chunkX},${chunk.chunkZ}: ${chunk.error ?? 'unknown error'}`);
        results.push({ ok: false, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
      }
    }
    return results;
  } catch (error) {
    console.warn('Batch terrain request failed, falling back to single chunk requests', error);
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
  loadedChunks.set(chunkId(world, chunkX, chunkZ), { world, chunkX, chunkZ, object, debug, shade });
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
    applyWaterModeToObject(entry.object, waterModeInput.value);
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
  });
  updateMetrics();
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
  }
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
    updatePlayers(data.players ?? []);
  } catch (error) {
    console.warn('Player refresh failed', error);
  } finally {
    isRefreshingPlayers = false;
  }
}

function playerUpdateRateMs() {
  const parsed = Number.parseInt(playerUpdateRateInput.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYER_UPDATE_RATE_MS;
}

function restartPlayerPolling() {
  clearInterval(playerPollTimer);
  playerPollTimer = setInterval(refreshPlayers, playerUpdateRateMs());
}

function updatePlayers(players) {
  const seen = new Set();
  playersEl.replaceChildren();

  if (!showPlayersInput.checked) {
    playersEl.textContent = 'Players hidden';
  } else if (players.length === 0) {
    playersEl.textContent = 'No players';
  }

  for (const player of players) {
    seen.add(player.uuid);
    const marker = playerMarkers.get(player.uuid) ?? createPlayerMarker(player);
    if (!playerMarkers.has(player.uuid)) {
      marker.position.set(player.x, player.y, player.z);
      marker.rotation.y = player.yaw ?? 0;
    }
    marker.userData.targetPosition ??= new THREE.Vector3();
    marker.userData.targetPosition.set(player.x, player.y, player.z);
    marker.userData.targetYaw = player.yaw ?? marker.userData.targetYaw ?? 0;
    marker.visible = showPlayersInput.checked;
    marker.userData.player = player;
    playerMarkers.set(player.uuid, marker);
    if (!marker.parent) {
      scene.add(marker);
    }

    if (!showPlayersInput.checked) {
      continue;
    }

    playersEl.append(createPlayerTile(player));
  }

  for (const [uuid, marker] of playerMarkers) {
    if (!seen.has(uuid)) {
      scene.remove(marker);
      disposeObject(marker);
      playerMarkers.delete(uuid);
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

function createPlayerTile(player) {
  const tile = document.createElement('div');
  tile.className = 'player-tile';

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'player-tile-main';
  main.textContent = player.name;
  main.title = 'Move camera to player';
  main.addEventListener('click', () => focusPlayer(player.uuid));

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
  return tile;
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
  saveViewState();
  updatePlayers(Array.from(playerMarkers.values()).map((markerEntry) => markerEntry.userData.player).filter(Boolean));
}

function setPlayerEyeView(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('eye', uuid);
    updateEyeCamera();
  } else if (viewPlayerUuid) {
    popCameraMode();
  }
  refreshPlayers();
}

function setPlayerFollow(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('follow', uuid);
  } else if (followPlayerUuid) {
    popCameraMode();
  }
  refreshPlayers();
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
      refreshPlayers();
      return;
    }
  }
  resetCameraModes();
}

function resetCameraModes() {
  cameraModeStack.length = 0;
  viewPlayerUuid = null;
  followPlayerUuid = null;
  controls.enabled = true;
}

function captureCameraModeState() {
  return {
    camera: camera.position.clone(),
    target: controls.target.clone(),
    viewPlayerUuid,
    followPlayerUuid,
    controlsEnabled: controls.enabled,
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
  controls.enabled = state.controlsEnabled;
  controls.update();
  saveViewState();
  return true;
}

function applyCameraMode(mode, uuid) {
  viewPlayerUuid = mode === 'eye' ? uuid : null;
  followPlayerUuid = mode === 'follow' ? uuid : null;
  controls.enabled = mode !== 'eye';
}

function updateDebugBounds() {
  for (const entry of loadedChunks.values()) {
    entry.debug.visible = debugBoundsInput.checked;
  }
}

function updateEntityVisibility() {
  for (const marker of playerMarkers.values()) {
    marker.visible = showPlayersInput.checked;
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
  };
}

function focusGrid(centerX, centerZ, radius) {
  const center = new THREE.Vector3(centerX * 32 + 16, 122, centerZ * 32 + 16);
  controls.target.copy(center);
  camera.position.set(center.x + 78, center.y + 58, center.z + 78);
  controls.update();
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
  const chunk = targetChunk();
  const state = {
    world: worldSelect.value,
    chunkX: Number.parseInt(chunkXInput.value, 10) || chunk.chunkX,
    chunkZ: Number.parseInt(chunkZInput.value, 10) || chunk.chunkZ,
    radius: Math.max(0, Number.parseInt(radiusInput.value, 10) || 0),
    auto: autoStreamInput.checked,
    bounds: debugBoundsInput.checked,
    players: showPlayersInput.checked,
    sun: sunLightingInput.checked,
    shade: treeShadeInput.checked,
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

function targetChunk() {
  return {
    chunkX: Math.floor(controls.target.x / 32),
    chunkZ: Math.floor(controls.target.z / 32),
  };
}

function updateCoordinates() {
  const target = controls.target;
  const chunk = targetChunk();
  coordTargetEl.textContent = `${formatCoord(target.x)}, ${formatCoord(target.y)}, ${formatCoord(target.z)}`;
  coordChunkEl.textContent = `${chunk.chunkX}, ${chunk.chunkZ}`;
  coordCameraEl.textContent = `${formatCoord(camera.position.x)}, ${formatCoord(camera.position.y)}, ${formatCoord(camera.position.z)}`;
}

function updateEmptyGrid() {
  grid.position.set(
    Math.round(controls.target.x / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP,
    EMPTY_GRID_Y,
    Math.round(controls.target.z / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP);
}

function maybeAutoStream() {
  if (!autoStreamInput.checked || !hasFocusedInitialGrid || !worldSelect.value) return;
  const target = targetChunk();
  const targetId = centerId(worldSelect.value, target.chunkX, target.chunkZ);
  if (targetId === activeCenterId || targetId === requestedCenterId || targetId === scheduledCenterId) return;

  clearTimeout(streamTimer);
  scheduledCenterId = targetId;
  streamTimer = setTimeout(() => {
    scheduledCenterId = null;
    loadGrid({ centerX: target.chunkX, centerZ: target.chunkZ }).catch((error) => setStatus(error.message));
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
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) return;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const move = new THREE.Vector3();

  if (pressedKeys.has('KeyW')) move.add(forward);
  if (pressedKeys.has('KeyS')) move.sub(forward);
  if (pressedKeys.has('KeyA') || pressedKeys.has('KeyQ')) move.sub(right);
  if (pressedKeys.has('KeyD') || pressedKeys.has('KeyE')) move.add(right);
  if (pressedKeys.has('Space') || pressedKeys.has('KeyR') || pressedKeys.has('PageUp')) move.y += 1;
  if (pressedKeys.has('KeyC') || pressedKeys.has('PageDown')) move.y -= 1;

  if (move.lengthSq() === 0) return;
  move.normalize();

  const boost = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? 3 : 1;
  move.multiplyScalar(72 * boost * deltaSeconds);
  camera.position.add(move);
  controls.target.add(move);
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
  handleKeyboardNavigation(deltaSeconds);
  controls.update();
  updatePlayerCameraMode(deltaSeconds);
  positionSkyObjects(lightingRig, camera.position);
  updateEmptyGrid();
  updateFpsCounter(fpsCounter, deltaSeconds);
  maybeAutoStream();
  updateCoordinates();
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
debugBoundsInput.addEventListener('change', updateDebugBounds);
debugBoundsInput.addEventListener('change', saveViewState);
showPlayersInput.addEventListener('change', () => {
  updateEntityVisibility();
  refreshPlayers();
  saveViewState();
});
waterModeInput.addEventListener('change', () => {
  applyWaterMode();
  saveViewState();
});
playerUpdateRateInput.addEventListener('change', () => {
  restartPlayerPolling();
  refreshPlayers();
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
mapTilesInput.addEventListener('change', () => {
  updateMapTileLayer();
  saveViewState();
});
syncPairedControl(shadeSizeInput, shadeSizeValueInput);
syncPairedControl(shadeDarknessInput, shadeDarknessValueInput);
worldSelect.addEventListener('change', () => {
  updatePlayers([]);
  refreshPlayers();
  refreshWorldTime();
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

applyInitialParams();
exposeDebugState();
resize();
updateTimeRibbon();
animate();
await loadWorlds();
if (worldSelect.value) {
  hasStarted = true;
  const restoredCameraPose = restoreCameraPose();
  await refreshWorldTime();
  await loadGrid({ focus: !restoredCameraPose }).catch((error) => setStatus(error.message));
  await refreshPlayers();
  restartPlayerPolling();
  timePollTimer = setInterval(refreshWorldTime, 5000);
  saveViewState();
}

function syncPairedControl(rangeInput, numberInput) {
  rangeInput.addEventListener('input', () => {
    numberInput.value = rangeInput.value;
    applyLighting();
    saveViewState();
  });
  numberInput.addEventListener('input', () => {
    const parsed = Number.parseFloat(numberInput.value);
    if (Number.isFinite(parsed)) {
      rangeInput.value = normalizePairedValue(rangeInput, parsed);
    }
    applyLighting();
    saveViewState();
  });
  numberInput.addEventListener('change', () => {
    setPairedControlValue(rangeInput, numberInput, Number.parseFloat(numberInput.value));
    applyLighting();
    saveViewState();
  });
}
