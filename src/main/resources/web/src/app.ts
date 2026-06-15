import * as THREE from 'three';
export { createMobMarker, createPlayerMarker, disposeObject, updateMobMarkerHeight } from './players.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createChunkDebug } from './chunk-debug.js';
import { createChunkPlaceholderManager } from './chunk-placeholder.js';
import { createChunkLandMotion } from './library/chunk-land-motion.js';
import { createFrameJankRecorder } from './frame-jank.js';
import { bindAppEvents, isTypingInHud } from './app-events.js';
import { AppRuntimeState } from './app-state.js';
import {
  autoStreamInput,
  canvas,
  chunkXInput,
  chunkZInput,
  coordTargetEl,
  coordChunkEl,
  coordCameraEl,
  clearMeshCacheButton,
  cosmeticBlocksModeInput,
  debugBoundsInput,
  fogEnabledInput,
  fogFarInput,
  fogFarValueInput,
  fogHorizonInput,
  fogHorizonValueInput,
  fogNearInput,
  fogNearValueInput,
  fogStrengthInput,
  fogStrengthValueInput,
  hudEl,
  infoCardEl,
  infoCardHeadEl,
  panelToggle,
  mapTilesInput,
  landMotionInput,
  mapTimeInput,
  metricLoadedEl,
  metricMeshesEl,
  metricResourcesEl,
  metricGpuEl,
  metricDisposedEl,
  metricMobsEl,
  metricCenterEl,
  mobBlocksInput,
  mobBlocksPanelInput,
  playersEl,
  playerUpdateRateInput,
  radiusDiameterEl,
  radiusInput,
  radiusRangeInput,
  shadeDarknessInput,
  shadeDarknessValueInput,
  shadeSizeInput,
  shadeSizeValueInput,
  showPlayersInput,
  showMobsInput,
  statusEl,
  timeCycleLabelEl,
  skySceneEl,
  skySunEl,
  skyMoonEl,
  skyStarsEl,
  terrainLoadSlotsInput,
  terrainLoadSlotsValueInput,
  terrainSpawnBudgetInput,
  terrainSpawnBudgetValueInput,
  terrainSpawnFrameInput,
  terrainSpawnFrameValueInput,
  treeShadeInput,
  visualDetailModeInput,
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
  auditMapTiles,
  configureMapBackdrop,
  loadMapTilesForKeys,
  MAP_HORIZON_MARGIN,
  mapBackdropStats,
  mapTileMotionActive,
  mapTileSceneStats,
  probeMapTilePixel,
  pruneMapTiles,
  sampleMapBackdropColor,
  tickMapTileMotion,
} from './map-backdrop.js';
import {
  horizonMapKeys,
  mapBackdropCenterFrom,
  mapBackdropRetainStats,
  mapTileLayerKey as buildMapTileLayerKey,
} from './map-layer-policy.js';
import { createNpcCatalog } from './npc-catalog.js';
import { createPlayerTile, updatePlayerTile } from './player-tiles.js';
import { chunkKeysForWorld, sortChunkKeysByPlayerDistance } from './chunk-planning.js';
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
  setFogOptions,
} from './postprocessing.js';
import { createTimeRibbon } from './time-ribbon.js';
import { createTerrainStreamStats, terrainStreamSnapshot } from './terrain-stream.js';
import { collectChunkResourceStats, disposeObjectTree } from './resource-stats.js';
import {
  terrainCacheKeyFor,
  terrainCosmeticOverlayCacheKeyFor,
  terrainCosmeticOverlayUrlFor,
  terrainUrlFor,
} from './terrain-requests.js';
import { centerId, chunkId, clamp, delay, formatBytes, formatCoord, numberOr } from './utils.js';
import {
  floatControlValue,
  fogRangeFromControls,
  mapTileRetainRadiusFor,
  radiusReadout,
  safeWaterMode,
  terrainTuningControlValue,
} from './view-preferences.js';
import { isVectorState, loadStoredViewState, saveStoredViewState, vectorState } from './view-state.js';
import {
  applyWaterModeToObject,
  prepareWaterMaterials,
  resolveMapBackdropY,
  tintWaterMaterialsFromMap,
  updateWaterMaterials,
} from './water.js';
import { confirmAction } from './library/confirm-dialog.js';
import {
  compactMobSourceStats,
  compactObject,
  nearestMobsForSample,
  roundCoord,
  summarizeItems,
} from './entity-summary.js';
import {
  liveMobFeedEnabled as computeLiveMobFeedEnabled,
  mobPollDelayMs as computeMobPollDelayMs,
  playerPollDelayMs as computePlayerPollDelayMs,
  positiveIntegerMs,
  wantsEntityStream as computeWantsEntityStream,
  worldTimePollDelayMs as computeWorldTimePollDelayMs,
} from './entity-feed-policy.js';
import {
  applyBooleanParam as applyBooleanControlParam,
  applyFloatParam as applyFloatControlParam,
  applyNumberParam as applyNumberControlParam,
  applySelectParam as applySelectControlParam,
  applySelectValue as applyControlSelectValue,
  isTruthyParam,
  normalizePairedValue,
  setNumberInput,
  setPairedControlValue,
} from './library/control-values.js';
import { clearMeshCache, getMeshCacheStats, readTerrainCache, writeTerrainCache } from './mesh-cache.js';
export * from './library/control-values.js';
export * from './entity-summary.js';
export * from './entity-feed-policy.js';
export * from './chunk-planning.js';
export * from './map-layer-policy.js';
export * from './resource-stats.js';
export * from './terrain-requests.js';
export * from './terrain-stream.js';
export * from './view-preferences.js';

const COSMETIC_MODE_VALUES = ['off', 'baked', 'split'];
const VISUAL_DETAIL_VALUES = ['basic', 'structures', 'all'];
const TRI_STATE_VALUES_BY_ID = {
  'cosmetic-blocks-mode': COSMETIC_MODE_VALUES,
  'visual-detail-mode': VISUAL_DETAIL_VALUES,
};

const SKY_COLOR = 0x173454;
const EMPTY_GRID_AXIS_COLOR = 0x1faa6a;
const EMPTY_GRID_LINE_COLOR = 0x15965a;
const EMPTY_GRID_SIZE = 1024;
const EMPTY_GRID_DIVISIONS = 128;
const EMPTY_GRID_CHUNK_SNAP = 32;
const EMPTY_GRID_Y = 96;
const AUTO_STREAM_DEBOUNCE_MS = 250;
const AUTO_STREAM_RETAIN_MARGIN = 1;
const DEFAULT_TERRAIN_LOAD_CONCURRENCY = 4;
const DEFAULT_TERRAIN_PROMOTION_BUDGET_MS = 4;
const DEFAULT_TERRAIN_PROMOTIONS_PER_FRAME = 2;
const VISUAL_DEFAULTS_VERSION = 2;
const TERRAIN_STREAM_PROGRESS_LOG_MS = 1000;
const METRICS_UPDATE_INTERVAL_MS = 250;

function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}
const DEFAULT_PLAYER_UPDATE_RATE_MS = 1000;
const FOCUSED_PLAYER_POLL_MIN_MS = 1000;
const EMPTY_PLAYER_POLL_MS = 15000;
const HIDDEN_PLAYER_POLL_MS = 30000;
const PLAYER_POLL_ERROR_MS = 10000;
const PLAYER_EYE_ROTATION_LERP = 14;
const MOB_POLL_MS = 5000;
const EMPTY_MOB_POLL_MS = 30000;
const MOB_POLL_ERROR_MS = 15000;
const MOB_MARKER_FRAME_BUDGET_MS = 3;
const MOB_MARKER_UPSERTS_PER_FRAME = 4;
const MOB_MARKER_REMOVALS_PER_FRAME = 96;
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
const MOB_MARKER_FADE_NEAR_DISTANCE = 140;
const MOB_MARKER_FADE_FAR_DISTANCE = 980;
const MOB_MARKER_CARD_MIN_OPACITY = 0.34;
const MOB_MARKER_POINTER_MIN_OPACITY = 0.18;
const MOB_MARKER_GLOW_MIN_OPACITY = 0.1;
const MOB_MARKER_DISTANCE_OPACITY_LERP = 8;
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
scene.fog = null;

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
const FLY_MOUSE_BUTTONS = { ...controls.mouseButtons };
const FOLLOW_MOUSE_BUTTONS = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY,
};

const lightingRig = createLightingRig(scene, SKY_COLOR);
const postProcessing = createPostProcessing(renderer, scene, camera);
const fpsCounter = createFpsCounter(scene, camera, renderer);
const npcCatalog = createNpcCatalog({ logClientEvent });
const timeRibbon = createTimeRibbon({
  labelEl: timeCycleLabelEl,
  sceneEl: skySceneEl,
  sunEl: skySunEl,
  moonEl: skyMoonEl,
  starsEl: skyStarsEl,
});

const grid = new THREE.GridHelper(EMPTY_GRID_SIZE, EMPTY_GRID_DIVISIONS, EMPTY_GRID_AXIS_COLOR, EMPTY_GRID_LINE_COLOR);
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
  material.transparent = true;
  material.opacity = 0.42;
  material.depthTest = true;
  material.depthWrite = false;
}
grid.renderOrder = -50;
scene.add(grid);

const loader = new GLTFLoader();
const chunkPlaceholderManager = createChunkPlaceholderManager(scene);
const chunkLandMotion = createChunkLandMotion();
const frameJank = createFrameJankRecorder();
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
const pressedKeys = new Set();
const clock = new THREE.Clock();
const initialParams = new URLSearchParams(window.location.search);
const runtime = new AppRuntimeState(loadStoredViewState());
const cameraModeStack = [];
const playerEyeState = {
  uuid: null,
  yawRad: 0,
  pitchRad: 0,
};

const tempPlayerTarget = new THREE.Vector3();
const tempMobTarget = new THREE.Vector3();
const lastMobBillboardQuaternion = new THREE.Quaternion();
const tempPlayerCamera = new THREE.Vector3();
const tempPlayerLook = new THREE.Vector3();
const tempPlayerForward = new THREE.Vector3();
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
    treeShadeInput,
    shadeSizeInput: shadeSizeValueInput,
    shadeDarknessInput: shadeDarknessValueInput,
    time: mapTimeInput.checked ? runtime.worldTime : NOON_LIGHTING_TIME,
    fogRange: fogControlRange(),
  });
}

function fogControlRange() {
  return fogRangeFromControls(fogNearValueInput, fogFarValueInput);
}

function fogControlOptions() {
  const range = fogControlRange();
  return {
    enabled: fogEnabledInput.checked,
    near: range.near,
    far: range.far,
    strength: readFloatControl(fogStrengthValueInput, 0.9),
    horizonStrength: readFloatControl(fogHorizonValueInput, 0.65),
    color: scene.userData.terrascapeFog?.color ?? scene.background,
  };
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function handleClearMeshCache() {
  const stats = await getMeshCacheStats();
  const entryLabel = stats.total === 1 ? 'entry' : 'entries';
  const confirmed = await confirmAction({
    title: 'Clear mesh cache?',
    message: stats.total > 0
      ? `Delete ${stats.total} cached ${entryLabel} from this browser (${stats.terrain} terrain meshes, ${stats.mapTiles} map tiles). Visible chunks will reload from the server.`
      : 'No cached mesh data was found in this browser. Reload visible chunks anyway?',
    confirmLabel: 'Clear cache',
    cancelLabel: 'Cancel',
  });
  if (!confirmed) {
    return;
  }

  clearMeshCacheButton.disabled = true;
  setStatus('Clearing mesh cache…');
  try {
    const cleared = await clearMeshCache();
    for (const [id, entry] of Array.from(loadedChunks.entries())) {
      finishDisposeChunk(id, entry);
    }
    runtime.mapTileLayerKey = null;
    updateMapTileLayer({ force: true });
    scheduleControlGridLoad();
    const clearedLabel = cleared.total === 1 ? 'entry' : 'entries';
    setStatus(cleared.total > 0
      ? `Cleared ${cleared.total} cached ${clearedLabel}; reloading meshes`
      : 'Mesh cache already empty; reloading from server');
    logClientEvent('mesh_cache_cleared', {
      terrain: cleared.terrain,
      mapTiles: cleared.mapTiles,
      total: cleared.total,
    });
  } catch (error) {
    setStatus(`Mesh cache clear failed: ${error?.message || error}`);
    logClientEvent('mesh_cache_clear_failed', {
      message: error?.message || String(error),
    });
  } finally {
    clearMeshCacheButton.disabled = false;
  }
}

function mapTileRetainRadius(terrainRadius, streamLoad = false) {
  return mapTileRetainRadiusFor(terrainRadius, streamLoad, MAP_HORIZON_MARGIN, AUTO_STREAM_RETAIN_MARGIN);
}

function terrainLoadConcurrency() {
  return terrainTuningValue(terrainLoadSlotsValueInput, DEFAULT_TERRAIN_LOAD_CONCURRENCY);
}

function terrainPromotionBudgetMs() {
  return terrainTuningValue(terrainSpawnBudgetValueInput, DEFAULT_TERRAIN_PROMOTION_BUDGET_MS);
}

function terrainPromotionsPerFrame() {
  return terrainTuningValue(terrainSpawnFrameValueInput, DEFAULT_TERRAIN_PROMOTIONS_PER_FRAME);
}

function terrainTuningValue(input, fallback) {
  return terrainTuningControlValue(input, fallback);
}

function readFloatControl(input, fallback) {
  return floatControlValue(input, fallback);
}

function maybeLogTerrainStreamProgress(stats, queueLength, inFlightCount, force = false, final = false) {
  const now = performance.now();
  if (!force && now - stats.lastProgressLogAt < TERRAIN_STREAM_PROGRESS_LOG_MS) {
    return;
  }
  stats.lastProgressLogAt = now;
  logClientEvent(
    final ? 'terrain_stream_summary' : 'terrain_stream_progress',
    terrainStreamSnapshot(stats, queueLength, inFlightCount, {
      final,
      now,
      loadSlots: terrainLoadConcurrency(),
      spawnFrame: terrainPromotionsPerFrame(),
      spawnBudgetMs: terrainPromotionBudgetMs(),
    }),
  );
}

function updateMetrics() {
  runtime.lastMetricsUpdate = performance.now();
  const loaded = loadedChunks.size;
  const center = runtime.activeCenterId ? runtime.activeCenterId.split(':').slice(1).join(', ') : 'pending';
  const resources = collectResourceStats();
  const rendererMemory = renderer.info.memory;
  const mapBackdrop = mapBackdropStats();
  const mapTiles = mapTileSceneStats();
  metricLoadedEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'}`
    + (mapTilesInput.checked && mapTiles.meshCount > 0
      ? ` · map ${mapTiles.visibleCount}/${mapTiles.meshCount}`
        + (mapTiles.bytes > 0 ? ` ${formatBytes(mapTiles.bytes)}` : '')
      : '');
  metricMeshesEl.textContent = `${resources.meshes}`;
  metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
  metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
  metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
  metricMobsEl.textContent = mobMetricText();
  metricCenterEl.textContent = center;
}

function maybeUpdateMetrics(force = false) {
  const now = performance.now();
  if (!force && now - runtime.lastMetricsUpdate < METRICS_UPDATE_INTERVAL_MS) {
    return;
  }
  updateMetrics();
}

function mobMetricText() {
  if (!showMobsInput.checked) {
    return 'hidden';
  }
  const summary = summarizeMobTypes();
  const source = runtime.lastMobSourceStats?.source ? ` · ${runtime.lastMobSourceStats.source}` : '';
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

async function loadWorlds() {
  setStatus('Loading worlds');
  const response = await fetch('/api/worlds');
  const data = await response.json();
  runtime.experimentalDetailsEnabled = data.features?.experimentalDetails === true;
  runtime.terrainFormatVersion = data.features?.terrainFormatVersion ?? runtime.terrainFormatVersion;
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
  applyBooleanParam('mobBlocks', mobBlocksInput);
  syncMobBlocksInputs(mobBlocksInput.checked);
  applyBooleanParam('shade', treeShadeInput);
  applyBooleanParam('mapTiles', mapTilesInput);
  applyCosmeticModeParam();
  applySelectParam('visualDetail', visualDetailModeInput);
  applyBooleanParam('landMotion', landMotionInput);
  applyBooleanParam('mapTime', mapTimeInput);
  applyNumberParam('terrainLoadSlots', terrainLoadSlotsValueInput);
  terrainLoadSlotsInput.value = terrainLoadSlotsValueInput.value;
  applyNumberParam('terrainSpawnFrame', terrainSpawnFrameValueInput);
  terrainSpawnFrameInput.value = terrainSpawnFrameValueInput.value;
  applyNumberParam('terrainSpawnMs', terrainSpawnBudgetValueInput);
  terrainSpawnBudgetInput.value = terrainSpawnBudgetValueInput.value;
  applyFloatParam('shadeSize', shadeSizeInput, shadeSizeValueInput);
  applyFloatParam('shadeDarkness', shadeDarknessInput, shadeDarknessValueInput);
  applySelectParam('water', waterModeInput);
  applyBooleanParam('fog', fogEnabledInput);
  applyFloatParam('fogNear', fogNearInput, fogNearValueInput);
  applyFloatParam('fogFar', fogFarInput, fogFarValueInput);
  applyFloatParam('fogStrength', fogStrengthInput, fogStrengthValueInput);
  applyFloatParam('fogHorizon', fogHorizonInput, fogHorizonValueInput);
  applySelectParam('playerRate', playerUpdateRateInput);
  applyLighting();
  updateEntityVisibility();
}

function applyStoredInputs() {
  if (!runtime.storedViewState) return;
  if (runtime.storedViewState.visualDefaultsVersion !== VISUAL_DEFAULTS_VERSION) {
    applySelectValue(cosmeticBlocksModeInput, 'split');
    applySelectValue(visualDetailModeInput, 'all');
  }
  setNumberInput(chunkXInput, runtime.storedViewState.chunkX);
  setNumberInput(chunkZInput, runtime.storedViewState.chunkZ);
  setRadiusControlValue(runtime.storedViewState.radius);
  if (typeof runtime.storedViewState.auto === 'boolean') autoStreamInput.checked = runtime.storedViewState.auto;
  if (typeof runtime.storedViewState.bounds === 'boolean') debugBoundsInput.checked = runtime.storedViewState.bounds;
  if (typeof runtime.storedViewState.players === 'boolean') showPlayersInput.checked = runtime.storedViewState.players;
  if (typeof runtime.storedViewState.mobs === 'boolean') showMobsInput.checked = runtime.storedViewState.mobs;
  if (typeof runtime.storedViewState.mobBlocks === 'boolean') syncMobBlocksInputs(runtime.storedViewState.mobBlocks);
  if (typeof runtime.storedViewState.shade === 'boolean') treeShadeInput.checked = runtime.storedViewState.shade;
  if (typeof runtime.storedViewState.mapTime === 'boolean') mapTimeInput.checked = runtime.storedViewState.mapTime;
  if (typeof runtime.storedViewState.mapTiles === 'boolean') mapTilesInput.checked = runtime.storedViewState.mapTiles;
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.cosmeticsMode === 'string') {
    applySelectValue(cosmeticBlocksModeInput, runtime.storedViewState.cosmeticsMode);
  }
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.cosmetics === 'boolean' && !runtime.storedViewState.cosmeticsMode) {
    applySelectValue(cosmeticBlocksModeInput, runtime.storedViewState.cosmetics ? 'baked' : 'off');
  }
  if (runtime.storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof runtime.storedViewState.visualDetailMode === 'string') {
    applySelectValue(visualDetailModeInput, runtime.storedViewState.visualDetailMode);
  }
  if (typeof runtime.storedViewState.landMotion === 'boolean') landMotionInput.checked = runtime.storedViewState.landMotion;
  if (typeof runtime.storedViewState.renderDetails === 'boolean') setRenderDetailsOpen(runtime.storedViewState.renderDetails);
  setPairedControlValue(terrainLoadSlotsInput, terrainLoadSlotsValueInput, runtime.storedViewState.terrainLoadSlots);
  setPairedControlValue(terrainSpawnFrameInput, terrainSpawnFrameValueInput, runtime.storedViewState.terrainSpawnFrame);
  setPairedControlValue(terrainSpawnBudgetInput, terrainSpawnBudgetValueInput, runtime.storedViewState.terrainSpawnMs);
  setPairedControlValue(shadeSizeInput, shadeSizeValueInput, runtime.storedViewState.shadeSize);
  setPairedControlValue(shadeDarknessInput, shadeDarknessValueInput, runtime.storedViewState.shadeDarkness);
  if (typeof runtime.storedViewState.water === 'string') {
    applySelectValue(waterModeInput, runtime.storedViewState.water);
  }
  if (typeof runtime.storedViewState.fog === 'boolean') fogEnabledInput.checked = runtime.storedViewState.fog;
  setPairedControlValue(fogNearInput, fogNearValueInput, runtime.storedViewState.fogNear);
  setPairedControlValue(fogFarInput, fogFarValueInput, runtime.storedViewState.fogFar);
  setPairedControlValue(fogStrengthInput, fogStrengthValueInput, runtime.storedViewState.fogStrength);
  setPairedControlValue(fogHorizonInput, fogHorizonValueInput, runtime.storedViewState.fogHorizon);
  if (typeof runtime.storedViewState.playerRate === 'string') {
    applySelectValue(playerUpdateRateInput, runtime.storedViewState.playerRate);
  }
}

function applyStoredWorld() {
  if (!runtime.storedViewState?.world) return;
  applySelectValue(worldSelect, runtime.storedViewState.world);
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
  const parsed = applyNumberControlParam(initialParams, name, input);
  if (parsed === null) return;
  if (input === radiusInput) {
    setRadiusControlValue(parsed);
  }
}

function applyBooleanParam(name, input) {
  applyBooleanControlParam(initialParams, name, input);
}

function applyCosmeticModeParam() {
  const mode = initialParams.get('cosmeticsMode');
  if (mode === 'off' || mode === 'baked' || mode === 'split') {
    applySelectValue(cosmeticBlocksModeInput, mode);
    return;
  }
  const legacy = initialParams.get('cosmetics');
  if (legacy === null) return;
  applySelectValue(cosmeticBlocksModeInput, isTruthyParam(legacy) ? 'baked' : 'off');
}

function syncMobBlocksInputs(checked) {
  mobBlocksInput.checked = checked === true;
  mobBlocksPanelInput.checked = checked === true;
}

function mobBlocksEnabled() {
  return mobBlocksInput.checked === true;
}

function cosmeticBlocksMode() {
  if (!runtime.experimentalDetailsEnabled) return 'off';
  const value = cosmeticBlocksModeInput?.value;
  return value === 'baked' || value === 'split' ? value : 'off';
}

function cosmeticBlocksBaked() {
  return cosmeticBlocksMode() === 'baked';
}

function cosmeticBlocksSplit() {
  return cosmeticBlocksMode() === 'split';
}

function visualDetailMode() {
  const value = visualDetailModeInput?.value;
  return value === 'basic' || value === 'structures' || value === 'all' ? value : 'all';
}

function applyFloatParam(name, ...inputs) {
  applyFloatControlParam(initialParams, name, ...inputs);
}

function applySelectParam(name, input) {
  applySelectControlParam(initialParams, name, input, TRI_STATE_VALUES_BY_ID);
}

function applySelectValue(input, value) {
  applyControlSelectValue(input, value, TRI_STATE_VALUES_BY_ID);
}

function setRadiusControlValue(value) {
  const normalized = normalizePairedValue(radiusRangeInput, Math.round(Number(value)));
  radiusRangeInput.value = normalized;
  radiusInput.value = normalized;
  updateRadiusReadout();
  return normalized;
}

function radiusValue() {
  return Math.max(0, numberOr(Number.parseInt(radiusInput.value, 10), 0));
}

function updateRadiusReadout() {
  radiusDiameterEl.textContent = radiusReadout(radiusValue()).text;
}

async function loadGrid(options = {}) {
  runtime.gridLoadCount++;
  const gridStarted = performance.now();
  const world = worldSelect.value;
  const centerX = options.centerX ?? Number.parseInt(chunkXInput.value, 10);
  const centerZ = options.centerZ ?? Number.parseInt(chunkZInput.value, 10);
  const radius = setRadiusControlValue(radiusValue());
  if (!world || Number.isNaN(centerX) || Number.isNaN(centerZ)) {
    setStatus('Choose a world and integer chunk coordinates');
    return;
  }

  const generation = ++runtime.loadGeneration;
  pruneOrphanChunkWrappers();
  const centerKey = centerId(world, centerX, centerZ);
  runtime.requestedCenterId = centerKey;
  runtime.scheduledCenterId = null;
  chunkXInput.value = centerX;
  chunkZInput.value = centerZ;

  if (options.focus === true && !runtime.hasFocusedInitialGrid) {
    focusGrid(centerX, centerZ, radius);
    runtime.hasFocusedInitialGrid = true;
  }

  const needed = chunkKeysForWorld(world, centerX, centerZ, radius);
  const retainKeys = options.streamLoad === true
    ? chunkKeysForWorld(world, centerX, centerZ, radius + AUTO_STREAM_RETAIN_MARGIN)
    : needed;
  const mapRetainRadius = mapTileRetainRadius(radius, options.streamLoad === true);
  const mapRetainKeys = chunkKeysForWorld(world, centerX, centerZ, mapRetainRadius);
  const streamAnchor = playerChunk();
  retainOnly(world, retainKeys);
  syncMapTileLayer(mapRetainKeys);
  if (mapTilesInput.checked) {
    const horizonKeys = horizonMapKeys(needed, mapRetainKeys);
    if (horizonKeys.length > 0) {
      void loadMapTilesForKeys(
        world,
        sortChunkKeysByPlayerDistance(horizonKeys, streamAnchor.chunkX, streamAnchor.chunkZ),
        { immediate: true, replace: true },
      );
    }
  }
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
    if (generation !== runtime.loadGeneration) return;
    if (loadedChunks.has(key.id)) {
      completed++;
    } else {
      missing.push(key);
    }
  }
  chunkPlaceholderManager.sync(world, needed, new Set(loadedChunks.keys()));
  frameJank.setActiveLoadKind('grid');
  if (missing.length > 1) {
    missing.splice(0, missing.length, ...sortChunkKeysByPlayerDistance(missing, streamAnchor.chunkX, streamAnchor.chunkZ));
  }
  try {
    let networkChunks = 0;
    const promotionQueue = [];
    let nextMissing = 0;
    const inFlight = new Set();
    const loadConcurrency = terrainLoadConcurrency();
    const streamStats = createTerrainStreamStats(
      world,
      centerX,
      centerZ,
      radius,
      needed.length,
      completed,
      missing.length,
      gridStarted,
    );

    const enqueueNext = () => {
      if (nextMissing >= missing.length || generation !== runtime.loadGeneration) return;
      const key = missing[nextMissing++];
      streamStats.requested++;
      const task = loadTerrainChunkData(world, key, generation)
        .then((result) => {
          if (result.cacheReadMs) cacheReadMs += result.cacheReadMs;
          if (result.cacheParseMs) cacheParseMs += result.cacheParseMs;
          if (result.cacheHit) {
            cacheHits++;
            streamStats.cacheHits++;
          }
          if (result.cacheMiss) {
            cacheMisses++;
            streamStats.cacheMisses++;
          }
          if (result.network) {
            networkChunks++;
            streamStats.networkChunks++;
          }
          result.readyAt = performance.now();
          streamStats.dataReady++;
          promotionQueue.push(result);
          streamStats.maxQueue = Math.max(streamStats.maxQueue, promotionQueue.length);
          maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size);
        })
        .catch((error) => {
          streamStats.dataReady++;
          promotionQueue.push({
            ok: false,
            key,
            error,
            readyAt: performance.now(),
            cacheReadMs: 0,
            cacheParseMs: 0,
            cacheHit: false,
            cacheMiss: true,
            network: false,
          });
          streamStats.maxQueue = Math.max(streamStats.maxQueue, promotionQueue.length);
          maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size);
        })
        .finally(() => {
          inFlight.delete(task);
        });
      inFlight.add(task);
    };

    while (inFlight.size < loadConcurrency && nextMissing < missing.length) {
      enqueueNext();
    }

    while ((inFlight.size > 0 || promotionQueue.length > 0) && generation === runtime.loadGeneration) {
      while (inFlight.size < loadConcurrency && nextMissing < missing.length) {
        enqueueNext();
      }

      const promoted = promoteTerrainResults(promotionQueue, generation, streamStats);
      completed += promoted.completed;
      failed += promoted.failed;
      if (promoted.completed > 0 || promoted.failed > 0) {
        setStatus(`Loaded ${completed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
        maybeUpdateMetrics(true);
        maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size, promoted.yielded);
        if (promoted.yielded) {
          await yieldToMain();
          continue;
        }
      }

      if (promotionQueue.length === 0 && inFlight.size > 0) {
        await Promise.race([...inFlight]);
      } else if (promotionQueue.length > 0) {
        await yieldToMain();
      }
    }

    if (generation !== runtime.loadGeneration) return;
    maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size, true, true);

  if (generation !== runtime.loadGeneration) return;
  retainOnly(world, retainKeys);
  runtime.activeCenterId = centerKey;
  runtime.requestedCenterId = null;
  syncMapTileLayer(mapRetainKeys);
  if (mapTilesInput.checked) {
    await loadMapTilesForKeys(world, needed, { immediate: true });
  }
  updateMetrics();
  setStatus(failed === 0
    ? `Loaded ${needed.length} chunks around ${centerX}, ${centerZ}`
    : `Loaded ${needed.length - failed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
  const gridLoadTiming = {
    world,
    centerX,
    centerZ,
    radius,
    needed: needed.length,
    alreadyLoaded: needed.length - missing.length,
    cacheHits,
    cacheMisses,
    networkChunks,
    failed,
    cacheReadMs: Math.round(cacheReadMs),
    cacheParseMs: Math.round(cacheParseMs),
    terrainLoadSlots: loadConcurrency,
    terrainSpawnFrame: terrainPromotionsPerFrame(),
    terrainSpawnBudgetMs: terrainPromotionBudgetMs(),
    terrainRequested: streamStats.requested,
    terrainDataReady: streamStats.dataReady,
    terrainPromoted: streamStats.promoted,
    terrainSpawnedMissing: Math.max(0, streamStats.promoted - streamStats.alreadyLoaded),
    terrainMaxQueue: streamStats.maxQueue,
    terrainMaxReadyWaitMs: Math.round(streamStats.maxReadyWaitMs),
    streamAnchorX: streamAnchor.chunkX,
    streamAnchorZ: streamAnchor.chunkZ,
    ms: Math.round(performance.now() - gridStarted),
  };
  runtime.lastGridLoadTiming = gridLoadTiming;
  runtime.lastTerrainStreamTiming = gridLoadTiming;
  logClientTiming('grid_load', gridStarted, gridLoadTiming);
  } finally {
    if (generation === runtime.loadGeneration) {
      frameJank.setActiveLoadKind('none');
    }
  }
}

async function loadChunk(world, chunkX, chunkZ, generation) {
  const id = chunkId(world, chunkX, chunkZ);
  if (loadedChunks.has(id)) return true;
  const url = terrainUrl(world, chunkX, chunkZ);
  const started = performance.now();
  const mapTilePromise = mapTilesInput.checked
    ? loadMapTilesForKeys(world, [{ chunkX, chunkZ }], { immediate: true })
    : Promise.resolve();
  const bytes = await fetchArrayBufferWithRetry(url);
  const gltf = await parseGltfBytes(bytes);
  await mapTilePromise;
  if (generation !== runtime.loadGeneration) return false;
  if (loadedChunks.has(id)) return true;
  writeTerrainCache(terrainCacheKey(world, chunkX, chunkZ), bytes.slice(0), { source: 'single' });
  const entry = addChunkObject(world, chunkX, chunkZ, gltf.scene);
  if (entry && cosmeticBlocksSplit()) {
    void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
      logClientEvent('terrain_cosmetic_overlay_failed', {
        world,
        chunkX,
        chunkZ,
        error: error?.message ?? error,
      });
    });
  }
  logClientTiming('terrain_single_load', started, { world, chunkX, chunkZ });
  return true;
}

async function loadTerrainChunkData(world, key, generation) {
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

function promoteTerrainResults(queue, generation, streamStats = null) {
  const started = performance.now();
  const promotionsPerFrame = terrainPromotionsPerFrame();
  const promotionBudgetMs = terrainPromotionBudgetMs();
  let completed = 0;
  let failed = 0;
  let promoted = 0;

  while (queue.length > 0 && generation === runtime.loadGeneration) {
    if (
      promoted >= promotionsPerFrame
      || (promoted > 0 && performance.now() - started >= promotionBudgetMs)
    ) {
      break;
    }

    const result = queue.shift();
    if (result.stale) {
      continue;
    }
    if (!result.ok) {
      failed++;
      if (streamStats) streamStats.failed++;
      console.warn(`Failed to load chunk ${result.key.chunkX},${result.key.chunkZ}`, result.error);
      logClientEvent('terrain_stream_chunk_failed', {
        world: worldSelect.value,
        chunkX: result.key.chunkX,
        chunkZ: result.key.chunkZ,
        error: result.error?.message ?? result.error,
      });
      continue;
    }

    if (generation !== runtime.loadGeneration) {
      break;
    }
    const resultWorld = result.world ?? worldSelect.value;
    const id = chunkId(resultWorld, result.key.chunkX, result.key.chunkZ);
    if (!loadedChunks.has(id)) {
      const entry = addChunkObject(resultWorld, result.key.chunkX, result.key.chunkZ, result.gltf.scene);
      if (result.bytes) {
        writeTerrainCache(terrainCacheKey(resultWorld, result.key.chunkX, result.key.chunkZ), result.bytes.slice(0), { source: 'single' });
      }
      if (entry && cosmeticBlocksSplit()) {
        void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
          logClientEvent('terrain_cosmetic_overlay_failed', {
            world: resultWorld,
            chunkX: result.key.chunkX,
            chunkZ: result.key.chunkZ,
            error: error?.message ?? error,
          });
        });
      }
      if (mapTilesInput.checked) {
        void loadMapTilesForKeys(resultWorld, [result.key], { immediate: true });
      }
      promoted++;
      if (streamStats) {
        streamStats.promoted++;
        const readyWaitMs = result.readyAt ? performance.now() - result.readyAt : 0;
        streamStats.totalReadyWaitMs += readyWaitMs;
        streamStats.maxReadyWaitMs = Math.max(streamStats.maxReadyWaitMs, readyWaitMs);
      }
    }
    completed++;
  }

  return {
    completed,
    failed,
    yielded: queue.length > 0 && (completed > 0 || failed > 0),
  };
}

function chunkWrapperName(chunkX, chunkZ) {
  return `chunk:${chunkX}:${chunkZ}`;
}

function countOrphanChunkWrappers(extraKeep = null) {
  const tracked = new Set();
  for (const entry of loadedChunks.values()) {
    tracked.add(entry.object);
  }
  if (extraKeep) tracked.add(extraKeep);
  let count = 0;
  for (const child of scene.children) {
    if (!child.name?.startsWith('chunk:')) continue;
    if (tracked.has(child)) continue;
    count += 1;
  }
  return count;
}

function pruneOrphanChunkWrappers(extraKeep = null) {
  const tracked = new Set();
  for (const entry of loadedChunks.values()) {
    tracked.add(entry.object);
  }
  if (extraKeep) tracked.add(extraKeep);
  const removals = [];
  for (const child of scene.children) {
    if (!child.name?.startsWith('chunk:')) continue;
    if (tracked.has(child)) continue;
    removals.push(child);
  }
  for (const child of removals) {
    scene.remove(child);
    const stats = disposeObjectTree(child);
    disposalStats.chunks += 1;
    disposalStats.geometries += stats.geometries;
    disposalStats.materials += stats.materials;
    disposalStats.textures += stats.textures;
  }
  return removals.length;
}

function addChunkObject(world, chunkX, chunkZ, object) {
  const id = chunkId(world, chunkX, chunkZ);
  const existing = loadedChunks.get(id);
  if (existing) {
    finishDisposeChunk(id, existing);
  }
  pruneOrphanChunkWrappers();

  chunkPlaceholderManager.resolve(world, chunkX, chunkZ);

  const wrapper = new THREE.Group();
  wrapper.name = chunkWrapperName(chunkX, chunkZ);
  wrapper.position.set(chunkX * 32, 0, chunkZ * 32);

  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
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
  wrapper.add(object);
  scene.add(wrapper);

  const entry = {
    world,
    chunkX,
    chunkZ,
    object: wrapper,
    mesh: object,
    debug,
    shade,
    landState: 'settled',
    landStartedAt: 0,
    landDurationMs: 0,
    landStartY: 0,
    landTargetY: 0,
    onLandComplete: null,
    pendingUnload: null,
  };
  chunkLandMotion.beginLoad(entry, landMotionEnabled());
  loadedChunks.set(id, entry);
  pruneOrphanChunkWrappers(wrapper);
  return entry;
}

async function loadCosmeticOverlayForEntry(entry, generation) {
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration) return false;
  const cacheKey = terrainCosmeticOverlayCacheKey(entry.world, entry.chunkX, entry.chunkZ);
  let bytes = null;
  const cached = await readTerrainCache(cacheKey);
  if (cached?.bytes) {
    bytes = cached.bytes;
  } else {
    bytes = await fetchArrayBufferWithRetry(terrainCosmeticOverlayUrl(entry.world, entry.chunkX, entry.chunkZ));
  }
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration) return false;
  const id = chunkId(entry.world, entry.chunkX, entry.chunkZ);
  const current = loadedChunks.get(id);
  if (current !== entry) return false;
  const gltf = await parseGltfBytes(bytes);
  if (!cosmeticBlocksSplit() || generation !== runtime.loadGeneration || loadedChunks.get(id) !== entry) return false;
  attachCosmeticOverlay(entry, gltf.scene);
  if (!cached?.bytes) {
    writeTerrainCache(cacheKey, bytes.slice(0), { source: 'cosmetic-overlay' });
  }
  updateMetrics();
  return true;
}

function attachCosmeticOverlay(entry, object) {
  if (entry.cosmeticOverlay) {
    entry.mesh.remove(entry.cosmeticOverlay);
    const stats = disposeObjectTree(entry.cosmeticOverlay);
    disposalStats.geometries += stats.geometries;
    disposalStats.materials += stats.materials;
    disposalStats.textures += stats.textures;
  }
  object.name = 'cosmetic-overlay';
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  applyLightingToObject(object, currentLightingOptions());
  entry.mesh.add(object);
  entry.cosmeticOverlay = object;
}

async function parseGltfBytes(arrayBuffer) {
  return await loader.parseAsync(arrayBuffer, '');
}

async function fetchArrayBufferWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url);
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

function retainOnly(world, needed) {
  const keep = new Set(needed.map((key) => key.id));
  for (const [id, entry] of loadedChunks) {
    if (chunkLandMotion.isAnimating(entry)) {
      continue;
    }
    if (entry.world !== world || !keep.has(id)) {
      requestChunkUnload(id, entry);
    }
  }
}

function landMotionEnabled() {
  return landMotionInput?.checked !== false;
}

function requestChunkUnload(id, entry) {
  const deferred = chunkLandMotion.beginUnload(entry, landMotionEnabled(), () => {
    finishDisposeChunk(id, entry);
  });
  if (!deferred) {
    finishDisposeChunk(id, entry);
  }
}

function finishDisposeChunk(id, entry) {
  chunkLandMotion.cancel(entry);
  if (!loadedChunks.has(id)) {
    return;
  }
  scene.remove(entry.object);
  const stats = disposeObjectTree(entry.object);
  disposalStats.chunks++;
  disposalStats.geometries += stats.geometries;
  disposalStats.materials += stats.materials;
  disposalStats.textures += stats.textures;
  loadedChunks.delete(id);
  updateMetrics();
}

function collectResourceStats() {
  return collectChunkResourceStats(loadedChunks.values());
}

function applyWaterMode() {
  const mode = waterModeValue();
  if (waterModeInput.value !== mode) {
    waterModeInput.value = mode;
  }
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
    applyWaterModeToObject(entry.object, mode);
  }
}

function waterModeValue() {
  return safeWaterMode(waterModeInput.value);
}

function terrainCacheKey(world, chunkX, chunkZ) {
  return terrainCacheKeyFor(world, chunkX, chunkZ, {
    terrainFormatVersion: runtime.terrainFormatVersion,
    experimentalDetailsEnabled: runtime.experimentalDetailsEnabled,
    cosmeticsMode: cosmeticBlocksMode(),
    visualDetailMode: visualDetailMode(),
  });
}

function terrainUrl(world, chunkX, chunkZ) {
  return terrainUrlFor(world, chunkX, chunkZ, {
    cosmeticsMode: cosmeticBlocksMode(),
    visualDetailMode: visualDetailMode(),
  });
}

function terrainCosmeticOverlayCacheKey(world, chunkX, chunkZ) {
  return terrainCosmeticOverlayCacheKeyFor(world, chunkX, chunkZ, {
    terrainFormatVersion: runtime.terrainFormatVersion,
    experimentalDetailsEnabled: runtime.experimentalDetailsEnabled,
    visualDetailMode: visualDetailMode(),
  });
}

function terrainCosmeticOverlayUrl(world, chunkX, chunkZ) {
  return terrainCosmeticOverlayUrlFor(world, chunkX, chunkZ, visualDetailMode());
}

function applyMapWaterTint() {
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
  }
}

function mapBackdropCenter() {
  return mapBackdropCenterFrom(
    runtime.activeCenterId,
    Number.parseInt(chunkXInput.value, 10),
    Number.parseInt(chunkZInput.value, 10),
  );
}

function syncMapTileLayer(retainKeys = null) {
  grid.visible = !mapTilesInput.checked;
  configureMapBackdrop(scene, renderer, {
    enabled: mapTilesInput.checked,
    formatVersion: runtime.terrainFormatVersion,
    motionEnabled: landMotionEnabled(),
  });
  if (!mapTilesInput.checked) {
    updateMetrics();
    return;
  }
  const world = worldSelect.value;
  const keys = retainKeys ?? chunkKeysForWorld(
    world,
    Number.parseInt(chunkXInput.value, 10),
    Number.parseInt(chunkZInput.value, 10),
    radiusValue(),
  );
  const retainIds = new Set(keys.map((key) => key.id));
  pruneMapTiles(world, retainIds);
  const center = mapBackdropCenter();
  const terrainRadius = radiusValue();
  const mapRadius = mapTileRetainRadius(terrainRadius, autoStreamInput.checked);
  const stats = mapBackdropStats();
  Object.assign(stats, mapBackdropRetainStats(center, mapRadius));
  updateMetrics();
}

function updateMapTileLayer(options = {}) {
  const center = mapBackdropCenter();
  const radius = radiusValue();
  const mapRadius = mapTileRetainRadius(radius, autoStreamInput.checked);
  const world = worldSelect.value;
  const layerKey = buildMapTileLayerKey(world, center, mapRadius, mapTilesInput.checked);
  if (!options.force && layerKey === runtime.mapTileLayerKey) {
    return;
  }
  runtime.mapTileLayerKey = layerKey;
  const keys = chunkKeysForWorld(world, center.chunkX, center.chunkZ, mapRadius);
  syncMapTileLayer(keys);
  if (mapTilesInput.checked) {
    const anchor = playerChunk();
    void loadMapTilesForKeys(
      world,
      sortChunkKeysByPlayerDistance(keys, anchor.chunkX, anchor.chunkZ),
      { immediate: true, replace: true },
    );
  }
}

function cameraChunk() {
  return {
    chunkX: Math.floor(camera.position.x / 32),
    chunkZ: Math.floor(camera.position.z / 32),
  };
}

function applyLighting() {
  const options = currentLightingOptions();
  applyLightingEnvironment(scene, renderer, lightingRig, options);
  applyFogSettings();
  for (const entry of loadedChunks.values()) {
    applyLightingToObject(entry.object, options);
    updateTreeShadeObject(entry.shade, options);
  }
}

function applyFogSettings() {
  const options = fogControlOptions();
  scene.fog = null;
  setFogOptions(postProcessing, options);
}

function updateMapDistanceFog() {
  scene.fog = null;
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
      runtime.worldTime = data;
      applyLighting();
      timeRibbon.update(runtime.worldTime);
    }
  } catch (error) {
    console.warn('World time refresh failed', error);
    logClientEvent('world_time_refresh_failed', { error: error?.message ?? error });
  }
}

function worldTimePollDelayMs() {
  return computeWorldTimePollDelayMs({
    mapTimeEnabled: mapTimeInput.checked,
    lastPlayerCount: runtime.lastPlayerCount,
    activeMs: MAP_TIME_ACTIVE_POLL_MS,
    visibleMs: MAP_TIME_VISIBLE_POLL_MS,
    idleMs: MAP_TIME_IDLE_POLL_MS,
  });
}

function restartWorldTimePolling(delayMs = worldTimePollDelayMs()) {
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = setTimeout(async () => {
    await refreshWorldTime();
    restartWorldTimePolling();
  }, delayMs);
}

async function refreshPlayers() {
  if (!worldSelect.value || runtime.isRefreshingPlayers) {
    return;
  }
  runtime.isRefreshingPlayers = true;
  try {
    const response = await fetch(`/api/players/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Player request failed: ${response.status}`);
    }
    const data = await response.json();
    runtime.lastPlayerPollFailed = false;
    updatePlayers(data.players ?? []);
  } catch (error) {
    runtime.lastPlayerPollFailed = true;
    console.warn('Player refresh failed', error);
    logClientEvent('player_refresh_failed', { error: error?.message ?? error });
  } finally {
    runtime.isRefreshingPlayers = false;
  }
}

function playerUpdateRateMs() {
  return positiveIntegerMs(playerUpdateRateInput.value, DEFAULT_PLAYER_UPDATE_RATE_MS);
}

function playerPollDelayMs() {
  return computePlayerPollDelayMs({
    lastPollFailed: runtime.lastPlayerPollFailed,
    showPlayers: showPlayersInput.checked,
    lastPlayerCount: runtime.lastPlayerCount,
    requestedRateMs: playerUpdateRateMs(),
    focused: Boolean(runtime.viewPlayerUuid || runtime.followPlayerUuid),
    errorMs: PLAYER_POLL_ERROR_MS,
    hiddenMs: HIDDEN_PLAYER_POLL_MS,
    emptyMs: EMPTY_PLAYER_POLL_MS,
    focusedMinMs: FOCUSED_PLAYER_POLL_MIN_MS,
  });
}

function restartPlayerPolling(delayMs = playerPollDelayMs()) {
  clearTimeout(runtime.playerPollTimer);
  if (runtime.entityStreamConnected) return;
  runtime.playerPollTimer = setTimeout(async () => {
    await refreshPlayers();
    restartPlayerPolling();
  }, delayMs);
}

async function refreshMobs() {
  if (!worldSelect.value || !liveMobFeedEnabled() || runtime.isRefreshingMobs) {
    return;
  }
  runtime.isRefreshingMobs = true;
  try {
    const response = await fetch(`/api/mobs/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Mob request failed: ${response.status}`);
    }
    const data = await response.json();
    runtime.lastMobPollFailed = false;
    runtime.lastMobSourceStats = data.sourceStats ?? null;
    scheduleMobMarkerUpdate(data.mobs ?? []);
  } catch (error) {
    runtime.lastMobPollFailed = true;
    console.warn('Mob refresh failed', error);
    logClientEvent('mob_refresh_failed', { error: error?.message ?? error });
  } finally {
    runtime.isRefreshingMobs = false;
  }
}

function mobPollDelayMs() {
  return computeMobPollDelayMs({
    showMobs: showMobsInput.checked,
    liveMobFeed: liveMobFeedEnabled(),
    lastPollFailed: runtime.lastMobPollFailed,
    lastMobCount: runtime.lastMobCount,
    activeMs: MOB_POLL_MS,
    emptyMs: EMPTY_MOB_POLL_MS,
    errorMs: MOB_POLL_ERROR_MS,
  });
}

function restartMobPolling(delayMs = mobPollDelayMs()) {
  clearTimeout(runtime.mobPollTimer);
  runtime.mobPollTimer = null;
  if (delayMs === null || runtime.entityStreamConnected) return;
  runtime.mobPollTimer = setTimeout(async () => {
    await refreshMobs();
    restartMobPolling();
  }, delayMs);
}

function liveMobFeedEnabled() {
  return computeLiveMobFeedEnabled(showMobsInput.checked, runtime.lastPlayerCount);
}

function wantsEntityStream() {
  return computeWantsEntityStream({
    world: worldSelect.value,
    showPlayers: showPlayersInput.checked,
    liveMobFeed: liveMobFeedEnabled(),
  });
}

function restartEntityStream() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  if (!('EventSource' in window) || !wantsEntityStream()) {
    closeEntityStream();
    restartPlayerPolling();
    restartMobPolling();
    return;
  }

  const includePlayers = showPlayersInput.checked;
  const includeMobs = liveMobFeedEnabled();
  if (runtime.entityStream
      && runtime.entityStreamWorld === worldSelect.value
      && runtime.entityStreamPlayers === includePlayers
      && runtime.entityStreamMobs === includeMobs) {
    return;
  }

  closeEntityStream();
  runtime.entityStreamWorld = worldSelect.value;
  runtime.entityStreamPlayers = includePlayers;
  runtime.entityStreamMobs = includeMobs;
  const params = new URLSearchParams({
    players: includePlayers ? '1' : '0',
    mobs: includeMobs ? '1' : '0',
  });
  runtime.entityStream = new EventSource(`/api/entities/stream/${encodeURIComponent(worldSelect.value)}?${params}`);
  runtime.entityStream.addEventListener('open', () => {
    runtime.entityStreamConnected = true;
    clearTimeout(runtime.playerPollTimer);
    clearTimeout(runtime.mobPollTimer);
    clearTimeout(runtime.entityStreamFallbackTimer);
  });
  runtime.entityStream.addEventListener('entities', (event) => {
    runtime.entityStreamConnected = true;
    clearTimeout(runtime.playerPollTimer);
    clearTimeout(runtime.mobPollTimer);
    try {
      applyEntitySnapshot(JSON.parse(event.data));
    } catch (error) {
      console.warn('Entity stream parse failed', error);
      logClientEvent('entity_stream_parse_failed', { error: error?.message ?? error });
    }
  });
  runtime.entityStream.addEventListener('error', () => {
    runtime.entityStreamConnected = false;
    scheduleEntityFallbackPolling();
  });
}

function closeEntityStream() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  if (runtime.entityStream) {
    runtime.entityStream.close();
  }
  runtime.entityStream = null;
  runtime.entityStreamWorld = null;
  runtime.entityStreamPlayers = null;
  runtime.entityStreamMobs = null;
  runtime.entityStreamConnected = false;
}

function scheduleEntityFallbackPolling() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  runtime.entityStreamFallbackTimer = setTimeout(() => {
    if (runtime.entityStreamConnected) return;
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
  if (liveMobFeedEnabled()) {
    runtime.lastMobSourceStats = snapshot.mobSourceStats ?? null;
    scheduleMobMarkerUpdate(snapshot.mobs ?? []);
  }
}

function updatePlayers(players) {
  const previousPlayerCount = runtime.lastPlayerCount;
  runtime.lastPlayerCount = players.length;
  if (previousPlayerCount !== runtime.lastPlayerCount) {
    logClientEvent('player_count_changed', {
      players: runtime.lastPlayerCount,
      nextPollMs: playerPollDelayMs(),
    });
    restartWorldTimePolling();
    if (runtime.lastPlayerCount > previousPlayerCount) {
      schedulePlayerConnectMobSample(players);
    }
    if (showMobsInput.checked) {
      if (runtime.lastPlayerCount <= 0) {
        clearMobs();
      }
      restartEntityStream();
      restartMobPolling(runtime.lastPlayerCount > 0 ? 0 : mobPollDelayMs());
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
      marker.rotation.y = playerCameraYawRad(player.yaw ?? 0);
    }
    marker.userData.targetPosition ??= new THREE.Vector3();
    marker.userData.targetPosition.set(player.x, player.y, player.z);
    marker.userData.targetYaw = playerCameraYawRad(player.yaw ?? marker.userData.targetYawDeg ?? 0);
    marker.userData.targetYawDeg = player.yaw ?? marker.userData.targetYawDeg ?? 0;
    marker.userData.targetPitch = player.pitch ?? marker.userData.targetPitch ?? 0;
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

    const tile = playerTiles.get(player.uuid) ?? createPlayerTile(player, playerTileContext());
    if (!playerTiles.has(player.uuid)) {
      playerTiles.set(player.uuid, tile);
    }
    updatePlayerTile(tile, player, playerTileContext());
    ensurePlayerTileOrder(tile.element, tileIndex++);
  }

  for (const [uuid, marker] of playerMarkers) {
    if (!seen.has(uuid)) {
      scene.remove(marker);
      disposeObject(marker);
      playerMarkers.delete(uuid);
      playerTiles.get(uuid)?.element.remove();
      playerTiles.delete(uuid);
      if (runtime.viewPlayerUuid === uuid) {
        popCameraMode();
      }
      if (runtime.followPlayerUuid === uuid) {
        popCameraMode();
      }
    }
  }

  updateEntityVisibility();
}

function playerTileContext() {
  return {
    activeViewUuid: runtime.viewPlayerUuid,
    activeFollowUuid: runtime.followPlayerUuid,
    onFocus: focusPlayer,
    onToggleEyeView: (uuid) => setPlayerEyeView(runtime.viewPlayerUuid === uuid ? null : uuid),
    onToggleFollow: (uuid) => setPlayerFollow(runtime.followPlayerUuid === uuid ? null : uuid),
  };
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
  clearTimeout(runtime.playerConnectMobSampleTimer);
  const sampledPlayers = players.map((player) => compactObject({
    uuid: player.uuid,
    name: player.name,
    x: roundCoord(player.x),
    y: roundCoord(player.y),
    z: roundCoord(player.z),
  }));
  runtime.playerConnectMobSampleTimer = setTimeout(() => {
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

function updateMobs(mobs) {
  cancelPendingMobMarkerUpdate();
  if (!showMobsInput.checked && mobs.length > 0) {
    return;
  }
  setMobCount(mobs.length);

  const seen = new Set();
  for (const mob of mobs) {
    seen.add(upsertMobMarker(mob));
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

function scheduleMobMarkerUpdate(mobs) {
  if (!showMobsInput.checked && mobs.length > 0) {
    return;
  }
  const generation = ++runtime.mobMarkerUpdateGeneration;
  runtime.pendingMobMarkerUpdate = {
    generation,
    mobs,
    index: 0,
    seen: new Set(),
    removals: null,
    removalIndex: 0,
  };
  setMobCount(mobs.length);
  if (!runtime.mobMarkerUpdateScheduled) {
    runtime.mobMarkerUpdateScheduled = true;
    requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
  }
}

function cancelPendingMobMarkerUpdate() {
  runtime.mobMarkerUpdateGeneration++;
  runtime.pendingMobMarkerUpdate = null;
  runtime.mobMarkerUpdateScheduled = false;
}

function processPendingMobMarkerUpdate(generation) {
  runtime.mobMarkerUpdateScheduled = false;
  const update = runtime.pendingMobMarkerUpdate;
  if (!update) return;
  if (update.generation !== generation) {
    schedulePendingMobMarkerUpdate(update.generation);
    return;
  }

  const start = performance.now();
  let processed = 0;
  while (update.index < update.mobs.length) {
    const id = upsertMobMarker(update.mobs[update.index]);
    update.seen.add(id);
    update.index += 1;
    processed += 1;
    if (processed >= MOB_MARKER_UPSERTS_PER_FRAME
        || performance.now() - start >= MOB_MARKER_FRAME_BUDGET_MS) {
      schedulePendingMobMarkerUpdate(generation);
      return;
    }
  }

  if (!update.removals) {
    update.removals = Array.from(mobMarkers.keys()).filter((id) => !update.seen.has(id));
  }
  processed = 0;
  while (update.removalIndex < update.removals.length) {
    const id = update.removals[update.removalIndex];
    const marker = mobMarkers.get(id);
    if (marker) {
      scene.remove(marker);
      disposeObject(marker);
      mobMarkers.delete(id);
    }
    update.removalIndex += 1;
    processed += 1;
    if (processed >= MOB_MARKER_REMOVALS_PER_FRAME
        || performance.now() - start >= MOB_MARKER_FRAME_BUDGET_MS) {
      schedulePendingMobMarkerUpdate(generation);
      return;
    }
  }

  runtime.pendingMobMarkerUpdate = null;
  updateEntityVisibility();
}

function schedulePendingMobMarkerUpdate(generation) {
  runtime.mobMarkerUpdateScheduled = true;
  requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
}

function setMobCount(count) {
  const previousMobCount = runtime.lastMobCount;
  runtime.lastMobCount = count;
  if (previousMobCount !== runtime.lastMobCount) {
    logClientEvent('mob_count_changed', {
      mobs: runtime.lastMobCount,
      nextPollMs: mobPollDelayMs(),
    });
  }
}

function upsertMobMarker(mob) {
  const id = String(mob.id ?? `${mob.type}:${mob.x}:${mob.y}:${mob.z}`);
  const enrichedMob = npcCatalog.enrich(mob, id);
  const existingMarker = mobMarkers.get(id);
  const marker = existingMarker ?? createMobMarker(enrichedMob);
  if (!existingMarker) {
    marker.position.set(mob.x, mob.y, mob.z);
  }
  marker.userData.targetPosition ??= new THREE.Vector3();
  marker.userData.targetPosition.set(mob.x, mob.y, mob.z);
  marker.userData.mob = enrichedMob;
  updateMobMarkerCard(marker, enrichedMob);
  marker.visible = showMobsInput.checked;
  const headshotBlock = marker.userData.headshotBlock;
  if (headshotBlock) {
    headshotBlock.visible = mobBlocksEnabled();
  }
  mobMarkers.set(id, marker);
  if (!marker.parent) {
    scene.add(marker);
  }
  return id;
}

function clearMobs() {
  updateMobs([]);
  runtime.lastMobPollFailed = false;
  runtime.lastMobSourceStats = null;
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
    resetPlayerEyeState(uuid);
    updateEyeCamera(0);
  } else if (runtime.viewPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

function setPlayerFollow(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('follow', uuid);
  } else if (runtime.followPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

function pushCameraMode(mode, uuid) {
  if ((mode === 'eye' && runtime.viewPlayerUuid === uuid) || (mode === 'follow' && runtime.followPlayerUuid === uuid)) {
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
  runtime.viewPlayerUuid = null;
  runtime.followPlayerUuid = null;
  playerEyeState.uuid = null;
  setFollowControlsEnabled(false);
}

function captureCameraModeState() {
  return {
    camera: camera.position.clone(),
    target: controls.target.clone(),
    viewPlayerUuid: runtime.viewPlayerUuid,
    followPlayerUuid: runtime.followPlayerUuid,
    controlsEnabled: controls.enabled,
  };
}

function restoreCameraModeState(state) {
  if (!state) return false;
  if (state.viewPlayerUuid && !playerMarkers.has(state.viewPlayerUuid)) return false;
  if (state.followPlayerUuid && !playerMarkers.has(state.followPlayerUuid)) return false;

  camera.position.copy(state.camera);
  controls.target.copy(state.target);
  runtime.viewPlayerUuid = state.viewPlayerUuid;
  runtime.followPlayerUuid = state.followPlayerUuid;
  if (runtime.viewPlayerUuid) {
    resetPlayerEyeState(runtime.viewPlayerUuid);
  } else {
    playerEyeState.uuid = null;
  }
  setFollowControlsEnabled(Boolean(runtime.followPlayerUuid));
  controls.update();
  syncFlyLookFromCamera();
  saveViewState();
  return true;
}

function applyCameraMode(mode, uuid) {
  runtime.viewPlayerUuid = mode === 'eye' ? uuid : null;
  runtime.followPlayerUuid = mode === 'follow' ? uuid : null;
  setFollowControlsEnabled(mode === 'follow');
  if (mode === 'follow') {
    updateWalkFollowCamera(1);
  }
}

function setFollowControlsEnabled(enabled) {
  controls.enabled = enabled;
  controls.enableRotate = enabled;
  controls.enableZoom = enabled;
  controls.enablePan = enabled;
  controls.mouseButtons = enabled ? FOLLOW_MOUSE_BUTTONS : FLY_MOUSE_BUTTONS;
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
    if (marker.userData.headshotBlock) {
      marker.userData.headshotBlock.visible = mobBlocksEnabled();
    }
  }
  if (!showPlayersInput.checked) {
    playersEl.textContent = 'Players hidden';
  }
}

function exposeDebugState() {
  window.__synthTerrascapeDebug = {
    fpsCounter,
    loadedChunks,
    playerMarkers,
    playerTiles,
    mobMarkers,
    entityStreamState: () => ({
      connected: runtime.entityStreamConnected,
      world: runtime.entityStreamWorld,
      players: runtime.entityStreamPlayers,
      mobs: runtime.entityStreamMobs,
      liveMobFeed: liveMobFeedEnabled(),
      available: 'EventSource' in window,
    }),
    npcDetailsState: () => npcCatalog.state(),
    loadGrid: (options = {}) => loadGrid(options),
    auditMapTiles: () => auditMapTiles(scene),
    mapBackdropY: () => resolveMapBackdropY(),
    mapBackdropStats,
    mapTileSceneStats,
    probeMapTilePixel: (chunkX, chunkZ) => probeMapTilePixel(
      scene,
      renderer,
      camera,
      () => renderPostProcessing(postProcessing, renderer, scene, camera, 0, 0),
      chunkX,
      chunkZ,
    ),
    terrainFormatVersion: () => runtime.terrainFormatVersion,
    experimentalDetailsEnabled: () => runtime.experimentalDetailsEnabled,
    activeCenterId: () => runtime.activeCenterId,
    requestedCenterId: () => runtime.requestedCenterId,
    updatePlayersForTest: (players) => updatePlayers(players),
    setPlayerEyeViewForTest: (uuid) => setPlayerEyeView(uuid),
    updateMobsForTest: (mobs) => updateMobs(mobs),
    scheduleMobsForTest: (mobs) => scheduleMobMarkerUpdate(mobs),
    waterMaterialSummary: () => waterMaterialSummary(),
    cameraPose: () => ({
      camera: vectorState(camera.position),
      target: vectorState(controls.target),
      fov: camera.fov,
    }),
    streamAnchorChunk: () => playerChunk(),
    cameraChunk: () => ({
      chunkX: Math.floor(camera.position.x / 32),
      chunkZ: Math.floor(camera.position.z / 32),
    }),
    setAutoStream: (enabled) => {
      autoStreamInput.checked = enabled === true;
      autoStreamInput.dispatchEvent(new Event('change', { bubbles: true }));
    },
    lastPerfTimings: () => ({
      gridLoad: runtime.lastGridLoadTiming,
      terrainBatch: null,
      terrainStream: runtime.lastTerrainStreamTiming,
    }),
    terrainTuning: () => ({
      loadSlots: terrainLoadConcurrency(),
      spawnFrame: terrainPromotionsPerFrame(),
      spawnBudgetMs: terrainPromotionBudgetMs(),
    }),
    gridLoadCount: () => runtime.gridLoadCount,
    resetGridLoadCount: () => {
      runtime.gridLoadCount = 0;
    },
    jankStats: () => frameJank.stats(),
    resetJankStats: () => frameJank.reset(),
    chunkPlaceholderCount: () => chunkPlaceholderManager.count(),
    chunkPlaceholderWaiting: () => chunkPlaceholderManager.waitingCount(),
    landMotionActive: () => chunkLandMotion.activeCount(loadedChunks.values()),
    mapTileMotionActive,
    chunkWrapperCount: () => scene.children.filter((child) => child.name?.startsWith('chunk:')).length,
    orphanChunkWrappers: () => countOrphanChunkWrappers(),
    pruneOrphanChunkWrappers: () => pruneOrphanChunkWrappers(),
    viewState: () => ({
      mapTiles: mapTilesInput.checked,
      cosmeticsMode: cosmeticBlocksModeInput.value,
      visualDetailMode: visualDetailMode(),
      landMotion: landMotionInput.checked,
      terrainLoadSlots: terrainLoadConcurrency(),
      terrainSpawnFrame: terrainPromotionsPerFrame(),
      terrainSpawnMs: terrainPromotionBudgetMs(),
      shade: treeShadeInput.checked,
      mapTime: mapTimeInput.checked,
      water: waterModeValue(),
      fog: {
        enabled: fogEnabledInput.checked,
        near: fogControlRange().near,
        far: fogControlRange().far,
        strength: readFloatControl(fogStrengthValueInput, 0.9),
        horizon: readFloatControl(fogHorizonValueInput, 0.65),
      },
      players: showPlayersInput.checked,
      mobs: showMobsInput.checked,
      mobBlocks: mobBlocksEnabled(),
      auto: autoStreamInput.checked,
      bounds: debugBoundsInput.checked,
    }),
    skySummary: () => ({
      background: displayColor(scene.background),
      fogType: scene.fog?.isFogExp2 ? 'FogExp2' : (scene.fog?.isFog ? 'Fog' : null),
      fogNear: scene.fog?.near ?? null,
      fogFar: scene.fog?.far ?? null,
      fogDensity: scene.fog?.density ?? null,
      fogColor: displayColor(scene.fog?.color),
      postFogEnabled: postProcessing.enabled,
      postFogNear: postProcessing.fogPass.uniforms.fogNear.value,
      postFogFar: postProcessing.fogPass.uniforms.fogFar.value,
      postFogStrength: postProcessing.fogPass.uniforms.fogStrength.value,
      postFogHorizon: postProcessing.fogPass.uniforms.horizonStrength.value,
      postFogColor: displayColor(postProcessing.fogPass.uniforms.fogColor.value),
      starsVisible: lightingRig.stars.visible === true,
      skyVisible: lightingRig.sky.visible === true,
    }),
    lightingSummary: () => ({
      ambientIntensity: lightingRig.ambient.intensity,
      sunIntensity: lightingRig.sun.intensity,
      starsOpacity: lightingRig.stars.material.opacity,
    }),
    setWorldTimeForTest: (time) => {
      runtime.worldTime = time;
      mapTimeInput.checked = true;
      applyLighting();
      timeRibbon.update(runtime.worldTime);
    },
    flyLook: () => ({
      yaw: runtime.flyYaw,
      pitch: runtime.flyPitch,
      pointerLocked: isFlyLookActive(),
    }),
    applyFlyLookDelta: (movementX, movementY) => {
      runtime.flyYaw -= Number(movementX) * FLY_MOUSE_SENSITIVITY;
      runtime.flyPitch -= Number(movementY) * FLY_MOUSE_SENSITIVITY;
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
        if (material?.name !== 'terrascape-water' && material?.userData?.terrascapeWater !== true) continue;
        summaries.push({
          type: material.type,
          vertexColors: material.vertexColors === true,
          toneMapped: material.toneMapped === true,
          fog: material.fog === true,
          transparent: material.transparent === true,
          opacity: material.opacity,
          color: material.userData?.terrascapeWaterColor ? displayColor(material.userData.terrascapeWaterColor) : null,
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
  if (!color?.clone) return null;
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
  if (!runtime.storedViewState || hasExplicitViewParams()) {
    return false;
  }
  const cameraState = runtime.storedViewState.camera;
  const targetState = runtime.storedViewState.target;
  if (!isVectorState(cameraState) || !isVectorState(targetState)) {
    return false;
  }

  camera.position.set(cameraState.x, cameraState.y, cameraState.z);
  controls.target.set(targetState.x, targetState.y, targetState.z);
  controls.update();
  syncFlyLookFromCamera();
  runtime.hasFocusedInitialGrid = true;
  runtime.hasRestoredCameraPose = true;
  return true;
}

function hasExplicitViewParams() {
  return ['world', 'chunkX', 'chunkZ', 'radius'].some((name) => initialParams.has(name));
}

function saveViewState() {
  if (!runtime.hasStarted || !worldSelect.value) return;
  const target = controls.target;
  const chunk = playerChunk();
  const state = {
    world: worldSelect.value,
    visualDefaultsVersion: VISUAL_DEFAULTS_VERSION,
    chunkX: Number.parseInt(chunkXInput.value, 10) || chunk.chunkX,
    chunkZ: Number.parseInt(chunkZInput.value, 10) || chunk.chunkZ,
    radius: radiusValue(),
    auto: autoStreamInput.checked,
    bounds: debugBoundsInput.checked,
    players: showPlayersInput.checked,
    mobs: showMobsInput.checked,
    mobBlocks: mobBlocksEnabled(),
    renderDetails: !infoCardEl.classList.contains('collapsed'),
    shade: treeShadeInput.checked,
    mapTime: mapTimeInput.checked,
    mapTiles: mapTilesInput.checked,
    cosmeticsMode: cosmeticBlocksModeInput.value,
    visualDetailMode: visualDetailMode(),
    landMotion: landMotionInput.checked,
    terrainLoadSlots: terrainLoadConcurrency(),
    terrainSpawnFrame: terrainPromotionsPerFrame(),
    terrainSpawnMs: terrainPromotionBudgetMs(),
    shadeSize: Number.parseFloat(shadeSizeValueInput.value),
    shadeDarkness: Number.parseFloat(shadeDarknessValueInput.value),
    water: waterModeValue(),
    fog: fogEnabledInput.checked,
    fogNear: fogControlRange().near,
    fogFar: fogControlRange().far,
    fogStrength: readFloatControl(fogStrengthValueInput, 0.9),
    fogHorizon: readFloatControl(fogHorizonValueInput, 0.65),
    playerRate: playerUpdateRateInput.value,
    camera: vectorState(camera.position),
    target: vectorState(target),
  };
  if (saveStoredViewState(state)) {
    runtime.storedViewState = state;
  }
}

function maybeSaveViewState() {
  if (runtime.viewPlayerUuid || runtime.followPlayerUuid) return;
  const now = performance.now();
  if (now - runtime.lastViewStateSave < 500) return;
  runtime.lastViewStateSave = now;
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
  const focusedMarker = playerMarkers.get(runtime.viewPlayerUuid) ?? playerMarkers.get(runtime.followPlayerUuid);
  const targetPosition = focusedMarker?.userData?.targetPosition;
  if (targetPosition) {
    return targetPosition;
  }
  if (focusedMarker?.position) {
    return focusedMarker.position;
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

function updateChunkPlaceholders() {
  const world = worldSelect.value;
  if (!world || !runtime.hasFocusedInitialGrid) {
    return;
  }
  const radius = radiusValue();
  const player = playerChunk();
  const playerId = centerId(world, player.chunkX, player.chunkZ);
  const shouldShow = autoStreamInput.checked
    || runtime.requestedCenterId != null
    || (runtime.activeCenterId != null && playerId !== runtime.activeCenterId);
  if (!shouldShow) {
    chunkPlaceholderManager.sync(world, [], new Set(loadedChunks.keys()));
    return;
  }
  const keys = chunkKeysForWorld(world, player.chunkX, player.chunkZ, radius);
  chunkPlaceholderManager.sync(world, keys, new Set(loadedChunks.keys()));
}

function syncFlyLookFromCamera() {
  camera.getWorldDirection(tempCameraForward);
  if (tempCameraForward.lengthSq() < 0.0001) return;
  runtime.flyYaw = Math.atan2(-tempCameraForward.x, -tempCameraForward.z);
  runtime.flyPitch = Math.asin(Math.max(-1, Math.min(1, tempCameraForward.y)));
}

function applyFlyLook() {
  runtime.flyPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, runtime.flyPitch));
  tempFlyEuler.set(runtime.flyPitch, runtime.flyYaw, 0);
  camera.quaternion.setFromEuler(tempFlyEuler);
  updateFlyTarget();
}

function updateFlyTarget() {
  camera.getWorldDirection(tempCameraForward);
  tempCenteredPivot.copy(camera.position).addScaledVector(tempCameraForward, FLY_LOOK_DISTANCE);
  controls.target.copy(tempCenteredPivot);
}

function zoomFlyView(deltaY) {
  if (runtime.viewPlayerUuid || !Number.isFinite(deltaY) || deltaY === 0) return;
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

function scheduleAutoStreamLoad() {
  const world = worldSelect.value;
  if (!world) return;
  const player = playerChunk();
  runtime.scheduledCenterId = null;
  clearTimeout(runtime.streamTimer);
  runtime.streamTimer = null;
  loadGrid({ centerX: player.chunkX, centerZ: player.chunkZ, streamLoad: true }).catch((error) => setStatus(error.message));
}

function maybeAutoStream() {
  if (!autoStreamInput.checked || !runtime.hasFocusedInitialGrid || !worldSelect.value) return;
  const player = playerChunk();
  const playerId = centerId(worldSelect.value, player.chunkX, player.chunkZ);
  if (playerId === runtime.activeCenterId || playerId === runtime.requestedCenterId || playerId === runtime.scheduledCenterId) {
    return;
  }

  clearTimeout(runtime.streamTimer);
  runtime.scheduledCenterId = playerId;
  runtime.streamTimer = setTimeout(() => {
    runtime.streamTimer = null;
    runtime.scheduledCenterId = null;
    scheduleAutoStreamLoad();
  }, AUTO_STREAM_DEBOUNCE_MS);
}

function scheduleControlGridLoad() {
  if (!runtime.hasStarted) return;
  clearTimeout(runtime.controlLoadTimer);
  runtime.controlLoadTimer = setTimeout(() => {
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
  if (runtime.viewPlayerUuid || pressedKeys.size === 0 || isTypingInHud()) return;

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

function updateMobMarkers(deltaSeconds) {
  const alpha = 1 - Math.exp(-deltaSeconds * 5);
  const opacityAlpha = 1 - Math.exp(-deltaSeconds * MOB_MARKER_DISTANCE_OPACITY_LERP);
  const playerHeightSource = playerMarkers.get(runtime.viewPlayerUuid) ?? playerMarkers.get(runtime.followPlayerUuid);
  const desiredWorldY = playerHeightSource
    ? playerHeightSource.position.y + MOB_CARD_PLAYER_HEIGHT
    : camera.position.y;
  const updateBillboards = !runtime.hasMobBillboardQuaternion
    || lastMobBillboardQuaternion.angleTo(camera.quaternion) > 0.0005;
  if (updateBillboards) {
    lastMobBillboardQuaternion.copy(camera.quaternion);
    runtime.hasMobBillboardQuaternion = true;
  }
  for (const marker of mobMarkers.values()) {
    const targetPosition = marker.userData.targetPosition;
    if (targetPosition) {
      tempMobTarget.copy(targetPosition);
      tempMobTarget.y += 0.25;
      marker.position.lerp(tempMobTarget, alpha);
      const cardHeight = clamp(
        desiredWorldY - targetPosition.y,
        MOB_CARD_MIN_HEIGHT,
        MOB_CARD_TREE_TOP_HEIGHT,
      );
      if (!Number.isFinite(marker.userData.cardHeight)
          || Math.abs(marker.userData.cardHeight - cardHeight) > 0.05) {
        updateMobMarkerHeight(marker, cardHeight);
        marker.userData.cardHeight = cardHeight;
      }
    }
    const badge = marker.userData.badge;
    if (badge && updateBillboards) {
      badge.quaternion.copy(camera.quaternion);
    }
    applyMobMarkerDistanceOpacity(marker, opacityAlpha);
  }
}

function applyMobMarkerDistanceOpacity(marker, alpha = 1) {
  const distance = marker.position.distanceTo(camera.position);
  const cardOpacity = distanceOpacity(distance, MOB_MARKER_CARD_MIN_OPACITY);
  const pointerOpacity = distanceOpacity(distance, MOB_MARKER_POINTER_MIN_OPACITY);
  const glowOpacity = distanceOpacity(distance, MOB_MARKER_GLOW_MIN_OPACITY);
  const current = Number.isFinite(marker.userData.distanceOpacity)
    ? marker.userData.distanceOpacity
    : cardOpacity;
  const next = current + (cardOpacity - current) * clamp(alpha, 0, 1);
  marker.userData.distanceOpacity = next;
  applyMaterialOpacity(marker.userData.badge, next);
  applyMaterialOpacity(marker.userData.pointer, pointerOpacity);
  applyMaterialOpacity(marker.getObjectByName('mob-ground-glow'), glowOpacity);
}

function distanceOpacity(distance, minOpacity) {
  const t = clamp(
    (distance - MOB_MARKER_FADE_NEAR_DISTANCE) / (MOB_MARKER_FADE_FAR_DISTANCE - MOB_MARKER_FADE_NEAR_DISTANCE),
    0,
    1,
  );
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth * (1 - minOpacity);
}

function applyMaterialOpacity(object, opacityScale) {
  if (!object?.material) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    if (!material || material.userData?.terrascapeShared === true) continue;
    const baseOpacity = Number.isFinite(material.userData.terrascapeBaseOpacity)
      ? material.userData.terrascapeBaseOpacity
      : material.opacity;
    material.userData.terrascapeBaseOpacity = baseOpacity;
    const nextOpacity = clamp(baseOpacity * opacityScale, 0, 1);
    if (Math.abs((material.opacity ?? 1) - nextOpacity) < 0.003) continue;
    material.opacity = nextOpacity;
    material.transparent = true;
    material.needsUpdate = true;
  }
}

function updatePlayerCameraMode(deltaSeconds) {
  if (runtime.viewPlayerUuid) {
    updateEyeCamera(deltaSeconds);
    return;
  }
  if (runtime.followPlayerUuid) {
    updateWalkFollowCamera(deltaSeconds);
  }
}

function resetPlayerEyeState(uuid) {
  const marker = playerMarkers.get(uuid);
  if (!marker) return;
  playerEyeState.uuid = uuid;
  playerEyeState.yawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : 0;
  playerEyeState.pitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
}

function updateEyeCamera(deltaSeconds = 0) {
  const marker = playerMarkers.get(runtime.viewPlayerUuid);
  if (!marker) {
    setPlayerEyeView(null);
    return;
  }
  if (playerEyeState.uuid !== runtime.viewPlayerUuid) {
    resetPlayerEyeState(runtime.viewPlayerUuid);
  }
  const targetYawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : playerEyeState.yawRad;
  const targetPitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
  const alpha = deltaSeconds > 0 ? 1 - Math.exp(-deltaSeconds * PLAYER_EYE_ROTATION_LERP) : 1;
  playerEyeState.yawRad = lerpAngle(playerEyeState.yawRad, targetYawRad, alpha);
  playerEyeState.pitchRad = THREE.MathUtils.lerp(playerEyeState.pitchRad, targetPitchRad, alpha);

  const lookDistance = 12;
  const cosPitch = Math.cos(playerEyeState.pitchRad);
  tempPlayerForward.set(
    -Math.sin(playerEyeState.yawRad) * cosPitch,
    Math.sin(playerEyeState.pitchRad),
    -Math.cos(playerEyeState.yawRad) * cosPitch,
  );
  tempPlayerCamera.copy(marker.position);
  tempPlayerCamera.y += 2.45;
  tempPlayerCamera.addScaledVector(tempPlayerForward, 0.44);
  tempPlayerLook.copy(tempPlayerCamera).addScaledVector(tempPlayerForward, lookDistance);
  camera.position.copy(tempPlayerCamera);
  controls.target.copy(tempPlayerLook);
  camera.lookAt(tempPlayerLook);
}

function playerCameraYawRad(yawDeg) {
  // Hytale client yaw arrives in degrees. Keep the sign direct for this FPV rig:
  // negating it makes real left turns render as right turns.
  return THREE.MathUtils.degToRad(Number(yawDeg || 0));
}

function playerCameraPitchRad(pitchDeg) {
  return THREE.MathUtils.degToRad(clamp(Number(pitchDeg || 0), -89, 89));
}

function updateWalkFollowCamera(deltaSeconds) {
  const marker = playerMarkers.get(runtime.followPlayerUuid);
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

function animate() {
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  const elapsedSeconds = clock.elapsedTime;
  frameJank.recordFrame();
  chunkLandMotion.update(loadedChunks.values());
  tickMapTileMotion(landMotionEnabled());
  updatePlayerMarkers(deltaSeconds);
  updateMobMarkers(deltaSeconds, elapsedSeconds);
  handleKeyboardNavigation(deltaSeconds);
  updatePlayerCameraMode(deltaSeconds);
  if (!runtime.viewPlayerUuid && !runtime.followPlayerUuid) {
    updateFlyTarget();
  }
  if (controls.enabled) {
    controls.update();
  }
  positionSkyObjects(lightingRig, camera.position);
  updateMapDistanceFog();
  updateEmptyGrid();
  updateChunkPlaceholders();
  chunkPlaceholderManager.update(deltaSeconds);
  updateFpsCounter(fpsCounter, deltaSeconds);
  maybeAutoStream();
  updateCoordinates();
  updateWaterMaterials(scene, renderer, elapsedSeconds, camera);
  renderPostProcessing(postProcessing, renderer, scene, camera, deltaSeconds, elapsedSeconds);
  maybeUpdateMetrics();
  maybeSaveViewState();
  requestAnimationFrame(animate);
}

function reloadTerrainForVisualOptions() {
  for (const [id, entry] of Array.from(loadedChunks.entries())) {
    finishDisposeChunk(id, entry);
  }
  scheduleControlGridLoad();
}

setRenderDetailsOpen(!runtime.storedViewState || runtime.storedViewState.renderDetails !== false);
bindAppEvents({
  renderer,
  pressedKeys,
  getViewPlayerUuid: () => runtime.viewPlayerUuid,
  getFollowPlayerUuid: () => runtime.followPlayerUuid,
  applyFlyLookDelta: (movementX, movementY) => {
    runtime.flyYaw -= movementX * FLY_MOUSE_SENSITIVITY;
    runtime.flyPitch -= movementY * FLY_MOUSE_SENSITIVITY;
    applyFlyLook();
  },
  applyFogSettings,
  applyLighting,
  applyMapWaterTint,
  applyWaterMode,
  clearMobs,
  closeEntityStream,
  handleClearMeshCache,
  refreshWorldTime,
  restartEntityStream,
  restartMobPolling,
  restartPlayerPolling,
  restartWorldTimePolling,
  saveViewState,
  scheduleControlGridLoad,
  setRadiusControlValue,
  shouldStartFlyLook,
  syncMobBlocksInputs,
  toggleRenderDetails,
  updateDebugBounds,
  updateEntityVisibility,
  updateMapTileLayer,
  updatePlayers,
  updateRadiusReadout,
  zoomFlyView,
  reloadTerrainForVisualOptions,
  resize,
});
applyInitialParams();
setRadiusControlValue(radiusValue());
exposeDebugState();
resize();
timeRibbon.update(runtime.worldTime);
animate();
await loadWorlds();
await npcCatalog.load();
if (worldSelect.value) {
  runtime.hasStarted = true;
  const restoredCameraPose = restoreCameraPose();
  await refreshWorldTime();
  await loadGrid({ focus: !restoredCameraPose }).catch((error) => setStatus(error.message));
  restartEntityStream();
  restartPlayerPolling();
  restartMobPolling();
  restartWorldTimePolling();
  saveViewState();
}

