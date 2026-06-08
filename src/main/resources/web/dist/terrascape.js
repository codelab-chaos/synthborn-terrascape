import * as __WEBPACK_EXTERNAL_MODULE_three__ from "three";
import * as __WEBPACK_EXTERNAL_MODULE_three_addons_controls_OrbitControls_js_30cef365__ from "three/addons/controls/OrbitControls.js";
import * as __WEBPACK_EXTERNAL_MODULE_three_addons_loaders_GLTFLoader_js_5f8ad198__ from "three/addons/loaders/GLTFLoader.js";
import * as __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_EffectComposer_js_5fede484__ from "three/addons/postprocessing/EffectComposer.js";
import * as __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_RenderPass_js_8f6528ce__ from "three/addons/postprocessing/RenderPass.js";
import * as __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_ShaderPass_js_85531946__ from "three/addons/postprocessing/ShaderPass.js";
/******/ var __webpack_modules__ = ({

/***/ "./src/main/resources/web/src/app.ts"
/*!*******************************************!*\
  !*** ./src/main/resources/web/src/app.ts ***!
  \*******************************************/
(module, __webpack_exports__, __webpack_require__) {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createMobMarker: () => (/* reexport safe */ _players_js__WEBPACK_IMPORTED_MODULE_1__.createMobMarker),
/* harmony export */   createPlayerMarker: () => (/* reexport safe */ _players_js__WEBPACK_IMPORTED_MODULE_1__.createPlayerMarker),
/* harmony export */   disposeObject: () => (/* reexport safe */ _players_js__WEBPACK_IMPORTED_MODULE_1__.disposeObject),
/* harmony export */   updateMobMarkerHeight: () => (/* reexport safe */ _players_js__WEBPACK_IMPORTED_MODULE_1__.updateMobMarkerHeight)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var _players_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./players.js */ "./src/main/resources/web/src/players.ts");
/* harmony import */ var three_addons_controls_OrbitControls_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! three/addons/controls/OrbitControls.js */ "three/addons/controls/OrbitControls.js");
/* harmony import */ var three_addons_loaders_GLTFLoader_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! three/addons/loaders/GLTFLoader.js */ "three/addons/loaders/GLTFLoader.js");
/* harmony import */ var _chunk_debug_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./chunk-debug.js */ "./src/main/resources/web/src/chunk-debug.ts");
/* harmony import */ var _chunk_placeholder_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./chunk-placeholder.js */ "./src/main/resources/web/src/chunk-placeholder.ts");
/* harmony import */ var _library_chunk_land_motion_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./library/chunk-land-motion.js */ "./src/main/resources/web/src/library/chunk-land-motion.ts");
/* harmony import */ var _frame_jank_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./frame-jank.js */ "./src/main/resources/web/src/frame-jank.ts");
/* harmony import */ var _dom_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./dom.js */ "./src/main/resources/web/src/dom.ts");
/* harmony import */ var _lighting_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./lighting.js */ "./src/main/resources/web/src/lighting.ts");
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./client-log.js */ "./src/main/resources/web/src/client-log.ts");
/* harmony import */ var _fps_counter_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./fps-counter.js */ "./src/main/resources/web/src/fps-counter.ts");
/* harmony import */ var _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./map-backdrop.js */ "./src/main/resources/web/src/map-backdrop.ts");
/* harmony import */ var _npc_catalog_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./npc-catalog.js */ "./src/main/resources/web/src/npc-catalog.ts");
/* harmony import */ var _player_tiles_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./player-tiles.js */ "./src/main/resources/web/src/player-tiles.ts");
/* harmony import */ var _postprocessing_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./postprocessing.js */ "./src/main/resources/web/src/postprocessing.ts");
/* harmony import */ var _time_ribbon_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./time-ribbon.js */ "./src/main/resources/web/src/time-ribbon.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./utils.js */ "./src/main/resources/web/src/utils.ts");
/* harmony import */ var _view_state_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./view-state.js */ "./src/main/resources/web/src/view-state.ts");
/* harmony import */ var _water_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./water.js */ "./src/main/resources/web/src/water.ts");
/* harmony import */ var _library_confirm_dialog_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./library/confirm-dialog.js */ "./src/main/resources/web/src/library/confirm-dialog.ts");
/* harmony import */ var _library_collapsible_section_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./library/collapsible-section.js */ "./src/main/resources/web/src/library/collapsible-section.ts");
/* harmony import */ var _library_tri_state_control_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./library/tri-state-control.js */ "./src/main/resources/web/src/library/tri-state-control.ts");
/* harmony import */ var _mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./mesh-cache.js */ "./src/main/resources/web/src/mesh-cache.ts");

























const COSMETIC_MODE_VALUES = ['off', 'baked', 'split'];
const VISUAL_DETAIL_VALUES = ['basic', 'structures', 'all'];
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
        }
        else {
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
const renderer = new three__WEBPACK_IMPORTED_MODULE_0__.WebGLRenderer({ canvas: _dom_js__WEBPACK_IMPORTED_MODULE_8__.canvas, antialias: true });
const rendererPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(rendererPixelRatio);
renderer.setClearColor(SKY_COLOR, 1);
const scene = new three__WEBPACK_IMPORTED_MODULE_0__.Scene();
scene.background = new three__WEBPACK_IMPORTED_MODULE_0__.Color(SKY_COLOR);
scene.fog = null;
const camera = new three__WEBPACK_IMPORTED_MODULE_0__.PerspectiveCamera(70, 1, 0.1, 6000);
camera.position.set(88, 188, 88);
const controls = new three_addons_controls_OrbitControls_js__WEBPACK_IMPORTED_MODULE_2__.OrbitControls(camera, renderer.domElement);
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
    MIDDLE: three__WEBPACK_IMPORTED_MODULE_0__.MOUSE.PAN,
    RIGHT: three__WEBPACK_IMPORTED_MODULE_0__.MOUSE.DOLLY,
};
controls.touches = {
    ONE: three__WEBPACK_IMPORTED_MODULE_0__.TOUCH.PAN,
    TWO: three__WEBPACK_IMPORTED_MODULE_0__.TOUCH.DOLLY_ROTATE,
};
const FLY_MOUSE_BUTTONS = { ...controls.mouseButtons };
const FOLLOW_MOUSE_BUTTONS = {
    LEFT: three__WEBPACK_IMPORTED_MODULE_0__.MOUSE.ROTATE,
    MIDDLE: three__WEBPACK_IMPORTED_MODULE_0__.MOUSE.PAN,
    RIGHT: three__WEBPACK_IMPORTED_MODULE_0__.MOUSE.DOLLY,
};
const lightingRig = (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.createLightingRig)(scene, SKY_COLOR);
const postProcessing = (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_15__.createPostProcessing)(renderer, scene, camera);
const fpsCounter = (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_11__.createFpsCounter)(scene, camera, renderer);
const npcCatalog = (0,_npc_catalog_js__WEBPACK_IMPORTED_MODULE_13__.createNpcCatalog)({ logClientEvent: _client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent });
const timeRibbon = (0,_time_ribbon_js__WEBPACK_IMPORTED_MODULE_16__.createTimeRibbon)({
    labelEl: _dom_js__WEBPACK_IMPORTED_MODULE_8__.timeCycleLabelEl,
    sceneEl: _dom_js__WEBPACK_IMPORTED_MODULE_8__.skySceneEl,
    sunEl: _dom_js__WEBPACK_IMPORTED_MODULE_8__.skySunEl,
    moonEl: _dom_js__WEBPACK_IMPORTED_MODULE_8__.skyMoonEl,
    starsEl: _dom_js__WEBPACK_IMPORTED_MODULE_8__.skyStarsEl,
});
const grid = new three__WEBPACK_IMPORTED_MODULE_0__.GridHelper(EMPTY_GRID_SIZE, EMPTY_GRID_DIVISIONS, EMPTY_GRID_AXIS_COLOR, EMPTY_GRID_LINE_COLOR);
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
    material.transparent = true;
    material.opacity = 0.42;
    material.depthTest = true;
    material.depthWrite = false;
}
grid.renderOrder = -50;
scene.add(grid);
const loader = new three_addons_loaders_GLTFLoader_js__WEBPACK_IMPORTED_MODULE_3__.GLTFLoader();
const chunkPlaceholderManager = (0,_chunk_placeholder_js__WEBPACK_IMPORTED_MODULE_5__.createChunkPlaceholderManager)(scene);
const chunkLandMotion = (0,_library_chunk_land_motion_js__WEBPACK_IMPORTED_MODULE_6__.createChunkLandMotion)();
const frameJank = (0,_frame_jank_js__WEBPACK_IMPORTED_MODULE_7__.createFrameJankRecorder)();
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
let lastGridLoadTiming = null;
let lastTerrainStreamTiming = null;
let hasFocusedInitialGrid = false;
let activeCenterId = null;
let requestedCenterId = null;
let scheduledCenterId = null;
let mapTileLayerKey = null;
let streamTimer = null;
let gridLoadCount = 0;
let controlLoadTimer = null;
let playerPollTimer = null;
let mobPollTimer = null;
let entityStream = null;
let entityStreamWorld = null;
let entityStreamPlayers = null;
let entityStreamMobs = null;
let entityStreamFallbackTimer = null;
let playerConnectMobSampleTimer = null;
let lastMetricsUpdate = 0;
const pressedKeys = new Set();
const clock = new three__WEBPACK_IMPORTED_MODULE_0__.Clock();
const initialParams = new URLSearchParams(window.location.search);
let experimentalDetailsEnabled = false;
let terrainFormatVersion = 'unknown';
let storedViewState = (0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.loadStoredViewState)();
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
const playerEyeState = {
    uuid: null,
    yawRad: 0,
    pitchRad: 0,
};
let isRefreshingPlayers = false;
let lastPlayerCount = 0;
let lastPlayerPollFailed = false;
let isRefreshingMobs = false;
let lastMobCount = 0;
let lastMobPollFailed = false;
let entityStreamConnected = false;
let lastMobSourceStats = null;
let pendingMobMarkerUpdate = null;
let mobMarkerUpdateScheduled = false;
let mobMarkerUpdateGeneration = 0;
const tempPlayerTarget = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempMobTarget = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const lastMobBillboardQuaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
let hasMobBillboardQuaternion = false;
const tempPlayerCamera = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempPlayerLook = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempPlayerForward = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempPlayerCardQuaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const tempPlayerParentQuaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
const tempFollowDelta = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempCameraForward = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempCenteredPivot = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempFlyRight = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempFlyMove = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempFlyZoom = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempFlyEuler = new three__WEBPACK_IMPORTED_MODULE_0__.Euler(0, 0, 0, 'YXZ');
function currentLightingOptions() {
    return (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.lightingOptionsFromInputs)({
        treeShadeInput: _dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput,
        shadeSizeInput: _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeValueInput,
        shadeDarknessInput: _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessValueInput,
        time: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked ? worldTime : NOON_LIGHTING_TIME,
        fogRange: fogControlRange(),
    });
}
function fogControlRange() {
    const near = terrainTuningValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearValueInput, 150);
    const far = Math.max(near + 1, terrainTuningValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarValueInput, 620));
    return {
        near,
        far,
    };
}
function fogControlOptions() {
    const range = fogControlRange();
    return {
        enabled: _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput.checked,
        near: range.near,
        far: range.far,
        strength: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput, 0.9),
        horizonStrength: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput, 0.65),
        color: scene.userData.terrascapeFog?.color ?? scene.background,
    };
}
function setStatus(text) {
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.statusEl.textContent = text;
}
async function handleClearMeshCache() {
    const stats = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.getMeshCacheStats)();
    const entryLabel = stats.total === 1 ? 'entry' : 'entries';
    const confirmed = await (0,_library_confirm_dialog_js__WEBPACK_IMPORTED_MODULE_20__.confirmAction)({
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
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.clearMeshCacheButton.disabled = true;
    setStatus('Clearing mesh cache…');
    try {
        const cleared = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.clearMeshCache)();
        for (const [id, entry] of Array.from(loadedChunks.entries())) {
            finishDisposeChunk(id, entry);
        }
        mapTileLayerKey = null;
        updateMapTileLayer({ force: true });
        scheduleControlGridLoad();
        const clearedLabel = cleared.total === 1 ? 'entry' : 'entries';
        setStatus(cleared.total > 0
            ? `Cleared ${cleared.total} cached ${clearedLabel}; reloading meshes`
            : 'Mesh cache already empty; reloading from server');
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mesh_cache_cleared', {
            terrain: cleared.terrain,
            mapTiles: cleared.mapTiles,
            total: cleared.total,
        });
    }
    catch (error) {
        setStatus(`Mesh cache clear failed: ${error?.message || error}`);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mesh_cache_clear_failed', {
            message: error?.message || String(error),
        });
    }
    finally {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.clearMeshCacheButton.disabled = false;
    }
}
function mapTileRetainRadius(terrainRadius, streamLoad = false) {
    return streamLoad
        ? terrainRadius + AUTO_STREAM_RETAIN_MARGIN + _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.MAP_HORIZON_MARGIN
        : terrainRadius + _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.MAP_HORIZON_MARGIN;
}
function terrainLoadConcurrency() {
    return terrainTuningValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsValueInput, DEFAULT_TERRAIN_LOAD_CONCURRENCY);
}
function terrainPromotionBudgetMs() {
    return terrainTuningValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetValueInput, DEFAULT_TERRAIN_PROMOTION_BUDGET_MS);
}
function terrainPromotionsPerFrame() {
    return terrainTuningValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameValueInput, DEFAULT_TERRAIN_PROMOTIONS_PER_FRAME);
}
function terrainTuningValue(input, fallback) {
    const parsed = Number.parseInt(input?.value, 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    const min = Number.parseInt(input.min, 10);
    const max = Number.parseInt(input.max, 10);
    return (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(parsed, Number.isFinite(min) ? min : 1, Number.isFinite(max) ? max : 64);
}
function readFloatControl(input, fallback) {
    const parsed = Number.parseFloat(input?.value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    const min = Number.parseFloat(input.min);
    const max = Number.parseFloat(input.max);
    return (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(parsed, Number.isFinite(min) ? min : -Infinity, Number.isFinite(max) ? max : Infinity);
}
function createTerrainStreamStats(world, centerX, centerZ, radius, needed, alreadyLoaded, missing, startedAt) {
    return {
        world,
        centerX,
        centerZ,
        radius,
        needed,
        alreadyLoaded,
        missing,
        startedAt,
        lastProgressLogAt: startedAt,
        requested: 0,
        dataReady: 0,
        promoted: alreadyLoaded,
        failed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        networkChunks: 0,
        maxQueue: 0,
        maxReadyWaitMs: 0,
        totalReadyWaitMs: 0,
    };
}
function terrainStreamSnapshot(stats, queueLength, inFlightCount, final = false) {
    const elapsedMs = Math.max(1, performance.now() - stats.startedAt);
    const spawnedMissing = Math.max(0, stats.promoted - stats.alreadyLoaded);
    const avgReadyWaitMs = spawnedMissing > 0 ? stats.totalReadyWaitMs / spawnedMissing : 0;
    return {
        world: stats.world,
        centerX: stats.centerX,
        centerZ: stats.centerZ,
        radius: stats.radius,
        needed: stats.needed,
        alreadyLoaded: stats.alreadyLoaded,
        missing: stats.missing,
        requested: stats.requested,
        dataReady: stats.dataReady,
        promoted: stats.promoted,
        spawnedMissing,
        failed: stats.failed,
        queued: queueLength,
        inFlight: inFlightCount,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        networkChunks: stats.networkChunks,
        maxQueue: stats.maxQueue,
        maxReadyWaitMs: Math.round(stats.maxReadyWaitMs),
        avgReadyWaitMs: Math.round(avgReadyWaitMs),
        requestedPerSec: Math.round((stats.requested * 1000 / elapsedMs) * 10) / 10,
        readyPerSec: Math.round((stats.dataReady * 1000 / elapsedMs) * 10) / 10,
        spawnPerSec: Math.round((spawnedMissing * 1000 / elapsedMs) * 10) / 10,
        loadSlots: terrainLoadConcurrency(),
        spawnFrame: terrainPromotionsPerFrame(),
        spawnBudgetMs: terrainPromotionBudgetMs(),
        elapsedMs: Math.round(elapsedMs),
        final,
    };
}
function maybeLogTerrainStreamProgress(stats, queueLength, inFlightCount, force = false, final = false) {
    const now = performance.now();
    if (!force && now - stats.lastProgressLogAt < TERRAIN_STREAM_PROGRESS_LOG_MS) {
        return;
    }
    stats.lastProgressLogAt = now;
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)(final ? 'terrain_stream_summary' : 'terrain_stream_progress', terrainStreamSnapshot(stats, queueLength, inFlightCount, final));
}
function updateMetrics() {
    lastMetricsUpdate = performance.now();
    const loaded = loadedChunks.size;
    const center = activeCenterId ? activeCenterId.split(':').slice(1).join(', ') : 'pending';
    const resources = collectResourceStats();
    const rendererMemory = renderer.info.memory;
    const mapBackdrop = (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapBackdropStats)();
    const mapTiles = (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapTileSceneStats)();
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricLoadedEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'}`
        + (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked && mapTiles.meshCount > 0
            ? ` · map ${mapTiles.visibleCount}/${mapTiles.meshCount}`
                + (mapTiles.bytes > 0 ? ` ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatBytes)(mapTiles.bytes)}` : '')
            : '');
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricMeshesEl.textContent = `${resources.meshes}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricMobsEl.textContent = mobMetricText();
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.metricCenterEl.textContent = center;
}
function maybeUpdateMetrics(force = false) {
    const now = performance.now();
    if (!force && now - lastMetricsUpdate < METRICS_UPDATE_INTERVAL_MS) {
        return;
    }
    updateMetrics();
}
function mobMetricText() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked) {
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
async function loadWorlds() {
    setStatus('Loading worlds');
    const response = await fetch('/api/worlds');
    const data = await response.json();
    experimentalDetailsEnabled = data.features?.experimentalDetails === true;
    terrainFormatVersion = data.features?.terrainFormatVersion ?? terrainFormatVersion;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.replaceChildren();
    for (const world of data.worlds ?? []) {
        const option = document.createElement('option');
        option.value = world.name;
        option.textContent = world.name;
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.append(option);
    }
    applyStoredWorld();
    applyInitialWorldParam();
    setStatus(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value ? 'Ready' : 'No worlds found');
}
function applyInitialParams() {
    applyStoredInputs();
    applyNumberParam('chunkX', _dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput);
    applyNumberParam('chunkZ', _dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput);
    applyNumberParam('radius', _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput);
    applyBooleanParam('auto', _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput);
    applyBooleanParam('bounds', _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput);
    applyBooleanParam('players', _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput);
    applyBooleanParam('mobs', _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput);
    applyBooleanParam('mobBlocks', _dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksInput);
    syncMobBlocksInputs(_dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksInput.checked);
    applyBooleanParam('shade', _dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput);
    applyBooleanParam('mapTiles', _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput);
    applyCosmeticModeParam();
    applySelectParam('visualDetail', _dom_js__WEBPACK_IMPORTED_MODULE_8__.visualDetailModeInput);
    applyBooleanParam('landMotion', _dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput);
    applyBooleanParam('mapTime', _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput);
    applyNumberParam('terrainLoadSlots', _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsValueInput);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsInput.value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsValueInput.value;
    applyNumberParam('terrainSpawnFrame', _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameValueInput);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameInput.value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameValueInput.value;
    applyNumberParam('terrainSpawnMs', _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetValueInput);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetInput.value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetValueInput.value;
    applyFloatParam('shadeSize', _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeValueInput);
    applyFloatParam('shadeDarkness', _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessValueInput);
    applySelectParam('water', _dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput);
    applyBooleanParam('fog', _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput);
    applyFloatParam('fogNear', _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearValueInput);
    applyFloatParam('fogFar', _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarValueInput);
    applyFloatParam('fogStrength', _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput);
    applyFloatParam('fogHorizon', _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput);
    applySelectParam('playerRate', _dom_js__WEBPACK_IMPORTED_MODULE_8__.playerUpdateRateInput);
    applyLighting();
    updateEntityVisibility();
}
function applyStoredInputs() {
    if (!storedViewState)
        return;
    if (storedViewState.visualDefaultsVersion !== VISUAL_DEFAULTS_VERSION) {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput, 'split');
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.visualDetailModeInput, 'all');
    }
    setNumberInput(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput, storedViewState.chunkX);
    setNumberInput(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput, storedViewState.chunkZ);
    setRadiusControlValue(storedViewState.radius);
    if (typeof storedViewState.auto === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked = storedViewState.auto;
    if (typeof storedViewState.bounds === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.checked = storedViewState.bounds;
    if (typeof storedViewState.players === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked = storedViewState.players;
    if (typeof storedViewState.mobs === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked = storedViewState.mobs;
    if (typeof storedViewState.mobBlocks === 'boolean')
        syncMobBlocksInputs(storedViewState.mobBlocks);
    if (typeof storedViewState.shade === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput.checked = storedViewState.shade;
    if (typeof storedViewState.mapTime === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked = storedViewState.mapTime;
    if (typeof storedViewState.mapTiles === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked = storedViewState.mapTiles;
    if (storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof storedViewState.cosmeticsMode === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput, storedViewState.cosmeticsMode);
    }
    if (storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof storedViewState.cosmetics === 'boolean' && !storedViewState.cosmeticsMode) {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput, storedViewState.cosmetics ? 'baked' : 'off');
    }
    if (storedViewState.visualDefaultsVersion === VISUAL_DEFAULTS_VERSION && typeof storedViewState.visualDetailMode === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.visualDetailModeInput, storedViewState.visualDetailMode);
    }
    if (typeof storedViewState.landMotion === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput.checked = storedViewState.landMotion;
    if (typeof storedViewState.renderDetails === 'boolean')
        setRenderDetailsOpen(storedViewState.renderDetails);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsValueInput, storedViewState.terrainLoadSlots);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameValueInput, storedViewState.terrainSpawnFrame);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetValueInput, storedViewState.terrainSpawnMs);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeValueInput, storedViewState.shadeSize);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessValueInput, storedViewState.shadeDarkness);
    if (typeof storedViewState.water === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput, storedViewState.water);
    }
    if (typeof storedViewState.fog === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput.checked = storedViewState.fog;
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearValueInput, storedViewState.fogNear);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarValueInput, storedViewState.fogFar);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput, storedViewState.fogStrength);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput, storedViewState.fogHorizon);
    if (typeof storedViewState.playerRate === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.playerUpdateRateInput, storedViewState.playerRate);
    }
}
function applyStoredWorld() {
    if (!storedViewState?.world)
        return;
    applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect, storedViewState.world);
}
function applyInitialWorldParam() {
    const world = initialParams.get('world');
    if (!world)
        return;
    for (const option of _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.options) {
        if (option.value === world) {
            _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value = world;
            return;
        }
    }
}
function applyNumberParam(name, input) {
    const value = initialParams.get(name);
    if (value === null || value.trim() === '')
        return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed))
        return;
    if (input === _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput) {
        setRadiusControlValue(parsed);
        return;
    }
    input.value = parsed;
}
function applyBooleanParam(name, input) {
    const value = initialParams.get(name);
    if (value === null)
        return;
    input.checked = ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
function applyCosmeticModeParam() {
    const mode = initialParams.get('cosmeticsMode');
    if (mode === 'off' || mode === 'baked' || mode === 'split') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput, mode);
        return;
    }
    const legacy = initialParams.get('cosmetics');
    if (legacy === null)
        return;
    applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput, ['1', 'true', 'yes', 'on'].includes(legacy.toLowerCase()) ? 'baked' : 'off');
}
function syncMobBlocksInputs(checked) {
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksInput.checked = checked === true;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksPanelInput.checked = checked === true;
}
function mobBlocksEnabled() {
    return _dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksInput.checked === true;
}
function cosmeticBlocksMode() {
    if (!experimentalDetailsEnabled)
        return 'off';
    const value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput?.value;
    return value === 'baked' || value === 'split' ? value : 'off';
}
function cosmeticBlocksBaked() {
    return cosmeticBlocksMode() === 'baked';
}
function cosmeticBlocksSplit() {
    return cosmeticBlocksMode() === 'split';
}
function visualDetailMode() {
    const value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.visualDetailModeInput?.value;
    return value === 'basic' || value === 'structures' || value === 'all' ? value : 'all';
}
function applyFloatParam(name, ...inputs) {
    const value = initialParams.get(name);
    if (value === null || value.trim() === '')
        return;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
        for (const input of inputs) {
            input.value = parsed;
        }
    }
}
function applySelectParam(name, input) {
    const value = initialParams.get(name);
    if (value === null)
        return;
    applySelectValue(input, value);
}
function applySelectValue(input, value) {
    if (!input)
        return;
    if (input.id === 'cosmetic-blocks-mode') {
        (0,_library_tri_state_control_js__WEBPACK_IMPORTED_MODULE_22__.applyTriStateValue)(input, value, COSMETIC_MODE_VALUES);
        return;
    }
    if (input.id === 'visual-detail-mode') {
        (0,_library_tri_state_control_js__WEBPACK_IMPORTED_MODULE_22__.applyTriStateValue)(input, value, VISUAL_DETAIL_VALUES);
        return;
    }
    if (input.tagName === 'SELECT') {
        for (const option of input.options) {
            if (option.value === value) {
                input.value = value;
                return;
            }
        }
        return;
    }
    input.value = value;
}
function setNumberInput(input, value) {
    if (Number.isFinite(value)) {
        input.value = value;
    }
}
function setRadiusControlValue(value) {
    const normalized = normalizePairedValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput, Math.round(Number(value)));
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.value = normalized;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.value = normalized;
    updateRadiusReadout();
    return normalized;
}
function radiusValue() {
    return Math.max(0, (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.numberOr)(Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.value, 10), 0));
}
function updateRadiusReadout() {
    const radius = radiusValue();
    const diameter = radius * 2 + 1;
    const chunks = diameter * diameter;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusDiameterEl.textContent = `${diameter} x ${diameter} chunks, ${chunks} meshes`;
}
function setPairedControlValue(rangeInput, numberInput, value) {
    if (!Number.isFinite(value))
        return;
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
    if (Number.isFinite(min))
        normalized = Math.max(min, normalized);
    if (Number.isFinite(max))
        normalized = Math.min(max, normalized);
    if (Number.isFinite(step) && step > 0) {
        normalized = Math.round(normalized / step) * step;
    }
    return Number.parseFloat(normalized.toFixed(4));
}
async function loadGrid(options = {}) {
    gridLoadCount++;
    const gridStarted = performance.now();
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    const centerX = options.centerX ?? Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput.value, 10);
    const centerZ = options.centerZ ?? Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput.value, 10);
    const radius = setRadiusControlValue(radiusValue());
    if (!world || Number.isNaN(centerX) || Number.isNaN(centerZ)) {
        setStatus('Choose a world and integer chunk coordinates');
        return;
    }
    const generation = ++loadGeneration;
    pruneOrphanChunkWrappers();
    const centerKey = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.centerId)(world, centerX, centerZ);
    requestedCenterId = centerKey;
    scheduledCenterId = null;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput.value = centerX;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput.value = centerZ;
    if (options.focus === true && !hasFocusedInitialGrid) {
        focusGrid(centerX, centerZ, radius);
        hasFocusedInitialGrid = true;
    }
    const needed = chunkKeys(centerX, centerZ, radius);
    const retainKeys = options.streamLoad === true
        ? chunkKeys(centerX, centerZ, radius + AUTO_STREAM_RETAIN_MARGIN)
        : needed;
    const mapRetainRadius = mapTileRetainRadius(radius, options.streamLoad === true);
    const mapRetainKeys = chunkKeys(centerX, centerZ, mapRetainRadius);
    const streamAnchor = playerChunk();
    retainOnly(world, retainKeys);
    syncMapTileLayer(mapRetainKeys);
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked) {
        const neededKeySet = new Set(needed.map((key) => `${key.chunkX}:${key.chunkZ}`));
        const horizonMapKeys = mapRetainKeys.filter((key) => !neededKeySet.has(`${key.chunkX}:${key.chunkZ}`));
        if (horizonMapKeys.length > 0) {
            void (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.loadMapTilesForKeys)(world, sortChunkKeysByPlayerDistance(horizonMapKeys, streamAnchor.chunkX, streamAnchor.chunkZ), { immediate: true, replace: true });
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
        if (generation !== loadGeneration)
            return;
        if (loadedChunks.has(key.id)) {
            completed++;
        }
        else {
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
        const streamStats = createTerrainStreamStats(world, centerX, centerZ, radius, needed.length, completed, missing.length, gridStarted);
        const enqueueNext = () => {
            if (nextMissing >= missing.length || generation !== loadGeneration)
                return;
            const key = missing[nextMissing++];
            streamStats.requested++;
            const task = loadTerrainChunkData(world, key, generation)
                .then((result) => {
                if (result.cacheReadMs)
                    cacheReadMs += result.cacheReadMs;
                if (result.cacheParseMs)
                    cacheParseMs += result.cacheParseMs;
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
        while ((inFlight.size > 0 || promotionQueue.length > 0) && generation === loadGeneration) {
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
            }
            else if (promotionQueue.length > 0) {
                await yieldToMain();
            }
        }
        if (generation !== loadGeneration)
            return;
        maybeLogTerrainStreamProgress(streamStats, promotionQueue.length, inFlight.size, true, true);
        if (generation !== loadGeneration)
            return;
        retainOnly(world, retainKeys);
        activeCenterId = centerKey;
        requestedCenterId = null;
        syncMapTileLayer(mapRetainKeys);
        if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked) {
            await (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.loadMapTilesForKeys)(world, needed, { immediate: true });
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
        lastGridLoadTiming = gridLoadTiming;
        lastTerrainStreamTiming = gridLoadTiming;
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientTiming)('grid_load', gridStarted, gridLoadTiming);
    }
    finally {
        if (generation === loadGeneration) {
            frameJank.setActiveLoadKind('none');
        }
    }
}
async function loadChunk(world, chunkX, chunkZ, generation) {
    const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.chunkId)(world, chunkX, chunkZ);
    if (loadedChunks.has(id))
        return true;
    const url = terrainUrl(world, chunkX, chunkZ);
    const started = performance.now();
    const mapTilePromise = _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked
        ? (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.loadMapTilesForKeys)(world, [{ chunkX, chunkZ }], { immediate: true })
        : Promise.resolve();
    const bytes = await fetchArrayBufferWithRetry(url);
    const gltf = await parseGltfBytes(bytes);
    await mapTilePromise;
    if (generation !== loadGeneration)
        return false;
    if (loadedChunks.has(id))
        return true;
    (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.writeTerrainCache)(terrainCacheKey(world, chunkX, chunkZ), bytes.slice(0), { source: 'single' });
    const entry = addChunkObject(world, chunkX, chunkZ, gltf.scene);
    if (entry && cosmeticBlocksSplit()) {
        void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('terrain_cosmetic_overlay_failed', {
                world,
                chunkX,
                chunkZ,
                error: error?.message ?? error,
            });
        });
    }
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientTiming)('terrain_single_load', started, { world, chunkX, chunkZ });
    return true;
}
async function loadTerrainChunkData(world, key, generation) {
    const cacheKey = terrainCacheKey(world, key.chunkX, key.chunkZ);
    const readStarted = performance.now();
    const cached = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.readTerrainCache)(cacheKey);
    const cacheReadMs = performance.now() - readStarted;
    if (generation !== loadGeneration) {
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
        }
        catch (error) {
            console.warn(`Cached terrain parse failed for ${key.chunkX},${key.chunkZ}`, error);
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('terrain_cache_parse_failed', {
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
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientTiming)('terrain_single_load', started, { world, chunkX: key.chunkX, chunkZ: key.chunkZ });
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
    while (queue.length > 0 && generation === loadGeneration) {
        if (promoted >= promotionsPerFrame
            || (promoted > 0 && performance.now() - started >= promotionBudgetMs)) {
            break;
        }
        const result = queue.shift();
        if (result.stale) {
            continue;
        }
        if (!result.ok) {
            failed++;
            if (streamStats)
                streamStats.failed++;
            console.warn(`Failed to load chunk ${result.key.chunkX},${result.key.chunkZ}`, result.error);
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('terrain_stream_chunk_failed', {
                world: _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value,
                chunkX: result.key.chunkX,
                chunkZ: result.key.chunkZ,
                error: result.error?.message ?? result.error,
            });
            continue;
        }
        if (generation !== loadGeneration) {
            break;
        }
        const resultWorld = result.world ?? _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
        const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.chunkId)(resultWorld, result.key.chunkX, result.key.chunkZ);
        if (!loadedChunks.has(id)) {
            const entry = addChunkObject(resultWorld, result.key.chunkX, result.key.chunkZ, result.gltf.scene);
            if (result.bytes) {
                (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.writeTerrainCache)(terrainCacheKey(resultWorld, result.key.chunkX, result.key.chunkZ), result.bytes.slice(0), { source: 'single' });
            }
            if (entry && cosmeticBlocksSplit()) {
                void loadCosmeticOverlayForEntry(entry, generation).catch((error) => {
                    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('terrain_cosmetic_overlay_failed', {
                        world: resultWorld,
                        chunkX: result.key.chunkX,
                        chunkZ: result.key.chunkZ,
                        error: error?.message ?? error,
                    });
                });
            }
            if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked) {
                void (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.loadMapTilesForKeys)(resultWorld, [result.key], { immediate: true });
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
function disposeObjectTree(object) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    object.traverse((node) => {
        if (node.geometry)
            geometries.add(node.geometry);
        if (node.material) {
            const objectMaterials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of objectMaterials) {
                materials.add(material);
                for (const value of Object.values(material)) {
                    if (value?.isTexture)
                        textures.add(value);
                }
            }
        }
    });
    for (const texture of textures)
        texture.dispose();
    for (const material of materials)
        material.dispose();
    for (const geometry of geometries)
        geometry.dispose();
    return {
        geometries: geometries.size,
        materials: materials.size,
        textures: textures.size,
    };
}
function countOrphanChunkWrappers(extraKeep = null) {
    const tracked = new Set();
    for (const entry of loadedChunks.values()) {
        tracked.add(entry.object);
    }
    if (extraKeep)
        tracked.add(extraKeep);
    let count = 0;
    for (const child of scene.children) {
        if (!child.name?.startsWith('chunk:'))
            continue;
        if (tracked.has(child))
            continue;
        count += 1;
    }
    return count;
}
function pruneOrphanChunkWrappers(extraKeep = null) {
    const tracked = new Set();
    for (const entry of loadedChunks.values()) {
        tracked.add(entry.object);
    }
    if (extraKeep)
        tracked.add(extraKeep);
    const removals = [];
    for (const child of scene.children) {
        if (!child.name?.startsWith('chunk:'))
            continue;
        if (tracked.has(child))
            continue;
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
    const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.chunkId)(world, chunkX, chunkZ);
    const existing = loadedChunks.get(id);
    if (existing) {
        finishDisposeChunk(id, existing);
    }
    pruneOrphanChunkWrappers();
    chunkPlaceholderManager.resolve(world, chunkX, chunkZ);
    const wrapper = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
    wrapper.name = chunkWrapperName(chunkX, chunkZ);
    wrapper.position.set(chunkX * 32, 0, chunkZ * 32);
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.prepareWaterMaterials)(object);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.tintWaterMaterialsFromMap)(object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.sampleMapBackdropColor);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.applyWaterModeToObject)(object, _dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput.value);
    const lightingOptions = currentLightingOptions();
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.applyLightingToObject)(object, lightingOptions);
    const shade = (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.createTreeShadeObject)(object, lightingOptions);
    if (shade) {
        object.add(shade);
    }
    const debug = (0,_chunk_debug_js__WEBPACK_IMPORTED_MODULE_4__.createChunkDebug)(chunkX, chunkZ, object);
    debug.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.checked;
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
    if (!cosmeticBlocksSplit() || generation !== loadGeneration)
        return false;
    const cacheKey = terrainCosmeticOverlayCacheKey(entry.world, entry.chunkX, entry.chunkZ);
    let bytes = null;
    const cached = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.readTerrainCache)(cacheKey);
    if (cached?.bytes) {
        bytes = cached.bytes;
    }
    else {
        bytes = await fetchArrayBufferWithRetry(terrainCosmeticOverlayUrl(entry.world, entry.chunkX, entry.chunkZ));
    }
    if (!cosmeticBlocksSplit() || generation !== loadGeneration)
        return false;
    const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.chunkId)(entry.world, entry.chunkX, entry.chunkZ);
    const current = loadedChunks.get(id);
    if (current !== entry)
        return false;
    const gltf = await parseGltfBytes(bytes);
    if (!cosmeticBlocksSplit() || generation !== loadGeneration || loadedChunks.get(id) !== entry)
        return false;
    attachCosmeticOverlay(entry, gltf.scene);
    if (!cached?.bytes) {
        (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.writeTerrainCache)(cacheKey, bytes.slice(0), { source: 'cosmetic-overlay' });
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
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.applyLightingToObject)(object, currentLightingOptions());
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
        }
        catch (error) {
            lastError = error;
            await (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.delay)(150 * attempt);
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
                id: (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.chunkId)(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value, chunkX, chunkZ),
            });
        }
    }
    return keys;
}
function sortChunkKeysByPlayerDistance(keys, playerChunkX, playerChunkZ) {
    return [...keys].sort((left, right) => {
        const leftDistance = chunkDistanceSq(left.chunkX, left.chunkZ, playerChunkX, playerChunkZ);
        const rightDistance = chunkDistanceSq(right.chunkX, right.chunkZ, playerChunkX, playerChunkZ);
        if (leftDistance !== rightDistance)
            return leftDistance - rightDistance;
        return left.chunkZ - right.chunkZ || left.chunkX - right.chunkX;
    });
}
function chunkDistanceSq(chunkX, chunkZ, centerX, centerZ) {
    const dx = chunkX - centerX;
    const dz = chunkZ - centerZ;
    return dx * dx + dz * dz;
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
    return _dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput?.checked !== false;
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
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    let meshes = 0;
    let triangles = 0;
    for (const entry of loadedChunks.values()) {
        entry.object.traverse((object) => {
            if (object.isMesh)
                meshes++;
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
                        if (value?.isTexture)
                            textures.add(value);
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
    const mode = waterModeValue();
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput.value !== mode) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput.value = mode;
    }
    for (const entry of loadedChunks.values()) {
        (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.tintWaterMaterialsFromMap)(entry.object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.sampleMapBackdropColor);
        (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.applyWaterModeToObject)(entry.object, mode);
    }
}
function waterModeValue() {
    const value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput.value;
    return value === 'solid' || value === 'transparent' || value === 'hidden' ? value : 'solid';
}
function terrainCacheKey(world, chunkX, chunkZ) {
    return (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.makeTerrainCacheKey)({
        world,
        chunkX,
        chunkZ,
        formatVersion: terrainFormatVersion,
        detailsEnabled: experimentalDetailsEnabled,
        cosmeticsMode: cosmeticBlocksBaked() ? 'baked' : 'plain',
        visualDetailMode: cosmeticBlocksBaked() ? visualDetailMode() : 'basic',
    });
}
function terrainUrl(world, chunkX, chunkZ) {
    const base = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb`;
    return cosmeticBlocksBaked() ? `${base}?cosmetics=1&visualDetail=${encodeURIComponent(visualDetailMode())}` : base;
}
function terrainCosmeticOverlayCacheKey(world, chunkX, chunkZ) {
    return (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_23__.makeTerrainCacheKey)({
        world,
        chunkX,
        chunkZ,
        formatVersion: terrainFormatVersion,
        detailsEnabled: experimentalDetailsEnabled,
        cosmeticsMode: 'split-overlay',
        visualDetailMode: visualDetailMode(),
    });
}
function terrainCosmeticOverlayUrl(world, chunkX, chunkZ) {
    return `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb?cosmetics=only&visualDetail=${encodeURIComponent(visualDetailMode())}`;
}
function applyMapWaterTint() {
    for (const entry of loadedChunks.values()) {
        (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.tintWaterMaterialsFromMap)(entry.object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.sampleMapBackdropColor);
    }
}
function mapBackdropCenter() {
    if (activeCenterId) {
        const parts = activeCenterId.split(':');
        const chunkX = Number.parseInt(parts[parts.length - 2], 10);
        const chunkZ = Number.parseInt(parts[parts.length - 1], 10);
        if (Number.isFinite(chunkX) && Number.isFinite(chunkZ)) {
            return { chunkX, chunkZ };
        }
    }
    const gridX = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput.value, 10);
    const gridZ = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput.value, 10);
    if (Number.isFinite(gridX) && Number.isFinite(gridZ)) {
        return { chunkX: gridX, chunkZ: gridZ };
    }
    return { chunkX: 0, chunkZ: 0 };
}
function syncMapTileLayer(retainKeys = null) {
    grid.visible = !_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked;
    (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.configureMapBackdrop)(scene, renderer, {
        enabled: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked,
        formatVersion: terrainFormatVersion,
        motionEnabled: landMotionEnabled(),
    });
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked) {
        updateMetrics();
        return;
    }
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    const keys = retainKeys ?? chunkKeys(Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput.value, 10), Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput.value, 10), radiusValue());
    const retainIds = new Set(keys.map((key) => key.id));
    (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.pruneMapTiles)(world, retainIds);
    const center = mapBackdropCenter();
    const terrainRadius = radiusValue();
    const mapRadius = mapTileRetainRadius(terrainRadius, _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked);
    const stats = (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapBackdropStats)();
    stats.centerX = center.chunkX;
    stats.centerZ = center.chunkZ;
    stats.radius = mapRadius;
    stats.chunks = mapRadius * 2 + 1;
    stats.anchorX = center.chunkX;
    stats.anchorZ = center.chunkZ;
    updateMetrics();
}
function updateMapTileLayer(options = {}) {
    const center = mapBackdropCenter();
    const radius = radiusValue();
    const mapRadius = mapTileRetainRadius(radius, _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked);
    const layerKey = `${_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value}:${center.chunkX}:${center.chunkZ}:${mapRadius}:${_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked}`;
    if (!options.force && layerKey === mapTileLayerKey) {
        return;
    }
    mapTileLayerKey = layerKey;
    const keys = chunkKeys(center.chunkX, center.chunkZ, mapRadius);
    syncMapTileLayer(keys);
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked) {
        const anchor = playerChunk();
        void (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.loadMapTilesForKeys)(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value, sortChunkKeysByPlayerDistance(keys, anchor.chunkX, anchor.chunkZ), { immediate: true, replace: true });
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
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.applyLightingEnvironment)(scene, renderer, lightingRig, options);
    applyFogSettings();
    for (const entry of loadedChunks.values()) {
        (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.applyLightingToObject)(entry.object, options);
        (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.updateTreeShadeObject)(entry.shade, options);
    }
}
function applyFogSettings() {
    const options = fogControlOptions();
    scene.fog = null;
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_15__.setFogOptions)(postProcessing, options);
}
function updateMapDistanceFog() {
    scene.fog = null;
}
async function refreshWorldTime() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value) {
        return;
    }
    try {
        const response = await fetch(`/api/time/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)}`);
        if (!response.ok) {
            throw new Error(`Time request failed: ${response.status}`);
        }
        const data = await response.json();
        if (data.ok) {
            worldTime = data;
            applyLighting();
            timeRibbon.update(worldTime);
        }
    }
    catch (error) {
        console.warn('World time refresh failed', error);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('world_time_refresh_failed', { error: error?.message ?? error });
    }
}
function worldTimePollDelayMs() {
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked) {
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
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value || isRefreshingPlayers) {
        return;
    }
    isRefreshingPlayers = true;
    try {
        const response = await fetch(`/api/players/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)}`);
        if (!response.ok) {
            throw new Error(`Player request failed: ${response.status}`);
        }
        const data = await response.json();
        lastPlayerPollFailed = false;
        updatePlayers(data.players ?? []);
    }
    catch (error) {
        lastPlayerPollFailed = true;
        console.warn('Player refresh failed', error);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('player_refresh_failed', { error: error?.message ?? error });
    }
    finally {
        isRefreshingPlayers = false;
    }
}
function playerUpdateRateMs() {
    const parsed = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.playerUpdateRateInput.value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYER_UPDATE_RATE_MS;
}
function playerPollDelayMs() {
    if (lastPlayerPollFailed) {
        return PLAYER_POLL_ERROR_MS;
    }
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked) {
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
    if (entityStreamConnected)
        return;
    playerPollTimer = setTimeout(async () => {
        await refreshPlayers();
        restartPlayerPolling();
    }, delayMs);
}
async function refreshMobs() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value || !liveMobFeedEnabled() || isRefreshingMobs) {
        return;
    }
    isRefreshingMobs = true;
    try {
        const response = await fetch(`/api/mobs/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)}`);
        if (!response.ok) {
            throw new Error(`Mob request failed: ${response.status}`);
        }
        const data = await response.json();
        lastMobPollFailed = false;
        lastMobSourceStats = data.sourceStats ?? null;
        scheduleMobMarkerUpdate(data.mobs ?? []);
    }
    catch (error) {
        lastMobPollFailed = true;
        console.warn('Mob refresh failed', error);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mob_refresh_failed', { error: error?.message ?? error });
    }
    finally {
        isRefreshingMobs = false;
    }
}
function mobPollDelayMs() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked) {
        return null;
    }
    if (!liveMobFeedEnabled()) {
        return EMPTY_MOB_POLL_MS;
    }
    if (lastMobPollFailed) {
        return MOB_POLL_ERROR_MS;
    }
    return lastMobCount > 0 ? MOB_POLL_MS : EMPTY_MOB_POLL_MS;
}
function restartMobPolling(delayMs = mobPollDelayMs()) {
    clearTimeout(mobPollTimer);
    mobPollTimer = null;
    if (delayMs === null || entityStreamConnected)
        return;
    mobPollTimer = setTimeout(async () => {
        await refreshMobs();
        restartMobPolling();
    }, delayMs);
}
function liveMobFeedEnabled() {
    return _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked && lastPlayerCount > 0;
}
function wantsEntityStream() {
    return _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value && (_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked || liveMobFeedEnabled());
}
function restartEntityStream() {
    clearTimeout(entityStreamFallbackTimer);
    if (!('EventSource' in window) || !wantsEntityStream()) {
        closeEntityStream();
        restartPlayerPolling();
        restartMobPolling();
        return;
    }
    const includePlayers = _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked;
    const includeMobs = liveMobFeedEnabled();
    if (entityStream
        && entityStreamWorld === _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value
        && entityStreamPlayers === includePlayers
        && entityStreamMobs === includeMobs) {
        return;
    }
    closeEntityStream();
    entityStreamWorld = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    entityStreamPlayers = includePlayers;
    entityStreamMobs = includeMobs;
    const params = new URLSearchParams({
        players: includePlayers ? '1' : '0',
        mobs: includeMobs ? '1' : '0',
    });
    entityStream = new EventSource(`/api/entities/stream/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)}?${params}`);
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
        }
        catch (error) {
            console.warn('Entity stream parse failed', error);
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('entity_stream_parse_failed', { error: error?.message ?? error });
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
        if (entityStreamConnected)
            return;
        restartPlayerPolling(0);
        restartMobPolling(0);
    }, ENTITY_STREAM_FALLBACK_DELAY_MS);
}
function applyEntitySnapshot(snapshot) {
    if (!snapshot?.ok)
        return;
    if (snapshot.world && snapshot.world !== _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)
        return;
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked) {
        updatePlayers(snapshot.players ?? []);
    }
    if (liveMobFeedEnabled()) {
        lastMobSourceStats = snapshot.mobSourceStats ?? null;
        scheduleMobMarkerUpdate(snapshot.mobs ?? []);
    }
}
function updatePlayers(players) {
    const previousPlayerCount = lastPlayerCount;
    lastPlayerCount = players.length;
    if (previousPlayerCount !== lastPlayerCount) {
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('player_count_changed', {
            players: lastPlayerCount,
            nextPollMs: playerPollDelayMs(),
        });
        restartWorldTimePolling();
        if (lastPlayerCount > previousPlayerCount) {
            schedulePlayerConnectMobSample(players);
        }
        if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked) {
            if (lastPlayerCount <= 0) {
                clearMobs();
            }
            restartEntityStream();
            restartMobPolling(lastPlayerCount > 0 ? 0 : mobPollDelayMs());
        }
    }
    const seen = new Set();
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.replaceChildren();
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.textContent = 'Players hidden';
    }
    else if (players.length === 0) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.replaceChildren();
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.textContent = 'No players';
    }
    else if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.childNodes.length === 1 && _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.firstChild.nodeType === Node.TEXT_NODE) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.replaceChildren();
    }
    let tileIndex = 0;
    for (const player of players) {
        seen.add(player.uuid);
        const existingMarker = playerMarkers.get(player.uuid);
        const markerIsLegacy = existingMarker && !existingMarker.userData.card;
        if (markerIsLegacy) {
            scene.remove(existingMarker);
            (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.disposeObject)(existingMarker);
            playerMarkers.delete(player.uuid);
        }
        const marker = playerMarkers.get(player.uuid) ?? (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.createPlayerMarker)(player);
        if (!existingMarker || markerIsLegacy) {
            marker.position.set(player.x, player.y, player.z);
            marker.rotation.y = playerCameraYawRad(player.yaw ?? 0);
        }
        marker.userData.targetPosition ??= new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        marker.userData.targetPosition.set(player.x, player.y, player.z);
        marker.userData.targetYaw = playerCameraYawRad(player.yaw ?? marker.userData.targetYawDeg ?? 0);
        marker.userData.targetYawDeg = player.yaw ?? marker.userData.targetYawDeg ?? 0;
        marker.userData.targetPitch = player.pitch ?? marker.userData.targetPitch ?? 0;
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked;
        marker.userData.player = player;
        (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updatePlayerMarkerCard)(marker, player);
        (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updatePlayerMarkerCardHeight)(marker, 4.35);
        playerMarkers.set(player.uuid, marker);
        if (!marker.parent) {
            scene.add(marker);
        }
        if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked) {
            continue;
        }
        const tile = playerTiles.get(player.uuid) ?? (0,_player_tiles_js__WEBPACK_IMPORTED_MODULE_14__.createPlayerTile)(player, playerTileContext());
        if (!playerTiles.has(player.uuid)) {
            playerTiles.set(player.uuid, tile);
        }
        (0,_player_tiles_js__WEBPACK_IMPORTED_MODULE_14__.updatePlayerTile)(tile, player, playerTileContext());
        ensurePlayerTileOrder(tile.element, tileIndex++);
    }
    for (const [uuid, marker] of playerMarkers) {
        if (!seen.has(uuid)) {
            scene.remove(marker);
            (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.disposeObject)(marker);
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
function playerTileContext() {
    return {
        activeViewUuid: viewPlayerUuid,
        activeFollowUuid: followPlayerUuid,
        onFocus: focusPlayer,
        onToggleEyeView: (uuid) => setPlayerEyeView(viewPlayerUuid === uuid ? null : uuid),
        onToggleFollow: (uuid) => setPlayerFollow(followPlayerUuid === uuid ? null : uuid),
    };
}
function ensurePlayerTileOrder(tileElement, index) {
    const current = _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.children[index] ?? null;
    if (current === tileElement) {
        return;
    }
    if (tileElement.parentElement !== _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.insertBefore(tileElement, current);
        return;
    }
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.insertBefore(tileElement, current);
}
function schedulePlayerConnectMobSample(players) {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value || !_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked)
        return;
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
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    if (!world || !_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked)
        return;
    try {
        const response = await fetch(`/api/mobs/${encodeURIComponent(world)}`);
        if (!response.ok) {
            throw new Error(`Mob sample request failed: ${response.status}`);
        }
        const data = await response.json();
        const mobs = Array.isArray(data.mobs) ? data.mobs : [];
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mob_connect_sample', {
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
    }
    catch (error) {
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mob_connect_sample_failed', { error: error?.message ?? error });
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
    if (!stats || typeof stats !== 'object')
        return null;
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
    if (![a?.x, a?.y, a?.z, b?.x, b?.y, b?.z].every(Number.isFinite))
        return Number.POSITIVE_INFINITY;
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
    cancelPendingMobMarkerUpdate();
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked && mobs.length > 0) {
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
            (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.disposeObject)(marker);
            mobMarkers.delete(id);
        }
    }
    updateEntityVisibility();
}
function scheduleMobMarkerUpdate(mobs) {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked && mobs.length > 0) {
        return;
    }
    const generation = ++mobMarkerUpdateGeneration;
    pendingMobMarkerUpdate = {
        generation,
        mobs,
        index: 0,
        seen: new Set(),
        removals: null,
        removalIndex: 0,
    };
    setMobCount(mobs.length);
    if (!mobMarkerUpdateScheduled) {
        mobMarkerUpdateScheduled = true;
        requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
    }
}
function cancelPendingMobMarkerUpdate() {
    mobMarkerUpdateGeneration++;
    pendingMobMarkerUpdate = null;
    mobMarkerUpdateScheduled = false;
}
function processPendingMobMarkerUpdate(generation) {
    mobMarkerUpdateScheduled = false;
    const update = pendingMobMarkerUpdate;
    if (!update)
        return;
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
            (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.disposeObject)(marker);
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
    pendingMobMarkerUpdate = null;
    updateEntityVisibility();
}
function schedulePendingMobMarkerUpdate(generation) {
    mobMarkerUpdateScheduled = true;
    requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
}
function setMobCount(count) {
    const previousMobCount = lastMobCount;
    lastMobCount = count;
    if (previousMobCount !== lastMobCount) {
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_10__.logClientEvent)('mob_count_changed', {
            mobs: lastMobCount,
            nextPollMs: mobPollDelayMs(),
        });
    }
}
function upsertMobMarker(mob) {
    const id = String(mob.id ?? `${mob.type}:${mob.x}:${mob.y}:${mob.z}`);
    const enrichedMob = npcCatalog.enrich(mob, id);
    const existingMarker = mobMarkers.get(id);
    const marker = existingMarker ?? (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.createMobMarker)(enrichedMob);
    if (!existingMarker) {
        marker.position.set(mob.x, mob.y, mob.z);
    }
    marker.userData.targetPosition ??= new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    marker.userData.targetPosition.set(mob.x, mob.y, mob.z);
    marker.userData.mob = enrichedMob;
    (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updateMobMarkerCard)(marker, enrichedMob);
    marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked;
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
    lastMobPollFailed = false;
    lastMobSourceStats = null;
}
function focusPlayer(uuid) {
    const marker = playerMarkers.get(uuid);
    if (!marker)
        return;
    const target = marker.position.clone().add(new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1.5, 0));
    const offset = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(34, 28, 34);
    resetCameraModes();
    controls.target.copy(target);
    camera.position.copy(target).add(offset);
    controls.update();
    syncFlyLookFromCamera();
    saveViewState();
    updatePlayers(currentPlayersFromMarkers());
}
function setPlayerEyeView(uuid) {
    if (uuid && !playerMarkers.has(uuid))
        return;
    if (uuid) {
        pushCameraMode('eye', uuid);
        resetPlayerEyeState(uuid);
        updateEyeCamera(0);
    }
    else if (viewPlayerUuid) {
        popCameraMode();
    }
    updatePlayers(currentPlayersFromMarkers());
    restartPlayerPolling();
}
function setPlayerFollow(uuid) {
    if (uuid && !playerMarkers.has(uuid))
        return;
    if (uuid) {
        pushCameraMode('follow', uuid);
    }
    else if (followPlayerUuid) {
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
    playerEyeState.uuid = null;
    setFollowControlsEnabled(false);
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
    if (!state)
        return false;
    if (state.viewPlayerUuid && !playerMarkers.has(state.viewPlayerUuid))
        return false;
    if (state.followPlayerUuid && !playerMarkers.has(state.followPlayerUuid))
        return false;
    camera.position.copy(state.camera);
    controls.target.copy(state.target);
    viewPlayerUuid = state.viewPlayerUuid;
    followPlayerUuid = state.followPlayerUuid;
    if (viewPlayerUuid) {
        resetPlayerEyeState(viewPlayerUuid);
    }
    else {
        playerEyeState.uuid = null;
    }
    setFollowControlsEnabled(Boolean(followPlayerUuid));
    controls.update();
    syncFlyLookFromCamera();
    saveViewState();
    return true;
}
function applyCameraMode(mode, uuid) {
    viewPlayerUuid = mode === 'eye' ? uuid : null;
    followPlayerUuid = mode === 'follow' ? uuid : null;
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
        entry.debug.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.checked;
    }
}
function setRenderDetailsOpen(open) {
    const isOpen = open === true;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardEl.classList.toggle('collapsed', !isOpen);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardHeadEl.setAttribute('aria-expanded', String(isOpen));
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardHeadEl.title = isOpen ? 'Hide render details' : 'Show render details';
}
function toggleRenderDetails() {
    setRenderDetailsOpen(_dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardEl.classList.contains('collapsed'));
    saveViewState();
}
function updateEntityVisibility() {
    for (const marker of playerMarkers.values()) {
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked;
    }
    for (const marker of mobMarkers.values()) {
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked;
        if (marker.userData.headshotBlock) {
            marker.userData.headshotBlock.visible = mobBlocksEnabled();
        }
    }
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked) {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.playersEl.textContent = 'Players hidden';
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
            connected: entityStreamConnected,
            world: entityStreamWorld,
            players: entityStreamPlayers,
            mobs: entityStreamMobs,
            liveMobFeed: liveMobFeedEnabled(),
            available: 'EventSource' in window,
        }),
        npcDetailsState: () => npcCatalog.state(),
        loadGrid: (options = {}) => loadGrid(options),
        auditMapTiles: () => (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.auditMapTiles)(scene),
        mapBackdropY: () => (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.resolveMapBackdropY)(),
        mapBackdropStats: _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapBackdropStats,
        mapTileSceneStats: _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapTileSceneStats,
        probeMapTilePixel: (chunkX, chunkZ) => (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.probeMapTilePixel)(scene, renderer, camera, () => (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_15__.renderPostProcessing)(postProcessing, renderer, scene, camera, 0, 0), chunkX, chunkZ),
        terrainFormatVersion: () => terrainFormatVersion,
        experimentalDetailsEnabled: () => experimentalDetailsEnabled,
        activeCenterId: () => activeCenterId,
        requestedCenterId: () => requestedCenterId,
        updatePlayersForTest: (players) => updatePlayers(players),
        setPlayerEyeViewForTest: (uuid) => setPlayerEyeView(uuid),
        updateMobsForTest: (mobs) => updateMobs(mobs),
        scheduleMobsForTest: (mobs) => scheduleMobMarkerUpdate(mobs),
        waterMaterialSummary: () => waterMaterialSummary(),
        cameraPose: () => ({
            camera: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.vectorState)(camera.position),
            target: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.vectorState)(controls.target),
            fov: camera.fov,
        }),
        streamAnchorChunk: () => playerChunk(),
        cameraChunk: () => ({
            chunkX: Math.floor(camera.position.x / 32),
            chunkZ: Math.floor(camera.position.z / 32),
        }),
        setAutoStream: (enabled) => {
            _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked = enabled === true;
            _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.dispatchEvent(new Event('change', { bubbles: true }));
        },
        lastPerfTimings: () => ({
            gridLoad: lastGridLoadTiming,
            terrainBatch: null,
            terrainStream: lastTerrainStreamTiming,
        }),
        terrainTuning: () => ({
            loadSlots: terrainLoadConcurrency(),
            spawnFrame: terrainPromotionsPerFrame(),
            spawnBudgetMs: terrainPromotionBudgetMs(),
        }),
        gridLoadCount: () => gridLoadCount,
        resetGridLoadCount: () => {
            gridLoadCount = 0;
        },
        jankStats: () => frameJank.stats(),
        resetJankStats: () => frameJank.reset(),
        chunkPlaceholderCount: () => chunkPlaceholderManager.count(),
        chunkPlaceholderWaiting: () => chunkPlaceholderManager.waitingCount(),
        landMotionActive: () => chunkLandMotion.activeCount(loadedChunks.values()),
        mapTileMotionActive: _map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.mapTileMotionActive,
        chunkWrapperCount: () => scene.children.filter((child) => child.name?.startsWith('chunk:')).length,
        orphanChunkWrappers: () => countOrphanChunkWrappers(),
        pruneOrphanChunkWrappers: () => pruneOrphanChunkWrappers(),
        viewState: () => ({
            mapTiles: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked,
            cosmeticsMode: _dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput.value,
            visualDetailMode: visualDetailMode(),
            landMotion: _dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput.checked,
            terrainLoadSlots: terrainLoadConcurrency(),
            terrainSpawnFrame: terrainPromotionsPerFrame(),
            terrainSpawnMs: terrainPromotionBudgetMs(),
            shade: _dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput.checked,
            mapTime: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked,
            water: waterModeValue(),
            fog: {
                enabled: _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput.checked,
                near: fogControlRange().near,
                far: fogControlRange().far,
                strength: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput, 0.9),
                horizon: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput, 0.65),
            },
            players: _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked,
            mobs: _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked,
            mobBlocks: mobBlocksEnabled(),
            auto: _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked,
            bounds: _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.checked,
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
            worldTime = time;
            _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked = true;
            applyLighting();
            timeRibbon.update(worldTime);
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
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.isVectorState)(cameraState)) {
                camera.position.set(cameraState.x, cameraState.y, cameraState.z);
            }
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.isVectorState)(targetState)) {
                controls.target.set(targetState.x, targetState.y, targetState.z);
            }
            controls.update();
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.isVectorState)(lookAt)) {
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
            if (!object.isMesh || !object.material)
                return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (material?.name !== 'terrascape-water' && material?.userData?.terrascapeWater !== true)
                    continue;
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
    if (!color?.clone)
        return null;
    const srgb = color.clone().convertLinearToSRGB();
    return {
        r: Math.round(srgb.r * 255),
        g: Math.round(srgb.g * 255),
        b: Math.round(srgb.b * 255),
    };
}
function focusGrid(centerX, centerZ, radius) {
    const center = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(centerX * 32 + 16, 122, centerZ * 32 + 16);
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
    if (!(0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.isVectorState)(cameraState) || !(0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.isVectorState)(targetState)) {
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
    if (!hasStarted || !_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)
        return;
    const target = controls.target;
    const chunk = playerChunk();
    const state = {
        world: _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value,
        visualDefaultsVersion: VISUAL_DEFAULTS_VERSION,
        chunkX: Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput.value, 10) || chunk.chunkX,
        chunkZ: Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput.value, 10) || chunk.chunkZ,
        radius: radiusValue(),
        auto: _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked,
        bounds: _dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.checked,
        players: _dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.checked,
        mobs: _dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked,
        mobBlocks: mobBlocksEnabled(),
        renderDetails: !_dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardEl.classList.contains('collapsed'),
        shade: _dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput.checked,
        mapTime: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.checked,
        mapTiles: _dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.checked,
        cosmeticsMode: _dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput.value,
        visualDetailMode: visualDetailMode(),
        landMotion: _dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput.checked,
        terrainLoadSlots: terrainLoadConcurrency(),
        terrainSpawnFrame: terrainPromotionsPerFrame(),
        terrainSpawnMs: terrainPromotionBudgetMs(),
        shadeSize: Number.parseFloat(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeValueInput.value),
        shadeDarkness: Number.parseFloat(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessValueInput.value),
        water: waterModeValue(),
        fog: _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput.checked,
        fogNear: fogControlRange().near,
        fogFar: fogControlRange().far,
        fogStrength: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput, 0.9),
        fogHorizon: readFloatControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput, 0.65),
        playerRate: _dom_js__WEBPACK_IMPORTED_MODULE_8__.playerUpdateRateInput.value,
        camera: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.vectorState)(camera.position),
        target: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.vectorState)(target),
    };
    if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_18__.saveStoredViewState)(state)) {
        storedViewState = state;
    }
}
function maybeSaveViewState() {
    if (viewPlayerUuid || followPlayerUuid)
        return;
    const now = performance.now();
    if (now - lastViewStateSave < 500)
        return;
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
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.coordTargetEl.textContent = `${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(target.x)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(target.y)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(target.z)}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.coordChunkEl.textContent = `${chunk.chunkX}, ${chunk.chunkZ}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.coordCameraEl.textContent = `${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(camera.position.x)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(camera.position.y)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.formatCoord)(camera.position.z)}`;
}
function updateEmptyGrid() {
    grid.position.set(Math.round(camera.position.x / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP, EMPTY_GRID_Y, Math.round(camera.position.z / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP);
}
function updateChunkPlaceholders() {
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    if (!world || !hasFocusedInitialGrid) {
        return;
    }
    const radius = radiusValue();
    const player = playerChunk();
    const playerId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.centerId)(world, player.chunkX, player.chunkZ);
    const shouldShow = _dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked
        || requestedCenterId != null
        || (activeCenterId != null && playerId !== activeCenterId);
    if (!shouldShow) {
        chunkPlaceholderManager.sync(world, [], new Set(loadedChunks.keys()));
        return;
    }
    const keys = chunkKeys(player.chunkX, player.chunkZ, radius);
    chunkPlaceholderManager.sync(world, keys, new Set(loadedChunks.keys()));
}
function syncFlyLookFromCamera() {
    camera.getWorldDirection(tempCameraForward);
    if (tempCameraForward.lengthSq() < 0.0001)
        return;
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
    if (viewPlayerUuid || !Number.isFinite(deltaY) || deltaY === 0)
        return;
    camera.getWorldDirection(tempCameraForward);
    if (tempCameraForward.lengthSq() < 0.0001)
        return;
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
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value;
    if (!world)
        return;
    const player = playerChunk();
    scheduledCenterId = null;
    clearTimeout(streamTimer);
    streamTimer = null;
    loadGrid({ centerX: player.chunkX, centerZ: player.chunkZ, streamLoad: true }).catch((error) => setStatus(error.message));
}
function maybeAutoStream() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.autoStreamInput.checked || !hasFocusedInitialGrid || !_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value)
        return;
    const player = playerChunk();
    const playerId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.centerId)(_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value, player.chunkX, player.chunkZ);
    if (playerId === activeCenterId || playerId === requestedCenterId || playerId === scheduledCenterId) {
        return;
    }
    clearTimeout(streamTimer);
    scheduledCenterId = playerId;
    streamTimer = setTimeout(() => {
        streamTimer = null;
        scheduledCenterId = null;
        scheduleAutoStreamLoad();
    }, AUTO_STREAM_DEBOUNCE_MS);
}
function scheduleControlGridLoad() {
    if (!hasStarted)
        return;
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
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_15__.resizePostProcessing)(postProcessing, width, height, rendererPixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_11__.positionFpsCounter)(fpsCounter);
}
function handleKeyboardNavigation(deltaSeconds) {
    if (viewPlayerUuid || pressedKeys.size === 0 || isTypingInHud())
        return;
    const forward = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    camera.getWorldDirection(forward);
    if (forward.lengthSq() < 0.0001)
        return;
    forward.normalize();
    tempFlyRight.crossVectors(forward, camera.up);
    if (tempFlyRight.lengthSq() < 0.0001) {
        tempFlyRight.set(1, 0, 0);
    }
    else {
        tempFlyRight.normalize();
    }
    tempFlyMove.set(0, 0, 0);
    if (pressedKeys.has('KeyW'))
        tempFlyMove.add(forward);
    if (pressedKeys.has('KeyS'))
        tempFlyMove.sub(forward);
    if (pressedKeys.has('KeyA') || pressedKeys.has('KeyQ'))
        tempFlyMove.sub(tempFlyRight);
    if (pressedKeys.has('KeyD') || pressedKeys.has('KeyE'))
        tempFlyMove.add(tempFlyRight);
    if (pressedKeys.has('Space') || pressedKeys.has('KeyR') || pressedKeys.has('PageUp'))
        tempFlyMove.y += 1;
    if (pressedKeys.has('KeyC') || pressedKeys.has('PageDown'))
        tempFlyMove.y -= 1;
    if (tempFlyMove.lengthSq() === 0)
        return;
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
    const playerHeightSource = playerMarkers.get(viewPlayerUuid) ?? playerMarkers.get(followPlayerUuid);
    const desiredWorldY = playerHeightSource
        ? playerHeightSource.position.y + MOB_CARD_PLAYER_HEIGHT
        : camera.position.y;
    const updateBillboards = !hasMobBillboardQuaternion
        || lastMobBillboardQuaternion.angleTo(camera.quaternion) > 0.0005;
    if (updateBillboards) {
        lastMobBillboardQuaternion.copy(camera.quaternion);
        hasMobBillboardQuaternion = true;
    }
    for (const marker of mobMarkers.values()) {
        const targetPosition = marker.userData.targetPosition;
        if (targetPosition) {
            tempMobTarget.copy(targetPosition);
            tempMobTarget.y += 0.25;
            marker.position.lerp(tempMobTarget, alpha);
            const cardHeight = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(desiredWorldY - targetPosition.y, MOB_CARD_MIN_HEIGHT, MOB_CARD_TREE_TOP_HEIGHT);
            if (!Number.isFinite(marker.userData.cardHeight)
                || Math.abs(marker.userData.cardHeight - cardHeight) > 0.05) {
                (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updateMobMarkerHeight)(marker, cardHeight);
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
    const next = current + (cardOpacity - current) * (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(alpha, 0, 1);
    marker.userData.distanceOpacity = next;
    applyMaterialOpacity(marker.userData.badge, next);
    applyMaterialOpacity(marker.userData.pointer, pointerOpacity);
    applyMaterialOpacity(marker.getObjectByName('mob-ground-glow'), glowOpacity);
}
function distanceOpacity(distance, minOpacity) {
    const t = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)((distance - MOB_MARKER_FADE_NEAR_DISTANCE) / (MOB_MARKER_FADE_FAR_DISTANCE - MOB_MARKER_FADE_NEAR_DISTANCE), 0, 1);
    const smooth = t * t * (3 - 2 * t);
    return 1 - smooth * (1 - minOpacity);
}
function applyMaterialOpacity(object, opacityScale) {
    if (!object?.material)
        return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
        if (!material || material.userData?.terrascapeShared === true)
            continue;
        const baseOpacity = Number.isFinite(material.userData.terrascapeBaseOpacity)
            ? material.userData.terrascapeBaseOpacity
            : material.opacity;
        material.userData.terrascapeBaseOpacity = baseOpacity;
        const nextOpacity = (0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(baseOpacity * opacityScale, 0, 1);
        if (Math.abs((material.opacity ?? 1) - nextOpacity) < 0.003)
            continue;
        material.opacity = nextOpacity;
        material.transparent = true;
        material.needsUpdate = true;
    }
}
function updatePlayerCameraMode(deltaSeconds) {
    if (viewPlayerUuid) {
        updateEyeCamera(deltaSeconds);
        return;
    }
    if (followPlayerUuid) {
        updateWalkFollowCamera(deltaSeconds);
    }
}
function resetPlayerEyeState(uuid) {
    const marker = playerMarkers.get(uuid);
    if (!marker)
        return;
    playerEyeState.uuid = uuid;
    playerEyeState.yawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : 0;
    playerEyeState.pitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
}
function updateEyeCamera(deltaSeconds = 0) {
    const marker = playerMarkers.get(viewPlayerUuid);
    if (!marker) {
        setPlayerEyeView(null);
        return;
    }
    if (playerEyeState.uuid !== viewPlayerUuid) {
        resetPlayerEyeState(viewPlayerUuid);
    }
    const targetYawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : playerEyeState.yawRad;
    const targetPitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
    const alpha = deltaSeconds > 0 ? 1 - Math.exp(-deltaSeconds * PLAYER_EYE_ROTATION_LERP) : 1;
    playerEyeState.yawRad = lerpAngle(playerEyeState.yawRad, targetYawRad, alpha);
    playerEyeState.pitchRad = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(playerEyeState.pitchRad, targetPitchRad, alpha);
    const lookDistance = 12;
    const cosPitch = Math.cos(playerEyeState.pitchRad);
    tempPlayerForward.set(-Math.sin(playerEyeState.yawRad) * cosPitch, Math.sin(playerEyeState.pitchRad), -Math.cos(playerEyeState.yawRad) * cosPitch);
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
    return three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.degToRad(Number(yawDeg || 0));
}
function playerCameraPitchRad(pitchDeg) {
    return three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.degToRad((0,_utils_js__WEBPACK_IMPORTED_MODULE_17__.clamp)(Number(pitchDeg || 0), -89, 89));
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
    const delta = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
    return current + delta * alpha;
}
function isTypingInHud() {
    const active = document.activeElement;
    return active instanceof HTMLInputElement
        || active instanceof HTMLSelectElement
        || active instanceof HTMLTextAreaElement;
}
function blurFocusedHudControl() {
    if (isTypingInHud()) {
        document.activeElement.blur();
    }
}
function animate() {
    const deltaSeconds = Math.min(clock.getDelta(), 0.05);
    const elapsedSeconds = clock.elapsedTime;
    frameJank.recordFrame();
    chunkLandMotion.update(loadedChunks.values());
    (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_12__.tickMapTileMotion)(landMotionEnabled());
    updatePlayerMarkers(deltaSeconds);
    updateMobMarkers(deltaSeconds, elapsedSeconds);
    handleKeyboardNavigation(deltaSeconds);
    updatePlayerCameraMode(deltaSeconds);
    if (!viewPlayerUuid && !followPlayerUuid) {
        updateFlyTarget();
    }
    if (controls.enabled) {
        controls.update();
    }
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_9__.positionSkyObjects)(lightingRig, camera.position);
    updateMapDistanceFog();
    updateEmptyGrid();
    updateChunkPlaceholders();
    chunkPlaceholderManager.update(deltaSeconds);
    (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_11__.updateFpsCounter)(fpsCounter, deltaSeconds);
    maybeAutoStream();
    updateCoordinates();
    (0,_water_js__WEBPACK_IMPORTED_MODULE_19__.updateWaterMaterials)(scene, renderer, elapsedSeconds, camera);
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_15__.renderPostProcessing)(postProcessing, renderer, scene, camera, deltaSeconds, elapsedSeconds);
    maybeUpdateMetrics();
    maybeSaveViewState();
    requestAnimationFrame(animate);
}
window.addEventListener('resize', resize);
function setSettingsPanelOpen(open) {
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.hudEl.classList.toggle('open', open);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.panelToggle.classList.toggle('active', open);
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.panelToggle.setAttribute('aria-expanded', String(open));
}
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const confirmDialog = document.querySelector('#confirm-dialog');
        if (confirmDialog?.open)
            return;
        if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.hudEl.classList.contains('open'))
            return;
        event.preventDefault();
        blurFocusedHudControl();
        setSettingsPanelOpen(false);
        return;
    }
    if (isTypingInHud())
        return;
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
    blurFocusedHudControl();
    if (!viewPlayerUuid && !followPlayerUuid && shouldStartFlyLook(event)) {
        event.preventDefault();
        renderer.domElement.requestPointerLock?.();
    }
}, { capture: true });
renderer.domElement.addEventListener('wheel', (event) => {
    if (viewPlayerUuid || followPlayerUuid)
        return;
    event.preventDefault();
    zoomFlyView(event.deltaY);
}, { passive: false });
window.addEventListener('mousemove', (event) => {
    if (!isFlyLookActive() || viewPlayerUuid)
        return;
    flyYaw -= event.movementX * FLY_MOUSE_SENSITIVITY;
    flyPitch -= event.movementY * FLY_MOUSE_SENSITIVITY;
    applyFlyLook();
});
window.addEventListener('terrascape:map-backdrop-loaded', applyMapWaterTint);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.addEventListener('change', updateDebugBounds);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.debugBoundsInput.addEventListener('change', saveViewState);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.showPlayersInput.addEventListener('change', () => {
    updateEntityVisibility();
    restartEntityStream();
    restartPlayerPolling();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.addEventListener('change', () => {
    clearTimeout(mobPollTimer);
    mobPollTimer = null;
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked) {
        clearMobs();
    }
    updateEntityVisibility();
    restartEntityStream();
    if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.showMobsInput.checked) {
        restartMobPolling(0);
    }
    saveViewState();
});
function onMobBlocksToggle(event) {
    syncMobBlocksInputs(event.target.checked);
    updateEntityVisibility();
    saveViewState();
}
_dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksInput.addEventListener('change', onMobBlocksToggle);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.mobBlocksPanelInput.addEventListener('change', onMobBlocksToggle);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.waterModeInput.addEventListener('change', () => {
    applyWaterMode();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.playerUpdateRateInput.addEventListener('change', () => {
    restartPlayerPolling();
    saveViewState();
});
for (const input of [_dom_js__WEBPACK_IMPORTED_MODULE_8__.treeShadeInput]) {
    const eventName = input.type === 'range' ? 'input' : 'change';
    input.addEventListener(eventName, () => {
        applyLighting();
        saveViewState();
    });
}
_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTimeInput.addEventListener('change', () => {
    applyLighting();
    restartWorldTimePolling();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.mapTilesInput.addEventListener('change', () => {
    updateMapTileLayer();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.cosmeticBlocksModeInput.addEventListener('change', () => {
    for (const [id, entry] of Array.from(loadedChunks.entries())) {
        finishDisposeChunk(id, entry);
    }
    scheduleControlGridLoad();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.visualDetailModeInput.addEventListener('change', () => {
    for (const [id, entry] of Array.from(loadedChunks.entries())) {
        finishDisposeChunk(id, entry);
    }
    scheduleControlGridLoad();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.clearMeshCacheButton?.addEventListener('click', () => {
    void handleClearMeshCache();
});
_dom_js__WEBPACK_IMPORTED_MODULE_8__.landMotionInput.addEventListener('change', saveViewState);
syncRadiusControl();
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainLoadSlotsValueInput, () => { });
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnFrameValueInput, () => { });
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.terrainSpawnBudgetValueInput, () => { });
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeSizeValueInput);
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.shadeDarknessValueInput);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogEnabledInput.addEventListener('change', () => {
    applyFogSettings();
    saveViewState();
});
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogNearValueInput, applyFogSettings);
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogFarValueInput, applyFogSettings);
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogStrengthValueInput, applyFogSettings);
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.fogHorizonValueInput, applyFogSettings);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.addEventListener('change', () => {
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
(0,_library_collapsible_section_js__WEBPACK_IMPORTED_MODULE_21__.bindHudSectionCollapsibles)(document);
(0,_library_tri_state_control_js__WEBPACK_IMPORTED_MODULE_22__.bindTriStateControl)(document, 'cosmetic-blocks-mode', [
    { value: 'off', label: 'Off' },
    { value: 'baked', label: 'Baked' },
    { value: 'split', label: 'Split' },
]);
(0,_library_tri_state_control_js__WEBPACK_IMPORTED_MODULE_22__.bindTriStateControl)(document, 'visual-detail-mode', [
    { value: 'basic', label: 'Basic' },
    { value: 'structures', label: 'Struct' },
    { value: 'all', label: 'Foliage' },
]);
for (const input of [_dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkXInput, _dom_js__WEBPACK_IMPORTED_MODULE_8__.chunkZInput]) {
    if (!input)
        continue;
    input.addEventListener('input', scheduleControlGridLoad);
    input.addEventListener('change', scheduleControlGridLoad);
}
_dom_js__WEBPACK_IMPORTED_MODULE_8__.panelToggle.addEventListener('click', () => {
    setSettingsPanelOpen(!_dom_js__WEBPACK_IMPORTED_MODULE_8__.hudEl.classList.contains('open'));
});
setRenderDetailsOpen(!storedViewState || storedViewState.renderDetails !== false);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardHeadEl.addEventListener('click', toggleRenderDetails);
_dom_js__WEBPACK_IMPORTED_MODULE_8__.infoCardHeadEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ')
        return;
    event.preventDefault();
    toggleRenderDetails();
});
applyInitialParams();
setRadiusControlValue(radiusValue());
exposeDebugState();
resize();
timeRibbon.update(worldTime);
animate();
await loadWorlds();
await npcCatalog.load();
if (_dom_js__WEBPACK_IMPORTED_MODULE_8__.worldSelect.value) {
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
function syncRadiusControl() {
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.addEventListener('input', () => {
        _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.value = _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.value;
        updateRadiusReadout();
        scheduleControlGridLoad();
    });
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.addEventListener('input', () => {
        const parsed = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.value, 10);
        if (Number.isFinite(parsed)) {
            _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.value = normalizePairedValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput, parsed);
        }
        updateRadiusReadout();
        scheduleControlGridLoad();
    });
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.addEventListener('change', () => {
        setRadiusControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusInput.value);
        scheduleControlGridLoad();
    });
    _dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.addEventListener('change', () => {
        setRadiusControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_8__.radiusRangeInput.value);
        scheduleControlGridLoad();
    });
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ },

/***/ "./src/main/resources/web/src/chunk-debug.ts"
/*!***************************************************!*\
  !*** ./src/main/resources/web/src/chunk-debug.ts ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createChunkDebug: () => (/* binding */ createChunkDebug)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");

function createChunkDebug(chunkX, chunkZ, chunkObject) {
    const bounds = new three__WEBPACK_IMPORTED_MODULE_0__.Box3().setFromObject(chunkObject);
    const minY = Number.isFinite(bounds.min.y) ? bounds.min.y : 100;
    const maxY = Number.isFinite(bounds.max.y) ? bounds.max.y : 132;
    const highY = maxY + 0.35;
    const lowY = Math.min(minY, maxY - 1);
    const corners = [
        [0, lowY, 0], [32, lowY, 0], [32, lowY, 32], [0, lowY, 32],
        [0, highY, 0], [32, highY, 0], [32, highY, 32], [0, highY, 32],
    ];
    const edgeIndices = [
        0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 1, 5, 2, 6, 3, 7,
    ];
    const positions = [];
    for (const index of edgeIndices) {
        positions.push(...corners[index]);
    }
    const group = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
    group.name = `debug:${chunkX}:${chunkZ}`;
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry();
    geometry.setAttribute('position', new three__WEBPACK_IMPORTED_MODULE_0__.Float32BufferAttribute(positions, 3));
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.LineBasicMaterial({
        color: 0x26383b,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
    });
    const lines = new three__WEBPACK_IMPORTED_MODULE_0__.LineSegments(geometry, material);
    lines.renderOrder = 20;
    group.add(lines);
    const label = makeCornerLabel(`${chunkX}, ${chunkZ}`);
    label.position.set(23.3, highY + 0.04, 28.1);
    group.add(label);
    return group;
}
function makeCornerLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(38, 48, 52, 0.82)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(238, 243, 245, 0.52)';
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    context.fillStyle = '#f4f7f8';
    context.font = '800 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    const texture = new three__WEBPACK_IMPORTED_MODULE_0__.CanvasTexture(canvas);
    texture.minFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
    texture.magFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
    texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace;
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
    });
    const label = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.PlaneGeometry(14.4, 4.8), material);
    label.name = 'debug-corner-label';
    label.rotation.x = -Math.PI / 2;
    label.renderOrder = 21;
    return label;
}


/***/ },

/***/ "./src/main/resources/web/src/chunk-placeholder.ts"
/*!*********************************************************!*\
  !*** ./src/main/resources/web/src/chunk-placeholder.ts ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createChunkPlaceholderManager: () => (/* binding */ createChunkPlaceholderManager)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/main/resources/web/src/utils.ts");


const CHUNK_SIZE = 32;
const PLACEHOLDER_BASE_Y = 96;
const PLACEHOLDER_HEIGHT = 32;
const PLACEHOLDER_FADE_MS = 220;
const FACE_GRID_LINES = 3;
const PLACEHOLDER_AXIS_COLOR = 0x1faa6a;
const PLACEHOLDER_LINE_COLOR = 0x15965a;
function createFaceGridGeometry(size, height, lineCount) {
    const positions = [];
    const step = size / (lineCount + 1);
    const addSegment = (ax, ay, az, bx, by, bz) => {
        positions.push(ax, ay, az, bx, by, bz);
    };
    for (let i = 1; i <= lineCount; i += 1) {
        const offset = step * i;
        addSegment(0, 0, offset, size, 0, offset);
        addSegment(0, height, offset, size, height, offset);
        addSegment(0, 0, offset, 0, height, offset);
        addSegment(size, 0, offset, size, height, offset);
        addSegment(0, offset, 0, size, offset, 0);
        addSegment(0, offset, size, size, offset, size);
        addSegment(0, offset, 0, 0, offset, size);
        addSegment(size, offset, 0, size, offset, size);
        addSegment(offset, 0, 0, offset, 0, size);
        addSegment(offset, height, 0, offset, height, size);
        addSegment(offset, 0, 0, offset, height, 0);
        addSegment(offset, 0, size, offset, height, size);
    }
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry();
    geometry.setAttribute('position', new three__WEBPACK_IMPORTED_MODULE_0__.Float32BufferAttribute(positions, 3));
    return geometry;
}
function createChunkPlaceholderManager(scene) {
    const placeholders = new Map();
    function createPlaceholderObject() {
        const group = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
        group.name = 'chunk-placeholder';
        const box = new three__WEBPACK_IMPORTED_MODULE_0__.BoxGeometry(CHUNK_SIZE, PLACEHOLDER_HEIGHT, CHUNK_SIZE);
        const edges = new three__WEBPACK_IMPORTED_MODULE_0__.EdgesGeometry(box);
        box.dispose();
        const lineMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.LineBasicMaterial({
            color: PLACEHOLDER_AXIS_COLOR,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
        });
        const edgeLines = new three__WEBPACK_IMPORTED_MODULE_0__.LineSegments(edges, lineMaterial);
        edgeLines.renderOrder = -12;
        group.add(edgeLines);
        const faceGrid = new three__WEBPACK_IMPORTED_MODULE_0__.LineSegments(createFaceGridGeometry(CHUNK_SIZE, PLACEHOLDER_HEIGHT, FACE_GRID_LINES), new three__WEBPACK_IMPORTED_MODULE_0__.LineBasicMaterial({
            color: PLACEHOLDER_LINE_COLOR,
            transparent: true,
            opacity: 0.46,
            depthWrite: false,
        }));
        faceGrid.renderOrder = -11;
        group.add(faceGrid);
        return {
            object: group,
            lineMaterial,
            state: 'waiting',
            fadeElapsed: 0,
        };
    }
    function disposeEntry(entry) {
        scene.remove(entry.object);
        entry.object.traverse((child) => {
            child.geometry?.dispose();
            const materials = child instanceof three__WEBPACK_IMPORTED_MODULE_0__.LineSegments
                ? (Array.isArray(child.material) ? child.material : [child.material])
                : [];
            for (const material of materials) {
                material?.dispose();
            }
        });
        entry.lineMaterial.dispose();
    }
    return {
        sync(world, keys, loadedIds) {
            const keep = new Set();
            for (const key of keys) {
                const id = key.id ?? (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.chunkId)(world, key.chunkX, key.chunkZ);
                keep.add(id);
                if (loadedIds.has(id)) {
                    continue;
                }
                let entry = placeholders.get(id);
                if (!entry) {
                    entry = createPlaceholderObject();
                    entry.object.position.set(key.chunkX * CHUNK_SIZE, PLACEHOLDER_BASE_Y, key.chunkZ * CHUNK_SIZE);
                    placeholders.set(id, entry);
                    scene.add(entry.object);
                }
                else if (entry.state === 'waiting') {
                    entry.object.position.set(key.chunkX * CHUNK_SIZE, PLACEHOLDER_BASE_Y, key.chunkZ * CHUNK_SIZE);
                    entry.object.visible = true;
                }
            }
            for (const [id, entry] of placeholders) {
                if (!keep.has(id) && entry.state === 'waiting') {
                    disposeEntry(entry);
                    placeholders.delete(id);
                }
            }
        },
        resolve(world, chunkX, chunkZ) {
            const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.chunkId)(world, chunkX, chunkZ);
            const entry = placeholders.get(id);
            if (!entry || entry.state === 'fading') {
                return;
            }
            entry.state = 'fading';
            entry.fadeElapsed = 0;
        },
        update(deltaSeconds) {
            const completed = [];
            for (const [id, entry] of placeholders) {
                if (entry.state !== 'fading') {
                    continue;
                }
                entry.fadeElapsed += deltaSeconds * 1000;
                const progress = Math.min(1, entry.fadeElapsed / PLACEHOLDER_FADE_MS);
                const edgeOpacity = 0.72 * (1 - progress);
                entry.lineMaterial.opacity = edgeOpacity;
                entry.object.traverse((child) => {
                    if (!(child instanceof three__WEBPACK_IMPORTED_MODULE_0__.LineSegments) || child.material === entry.lineMaterial) {
                        return;
                    }
                    const material = child.material;
                    material.opacity = 0.46 * (1 - progress);
                });
                if (progress >= 1) {
                    completed.push(id);
                }
            }
            for (const id of completed) {
                const entry = placeholders.get(id);
                if (!entry)
                    continue;
                disposeEntry(entry);
                placeholders.delete(id);
            }
        },
        count() {
            return placeholders.size;
        },
        waitingCount() {
            let count = 0;
            for (const entry of placeholders.values()) {
                if (entry.state === 'waiting')
                    count += 1;
            }
            return count;
        },
    };
}


/***/ },

/***/ "./src/main/resources/web/src/client-log.ts"
/*!**************************************************!*\
  !*** ./src/main/resources/web/src/client-log.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   flushClientLogs: () => (/* binding */ flushClientLogs),
/* harmony export */   logClientEvent: () => (/* binding */ logClientEvent),
/* harmony export */   logClientTiming: () => (/* binding */ logClientTiming)
/* harmony export */ });
const CLIENT_LOG_ENDPOINT = '/api/client-log';
const FLUSH_INTERVAL_MS = 2000;
const MAX_EVENTS_PER_FLUSH = 24;
const MAX_QUEUED_EVENTS = 80;
const PERF_TELEMETRY_TYPES = new Set([
    'frame_hitch',
    'grid_load',
    'terrain_single_load',
    'map_tile_single_load',
    'map_tiles_stream',
]);
const PERF_TELEMETRY_ENABLED = ['1', 'true', 'yes', 'on'].includes(new URLSearchParams(location.search).get('perfTelemetry')?.toLowerCase() ?? '');
let queue = [];
let flushTimer = null;
let sequence = 0;
function logClientEvent(type, fields = {}) {
    if (!type)
        return;
    if (PERF_TELEMETRY_TYPES.has(type) && !PERF_TELEMETRY_ENABLED)
        return;
    const event = sanitizeEvent({
        seq: ++sequence,
        t: Math.round(performance.now()),
        type,
        ...fields,
    });
    queue.push(event);
    if (queue.length > MAX_QUEUED_EVENTS) {
        queue = queue.slice(queue.length - MAX_QUEUED_EVENTS);
    }
    scheduleFlush();
}
function logClientTiming(type, startedAt, fields = {}) {
    logClientEvent(type, {
        ...fields,
        ms: Math.round(Math.max(0, performance.now() - startedAt)),
    });
}
function flushClientLogs() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (queue.length === 0)
        return;
    const events = queue.splice(0, MAX_EVENTS_PER_FLUSH);
    const payload = JSON.stringify({
        page: location.pathname,
        perfTelemetry: PERF_TELEMETRY_ENABLED,
        events,
    });
    if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob)) {
            scheduleFlush();
            return;
        }
    }
    fetch(CLIENT_LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => {
        // Drop failed telemetry. The viewer must never slow down because logging is unavailable.
    }).finally(scheduleFlush);
}
function scheduleFlush() {
    if (flushTimer || queue.length === 0)
        return;
    flushTimer = setTimeout(flushClientLogs, FLUSH_INTERVAL_MS);
}
function sanitizeEvent(event) {
    const sanitized = {};
    for (const [key, value] of Object.entries(event)) {
        if (typeof value === 'number') {
            sanitized[key] = Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
        }
        else if (typeof value === 'boolean' || value === null) {
            sanitized[key] = value;
        }
        else if (value === undefined) {
            continue;
        }
        else {
            sanitized[key] = String(value).slice(0, 160);
        }
    }
    return sanitized;
}
window.addEventListener('pagehide', flushClientLogs);


/***/ },

/***/ "./src/main/resources/web/src/dom.ts"
/*!*******************************************!*\
  !*** ./src/main/resources/web/src/dom.ts ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   autoStreamInput: () => (/* binding */ autoStreamInput),
/* harmony export */   canvas: () => (/* binding */ canvas),
/* harmony export */   chunkXInput: () => (/* binding */ chunkXInput),
/* harmony export */   chunkZInput: () => (/* binding */ chunkZInput),
/* harmony export */   clearMeshCacheButton: () => (/* binding */ clearMeshCacheButton),
/* harmony export */   coordCameraEl: () => (/* binding */ coordCameraEl),
/* harmony export */   coordChunkEl: () => (/* binding */ coordChunkEl),
/* harmony export */   coordTargetEl: () => (/* binding */ coordTargetEl),
/* harmony export */   cosmeticBlocksModeInput: () => (/* binding */ cosmeticBlocksModeInput),
/* harmony export */   debugBoundsInput: () => (/* binding */ debugBoundsInput),
/* harmony export */   fogEnabledInput: () => (/* binding */ fogEnabledInput),
/* harmony export */   fogFarInput: () => (/* binding */ fogFarInput),
/* harmony export */   fogFarValueInput: () => (/* binding */ fogFarValueInput),
/* harmony export */   fogHorizonInput: () => (/* binding */ fogHorizonInput),
/* harmony export */   fogHorizonValueInput: () => (/* binding */ fogHorizonValueInput),
/* harmony export */   fogNearInput: () => (/* binding */ fogNearInput),
/* harmony export */   fogNearValueInput: () => (/* binding */ fogNearValueInput),
/* harmony export */   fogStrengthInput: () => (/* binding */ fogStrengthInput),
/* harmony export */   fogStrengthValueInput: () => (/* binding */ fogStrengthValueInput),
/* harmony export */   hudEl: () => (/* binding */ hudEl),
/* harmony export */   infoCardEl: () => (/* binding */ infoCardEl),
/* harmony export */   infoCardHeadEl: () => (/* binding */ infoCardHeadEl),
/* harmony export */   landMotionInput: () => (/* binding */ landMotionInput),
/* harmony export */   mapTilesInput: () => (/* binding */ mapTilesInput),
/* harmony export */   mapTimeInput: () => (/* binding */ mapTimeInput),
/* harmony export */   metricCenterEl: () => (/* binding */ metricCenterEl),
/* harmony export */   metricDisposedEl: () => (/* binding */ metricDisposedEl),
/* harmony export */   metricGpuEl: () => (/* binding */ metricGpuEl),
/* harmony export */   metricLoadedEl: () => (/* binding */ metricLoadedEl),
/* harmony export */   metricMeshesEl: () => (/* binding */ metricMeshesEl),
/* harmony export */   metricMobsEl: () => (/* binding */ metricMobsEl),
/* harmony export */   metricResourcesEl: () => (/* binding */ metricResourcesEl),
/* harmony export */   mobBlocksInput: () => (/* binding */ mobBlocksInput),
/* harmony export */   mobBlocksPanelInput: () => (/* binding */ mobBlocksPanelInput),
/* harmony export */   panelToggle: () => (/* binding */ panelToggle),
/* harmony export */   playerUpdateRateInput: () => (/* binding */ playerUpdateRateInput),
/* harmony export */   playersEl: () => (/* binding */ playersEl),
/* harmony export */   radiusDiameterEl: () => (/* binding */ radiusDiameterEl),
/* harmony export */   radiusInput: () => (/* binding */ radiusInput),
/* harmony export */   radiusRangeInput: () => (/* binding */ radiusRangeInput),
/* harmony export */   shadeDarknessInput: () => (/* binding */ shadeDarknessInput),
/* harmony export */   shadeDarknessValueInput: () => (/* binding */ shadeDarknessValueInput),
/* harmony export */   shadeSizeInput: () => (/* binding */ shadeSizeInput),
/* harmony export */   shadeSizeValueInput: () => (/* binding */ shadeSizeValueInput),
/* harmony export */   showMobsInput: () => (/* binding */ showMobsInput),
/* harmony export */   showPlayersInput: () => (/* binding */ showPlayersInput),
/* harmony export */   skyMoonEl: () => (/* binding */ skyMoonEl),
/* harmony export */   skySceneEl: () => (/* binding */ skySceneEl),
/* harmony export */   skyStarsEl: () => (/* binding */ skyStarsEl),
/* harmony export */   skySunEl: () => (/* binding */ skySunEl),
/* harmony export */   statusEl: () => (/* binding */ statusEl),
/* harmony export */   terrainLoadSlotsInput: () => (/* binding */ terrainLoadSlotsInput),
/* harmony export */   terrainLoadSlotsValueInput: () => (/* binding */ terrainLoadSlotsValueInput),
/* harmony export */   terrainSpawnBudgetInput: () => (/* binding */ terrainSpawnBudgetInput),
/* harmony export */   terrainSpawnBudgetValueInput: () => (/* binding */ terrainSpawnBudgetValueInput),
/* harmony export */   terrainSpawnFrameInput: () => (/* binding */ terrainSpawnFrameInput),
/* harmony export */   terrainSpawnFrameValueInput: () => (/* binding */ terrainSpawnFrameValueInput),
/* harmony export */   timeCycleLabelEl: () => (/* binding */ timeCycleLabelEl),
/* harmony export */   treeShadeInput: () => (/* binding */ treeShadeInput),
/* harmony export */   visualDetailModeInput: () => (/* binding */ visualDetailModeInput),
/* harmony export */   waterModeInput: () => (/* binding */ waterModeInput),
/* harmony export */   worldSelect: () => (/* binding */ worldSelect)
/* harmony export */ });
const canvas = document.querySelector('#scene');
const worldSelect = document.querySelector('#world');
const chunkXInput = document.querySelector('#chunk-x');
const chunkZInput = document.querySelector('#chunk-z');
const radiusRangeInput = document.querySelector('#radius-range');
const radiusInput = document.querySelector('#radius');
const radiusDiameterEl = document.querySelector('#radius-diameter');
const autoStreamInput = document.querySelector('#auto-stream');
const debugBoundsInput = document.querySelector('#debug-bounds');
const showPlayersInput = document.querySelector('#show-players');
const showMobsInput = document.querySelector('#show-mobs');
const mobBlocksInput = document.querySelector('#mob-blocks');
const mobBlocksPanelInput = document.querySelector('#mob-blocks-panel');
const playerUpdateRateInput = document.querySelector('#player-update-rate');
const treeShadeInput = document.querySelector('#tree-shade');
const mapTilesInput = document.querySelector('#map-tiles');
const clearMeshCacheButton = document.querySelector('#clear-mesh-cache');
const cosmeticBlocksModeInput = document.querySelector('#cosmetic-blocks-mode');
const visualDetailModeInput = document.querySelector('#visual-detail-mode');
const landMotionInput = document.querySelector('#land-motion');
const terrainLoadSlotsInput = document.querySelector('#terrain-load-slots');
const terrainLoadSlotsValueInput = document.querySelector('#terrain-load-slots-value');
const terrainSpawnFrameInput = document.querySelector('#terrain-spawn-frame');
const terrainSpawnFrameValueInput = document.querySelector('#terrain-spawn-frame-value');
const terrainSpawnBudgetInput = document.querySelector('#terrain-spawn-budget');
const terrainSpawnBudgetValueInput = document.querySelector('#terrain-spawn-budget-value');
const shadeSizeInput = document.querySelector('#shade-size');
const shadeSizeValueInput = document.querySelector('#shade-size-value');
const shadeDarknessInput = document.querySelector('#shade-darkness');
const shadeDarknessValueInput = document.querySelector('#shade-darkness-value');
const waterModeInput = document.querySelector('#water-mode');
const fogEnabledInput = document.querySelector('#fog-enabled');
const fogNearInput = document.querySelector('#fog-near');
const fogNearValueInput = document.querySelector('#fog-near-value');
const fogFarInput = document.querySelector('#fog-far');
const fogFarValueInput = document.querySelector('#fog-far-value');
const fogStrengthInput = document.querySelector('#fog-strength');
const fogStrengthValueInput = document.querySelector('#fog-strength-value');
const fogHorizonInput = document.querySelector('#fog-horizon');
const fogHorizonValueInput = document.querySelector('#fog-horizon-value');
const mapTimeInput = document.querySelector('#map-time');
const timeCycleLabelEl = document.querySelector('#time-cycle-label');
const skySceneEl = document.querySelector('#sky-scene');
const skySunEl = document.querySelector('#sky-sun');
const skyMoonEl = document.querySelector('#sky-moon');
const skyStarsEl = document.querySelector('#sky-stars');
const hudEl = document.querySelector('.hud');
const panelToggle = document.querySelector('#panel-toggle');
const statusEl = document.querySelector('#status');
const metricLoadedEl = document.querySelector('#metric-loaded');
const metricMeshesEl = document.querySelector('#metric-meshes');
const metricResourcesEl = document.querySelector('#metric-resources');
const metricGpuEl = document.querySelector('#metric-gpu');
const metricDisposedEl = document.querySelector('#metric-disposed');
const metricMobsEl = document.querySelector('#metric-mobs');
const metricCenterEl = document.querySelector('#metric-center');
const coordTargetEl = document.querySelector('#coord-target');
const coordChunkEl = document.querySelector('#coord-chunk');
const coordCameraEl = document.querySelector('#coord-camera');
const playersEl = document.querySelector('#players');
const infoCardEl = document.querySelector('.info-card');
const infoCardHeadEl = document.querySelector('#info-card-head');


/***/ },

/***/ "./src/main/resources/web/src/fps-counter.ts"
/*!***************************************************!*\
  !*** ./src/main/resources/web/src/fps-counter.ts ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createFpsCounter: () => (/* binding */ createFpsCounter),
/* harmony export */   positionFpsCounter: () => (/* binding */ positionFpsCounter),
/* harmony export */   updateFpsCounter: () => (/* binding */ updateFpsCounter)
/* harmony export */ });
const UPDATE_INTERVAL_SECONDS = 0.25;
function createFpsCounter() {
    const counter = {
        valueEl: document.querySelector('#fps-value'),
        frameEl: document.querySelector('#fps-frame'),
        frames: 0,
        elapsed: 0,
        fps: 0,
        frameMs: 0,
    };
    drawCounter(counter);
    return counter;
}
function updateFpsCounter(counter, deltaSeconds) {
    counter.frames++;
    counter.elapsed += deltaSeconds;
    if (counter.elapsed < UPDATE_INTERVAL_SECONDS) {
        return;
    }
    counter.fps = counter.frames / counter.elapsed;
    counter.frameMs = counter.elapsed * 1000 / counter.frames;
    counter.frames = 0;
    counter.elapsed = 0;
    drawCounter(counter);
}
// FPS is now an HTML readout on the title bar, so there is no sprite to reposition.
// Retained as a no-op so callers (resize handler, startup) keep working unchanged.
function positionFpsCounter() { }
function drawCounter(counter) {
    if (counter.valueEl) {
        counter.valueEl.textContent = Math.round(counter.fps).toString();
    }
    if (counter.frameEl) {
        counter.frameEl.textContent = `${counter.frameMs.toFixed(1)} ms`;
    }
}


/***/ },

/***/ "./src/main/resources/web/src/frame-jank.ts"
/*!**************************************************!*\
  !*** ./src/main/resources/web/src/frame-jank.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createFrameJankRecorder: () => (/* binding */ createFrameJankRecorder)
/* harmony export */ });
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./client-log.js */ "./src/main/resources/web/src/client-log.ts");

const HITCH_THRESHOLD_MS = 50;
const SEVERE_HITCH_THRESHOLD_MS = 100;
const BUFFER_SIZE = 300;
function percentile(sorted, ratio) {
    if (sorted.length === 0)
        return 0;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return sorted[index];
}
function createFrameJankRecorder() {
    const frameMs = new Array(BUFFER_SIZE);
    let frameCount = 0;
    let lastFrameAt = performance.now();
    let activeLoadKind = 'none';
    let hitchCount50 = 0;
    let hitchCount100 = 0;
    let longestHitchMs = 0;
    let hitchWhileLoading = 0;
    function pushFrame(deltaMs) {
        const slot = frameCount % BUFFER_SIZE;
        frameMs[slot] = deltaMs;
        frameCount += 1;
    }
    return {
        setActiveLoadKind(kind) {
            activeLoadKind = kind;
        },
        getActiveLoadKind() {
            return activeLoadKind;
        },
        recordFrame() {
            const now = performance.now();
            const deltaMs = now - lastFrameAt;
            lastFrameAt = now;
            pushFrame(deltaMs);
            if (deltaMs < HITCH_THRESHOLD_MS) {
                return;
            }
            hitchCount50 += 1;
            if (deltaMs > longestHitchMs) {
                longestHitchMs = deltaMs;
            }
            if (deltaMs >= SEVERE_HITCH_THRESHOLD_MS) {
                hitchCount100 += 1;
            }
            if (activeLoadKind !== 'none') {
                hitchWhileLoading += 1;
            }
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_0__.logClientEvent)('frame_hitch', {
                deltaMs: Math.round(deltaMs),
                load: activeLoadKind,
            });
        },
        reset() {
            frameCount = 0;
            hitchCount50 = 0;
            hitchCount100 = 0;
            longestHitchMs = 0;
            hitchWhileLoading = 0;
            lastFrameAt = performance.now();
        },
        stats() {
            const sampleCount = Math.min(frameCount, BUFFER_SIZE);
            const samples = [];
            for (let i = 0; i < sampleCount; i += 1) {
                const value = frameMs[i];
                if (Number.isFinite(value)) {
                    samples.push(value);
                }
            }
            samples.sort((a, b) => a - b);
            return {
                samples: sampleCount,
                p50FrameMs: Math.round(percentile(samples, 0.5) * 10) / 10,
                p95FrameMs: Math.round(percentile(samples, 0.95) * 10) / 10,
                p99FrameMs: Math.round(percentile(samples, 0.99) * 10) / 10,
                maxFrameMs: Math.round((samples.length > 0 ? samples[samples.length - 1] : 0) * 10) / 10,
                hitchCount50,
                hitchCount100,
                longestHitchMs: Math.round(longestHitchMs * 10) / 10,
                hitchWhileLoading,
                activeLoadKind,
            };
        },
    };
}


/***/ },

/***/ "./src/main/resources/web/src/library/chunk-land-motion.ts"
/*!*****************************************************************!*\
  !*** ./src/main/resources/web/src/library/chunk-land-motion.ts ***!
  \*****************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createChunkLandMotion: () => (/* binding */ createChunkLandMotion)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");

const LOAD_RISE_START_Y = -48;
const LOAD_RISE_MS = 190;
const UNLOAD_SINK_DISTANCE = 12;
const UNLOAD_SINK_MS = 85;
const LAND_FAILSAFE_MULTIPLIER = 1.5;
const GROUND_Y = 0;
const GROUND_EPSILON = 0.25;
function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
}
function nowMs() {
    return performance.now();
}
function createChunkLandMotion() {
    function startRise(entry) {
        entry.landState = 'rising';
        entry.landStartedAt = nowMs();
        entry.landDurationMs = LOAD_RISE_MS;
        entry.landStartY = LOAD_RISE_START_Y;
        entry.landTargetY = GROUND_Y;
        entry.object.position.y = entry.landStartY;
        entry.onLandComplete = null;
    }
    function startSink(entry, onComplete) {
        entry.landState = 'sinking';
        entry.landStartedAt = nowMs();
        entry.landDurationMs = UNLOAD_SINK_MS;
        entry.landStartY = entry.object.position.y;
        entry.landTargetY = entry.landStartY - UNLOAD_SINK_DISTANCE;
        entry.onLandComplete = onComplete;
        entry.pendingUnload = null;
    }
    function settleRise(entry) {
        entry.object.position.y = GROUND_Y;
        entry.landState = 'settled';
        entry.onLandComplete = null;
        const pending = entry.pendingUnload;
        entry.pendingUnload = null;
        pending?.();
    }
    function settleSink(entry) {
        entry.object.position.y = entry.landTargetY;
        const complete = entry.onLandComplete;
        entry.onLandComplete = null;
        entry.pendingUnload = null;
        entry.landState = 'settled';
        complete?.();
    }
    function tickEntry(entry) {
        if (!Number.isFinite(entry.landStartedAt) || entry.landStartedAt <= 0) {
            entry.landStartedAt = nowMs();
        }
        const elapsed = nowMs() - entry.landStartedAt;
        const duration = Math.max(1, entry.landDurationMs);
        const rawT = elapsed / duration;
        const progress = easeOutCubic(Math.min(1, rawT));
        entry.object.position.y = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(entry.landStartY, entry.landTargetY, progress);
        const finished = rawT >= 1 || elapsed >= duration * LAND_FAILSAFE_MULTIPLIER;
        if (!finished) {
            return;
        }
        if (entry.landState === 'rising') {
            settleRise(entry);
            return;
        }
        if (entry.landState === 'sinking') {
            settleSink(entry);
        }
    }
    function normalizeLandState(entry) {
        const state = entry.landState;
        if (state === 'dropping') {
            entry.landState = 'rising';
            if (!Number.isFinite(entry.landStartedAt) || entry.landStartedAt <= 0) {
                entry.landStartedAt = nowMs();
            }
            if (!Number.isFinite(entry.landDurationMs) || entry.landDurationMs <= 0) {
                entry.landDurationMs = LOAD_RISE_MS;
            }
            entry.landStartY = entry.object.position.y;
            entry.landTargetY = GROUND_Y;
        }
    }
    function reconcileGrounded(entry) {
        if (entry.landState === 'rising' || entry.landState === 'sinking') {
            return;
        }
        if (Math.abs(entry.object.position.y - GROUND_Y) > GROUND_EPSILON) {
            entry.object.position.y = GROUND_Y;
            entry.landState = 'settled';
        }
    }
    return {
        isAnimating(entry) {
            return entry.landState === 'rising' || entry.landState === 'sinking';
        },
        beginLoad(entry, enabled) {
            entry.pendingUnload = null;
            entry.onLandComplete = null;
            if (!enabled) {
                entry.landState = 'settled';
                entry.landStartedAt = 0;
                entry.landDurationMs = 0;
                entry.landStartY = GROUND_Y;
                entry.landTargetY = GROUND_Y;
                entry.object.position.y = GROUND_Y;
                return;
            }
            startRise(entry);
        },
        beginUnload(entry, enabled, onComplete) {
            if (!enabled) {
                entry.pendingUnload = null;
                entry.onLandComplete = null;
                entry.landState = 'settled';
                onComplete();
                return false;
            }
            if (entry.landState === 'rising') {
                entry.pendingUnload = () => {
                    startSink(entry, onComplete);
                };
                return true;
            }
            if (entry.landState === 'sinking') {
                entry.onLandComplete = onComplete;
                return true;
            }
            startSink(entry, onComplete);
            return true;
        },
        cancel(entry) {
            entry.pendingUnload = null;
            entry.onLandComplete = null;
            entry.landState = 'settled';
            entry.object.position.y = GROUND_Y;
        },
        update(entries) {
            let active = 0;
            for (const entry of entries) {
                normalizeLandState(entry);
                if (entry.landState === 'rising' || entry.landState === 'sinking') {
                    active += 1;
                    tickEntry(entry);
                    continue;
                }
                reconcileGrounded(entry);
            }
            return active;
        },
        activeCount(entries) {
            let count = 0;
            for (const entry of entries) {
                if (entry.landState === 'rising' || entry.landState === 'sinking') {
                    count += 1;
                }
            }
            return count;
        },
    };
}


/***/ },

/***/ "./src/main/resources/web/src/library/collapsible-section.ts"
/*!*******************************************************************!*\
  !*** ./src/main/resources/web/src/library/collapsible-section.ts ***!
  \*******************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bindHudSectionCollapsibles: () => (/* binding */ bindHudSectionCollapsibles),
/* harmony export */   setHudSectionCollapsed: () => (/* binding */ setHudSectionCollapsed)
/* harmony export */ });
function setHudSectionOpen(section, open) {
    const head = section.querySelector('.hud-section-head');
    if (!head)
        return;
    section.classList.toggle('collapsed', !open);
    head.setAttribute('aria-expanded', String(open));
}
function toggleHudSection(section) {
    setHudSectionOpen(section, section.classList.contains('collapsed'));
}
function bindHudSectionCollapsibles(root = document) {
    for (const head of root.querySelectorAll('.hud-section-head')) {
        const section = head.closest('.hud-section');
        if (!section)
            continue;
        head.addEventListener('click', () => toggleHudSection(section));
        head.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            event.preventDefault();
            toggleHudSection(section);
        });
    }
}
function setHudSectionCollapsed(sectionId, collapsed) {
    const section = document.querySelector(`.hud-section[data-section="${sectionId}"]`);
    if (!section)
        return;
    setHudSectionOpen(section, !collapsed);
}


/***/ },

/***/ "./src/main/resources/web/src/library/confirm-dialog.ts"
/*!**************************************************************!*\
  !*** ./src/main/resources/web/src/library/confirm-dialog.ts ***!
  \**************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   confirmAction: () => (/* binding */ confirmAction)
/* harmony export */ });
const dialogEl = document.querySelector('#confirm-dialog');
const titleEl = document.querySelector('#confirm-dialog-title');
const messageEl = document.querySelector('#confirm-dialog-message');
const confirmButtonEl = document.querySelector('#confirm-dialog-confirm');
const cancelButtonEl = document.querySelector('#confirm-dialog-cancel');
async function confirmAction({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', } = {}) {
    if (!dialogEl || !titleEl || !messageEl || !confirmButtonEl || !cancelButtonEl) {
        return window.confirm(message || title || 'Continue?');
    }
    titleEl.textContent = title || 'Confirm';
    messageEl.textContent = message || '';
    confirmButtonEl.textContent = confirmLabel;
    cancelButtonEl.textContent = cancelLabel;
    dialogEl.returnValue = 'cancel';
    dialogEl.showModal();
    return new Promise((resolve) => {
        const onClose = () => {
            dialogEl.removeEventListener('close', onClose);
            resolve(dialogEl.returnValue === 'confirm');
        };
        dialogEl.addEventListener('close', onClose);
    });
}


/***/ },

/***/ "./src/main/resources/web/src/library/map-tile-loader.ts"
/*!***************************************************************!*\
  !*** ./src/main/resources/web/src/library/map-tile-loader.ts ***!
  \***************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   loadMapTilePng: () => (/* binding */ loadMapTilePng)
/* harmony export */ });
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../client-log.js */ "./src/main/resources/web/src/client-log.ts");

async function loadMapTilePng(world, chunkX, chunkZ) {
    const url = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.map.png`;
    const started = performance.now();
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Map tile request failed: ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const source = response.headers.get('X-Terrascape-Cache') ?? 'other';
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_0__.logClientTiming)('map_tile_single_load', started, { world, chunkX, chunkZ, bytes: bytes.byteLength, source });
    return { bytes, source };
}


/***/ },

/***/ "./src/main/resources/web/src/library/tri-state-control.ts"
/*!*****************************************************************!*\
  !*** ./src/main/resources/web/src/library/tri-state-control.ts ***!
  \*****************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyTriStateValue: () => (/* binding */ applyTriStateValue),
/* harmony export */   bindTriStateControl: () => (/* binding */ bindTriStateControl),
/* harmony export */   setTriStateValue: () => (/* binding */ setTriStateValue)
/* harmony export */ });
function dispatchInputChange(input) {
    input.dispatchEvent(new Event('change', { bubbles: true }));
}
function syncTriStateButtons(group, value) {
    for (const button of group.querySelectorAll('[data-tri-value]')) {
        const active = button.dataset.triValue === value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
}
function bindTriStateControl(root, inputId, options) {
    const input = root.querySelector(`#${inputId}`);
    const group = root.querySelector(`[data-tri-state-for="${inputId}"]`);
    if (!input || !group)
        return;
    const allowed = new Set(options.map((option) => option.value));
    if (!allowed.has(input.value) && options[0]) {
        input.value = options[0].value;
    }
    syncTriStateButtons(group, input.value);
    for (const button of group.querySelectorAll('[data-tri-value]')) {
        button.addEventListener('click', () => {
            const next = button.dataset.triValue;
            if (!next || !allowed.has(next) || input.value === next)
                return;
            input.value = next;
            syncTriStateButtons(group, next);
            dispatchInputChange(input);
        });
    }
}
function setTriStateValue(root, inputId, value) {
    const input = root.querySelector(`#${inputId}`);
    const group = root.querySelector(`[data-tri-state-for="${inputId}"]`);
    if (!input || !group)
        return;
    input.value = value;
    syncTriStateButtons(group, value);
}
function applyTriStateValue(input, value, allowed) {
    if (!input)
        return;
    if (!allowed.includes(value))
        return;
    input.value = value;
    const group = document.querySelector(`[data-tri-state-for="${input.id}"]`);
    if (group)
        syncTriStateButtons(group, value);
}


/***/ },

/***/ "./src/main/resources/web/src/lighting.ts"
/*!************************************************!*\
  !*** ./src/main/resources/web/src/lighting.ts ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyLightingEnvironment: () => (/* binding */ applyLightingEnvironment),
/* harmony export */   applyLightingToObject: () => (/* binding */ applyLightingToObject),
/* harmony export */   createLightingRig: () => (/* binding */ createLightingRig),
/* harmony export */   createTreeShadeObject: () => (/* binding */ createTreeShadeObject),
/* harmony export */   lightingOptionsFromInputs: () => (/* binding */ lightingOptionsFromInputs),
/* harmony export */   positionSkyObjects: () => (/* binding */ positionSkyObjects),
/* harmony export */   updateTreeShadeObject: () => (/* binding */ updateTreeShadeObject)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");

const SUN_RAY_DIRECTION = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55, -0.82, 0.22).normalize();
const SHADE_CLUSTER_SIZE = 7;
const MAX_SHADES_PER_CHUNK = 72;
const TREE_SHADE_KEY = 'terrascapeTreeShade';
const DAY_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x3d86cf);
const DAY_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x88badd);
const NIGHT_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x0b182a);
const NIGHT_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x25364d);
const DAWN_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x7d91c4);
const DAWN_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xe9a18a);
const DAWN_SUN_GLOW = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffdf92);
const DAWN_HAZE = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xd9a4bd);
const FOG_DAY = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xd9f3f2);
const FOG_NIGHT = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x5f7d84);
const FOG_DAWN = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xc39698);
const NIGHT_TERRAIN_TINT = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x60745f);
const DAY_TERRAIN_TINT = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffffff);
let shadeTexture;
function createLightingRig(scene, skyColor) {
    const ambient = new three__WEBPACK_IMPORTED_MODULE_0__.HemisphereLight(0xcde8ff, 0x26342e, 2.2);
    const sun = new three__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight(0xffffff, 2.8);
    sun.position.set(80, 180, 40);
    const sky = createSkyDome();
    const stars = createStarField();
    const sunDisc = createSkyDisc(0xfff4cf, 58, 1);
    const moonDisc = createSkyDisc(0xd7e7ff, 28, 0.72);
    sky.renderOrder = -100;
    stars.renderOrder = -99;
    sunDisc.renderOrder = -98;
    moonDisc.renderOrder = -98;
    scene.add(sky);
    scene.add(stars);
    scene.add(sunDisc);
    scene.add(moonDisc);
    scene.add(ambient);
    scene.add(sun);
    return { ambient, sun, sky, stars, sunDisc, moonDisc, skyColor };
}
function lightingOptionsFromInputs({ treeShadeInput, shadeSizeInput, shadeDarknessInput, time, fogRange }) {
    return {
        sun: true,
        shade: treeShadeInput.checked,
        shadeSize: readRange(shadeSizeInput, 1.85),
        shadeDarkness: readRange(shadeDarknessInput, 0.4),
        time,
        fogRange,
    };
}
function applyLightingEnvironment(scene, renderer, rig, options) {
    const time = normalizeTime(options.time);
    const sunPosition = visualSunPosition(time);
    const sunRayDirection = sunPosition.clone().negate();
    const daylight = visualDaylight(time.dayProgress);
    const night = 1 - daylight;
    const dawn = dawnAmount(time.dayProgress);
    const starOpacity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp((night - 0.52) / 0.34, 0, 1);
    const skyTop = colorForTime(NIGHT_SKY_TOP, DAY_SKY_TOP, DAWN_SKY_TOP, daylight, dawn);
    const skyHorizon = colorForTime(NIGHT_SKY_HORIZON, DAY_SKY_HORIZON, DAWN_SKY_HORIZON, daylight, dawn);
    const fogColor = FOG_NIGHT.clone()
        .lerp(FOG_DAY, daylight)
        .lerp(FOG_DAWN, dawn * (1 - daylight * 0.22));
    if (daylight > 0.25) {
        fogColor.lerp(skyHorizon, daylight * 0.12);
    }
    if (options.sun) {
        rig.ambient.intensity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(0.72, 1.55, daylight) + dawn * 0.12;
        rig.ambient.color.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x8ca9c4).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xe7f4ff), daylight));
        rig.ambient.groundColor.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x324436).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x405638), daylight));
        rig.sun.intensity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(0.16, 3.9, daylight);
        rig.sun.color.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x9ebcff).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffddb0), Math.max(daylight, dawn)));
        rig.sun.position.copy(sunPosition).multiplyScalar(240);
    }
    else {
        rig.ambient.intensity = 2.2;
        rig.ambient.color.set(0xcde8ff);
        rig.ambient.groundColor.set(0x26342e);
        rig.sun.intensity = 2.8;
        rig.sun.color.set(0xffffff);
        rig.sun.position.set(80, 180, 40);
    }
    rig.sky.material.uniforms.topColor.value.copy(skyTop);
    rig.sky.material.uniforms.bottomColor.value.copy(skyHorizon);
    rig.sky.material.uniforms.sunDirection.value.copy(sunPosition);
    rig.sky.material.uniforms.sunGlowColor.value.copy(DAWN_SUN_GLOW);
    rig.sky.material.uniforms.dawnHazeColor.value.copy(DAWN_HAZE);
    rig.sky.material.uniforms.daylight.value = daylight;
    rig.sky.material.uniforms.dawnAmount.value = dawn;
    rig.sky.visible = true;
    rig.stars.visible = starOpacity > 0.01;
    rig.stars.material.opacity = starOpacity;
    rig.stars.material.needsUpdate = true;
    updateSkyDisc(rig.sunDisc, sunPosition, three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(daylight + dawn * 0.26, 0, 1), 980);
    updateSkyDisc(rig.moonDisc, sunPosition.clone().negate(), night, 980);
    scene.background = skyHorizon.clone().lerp(skyTop, 0.38);
    const fogRange = normalizeFogRange(options.fogRange, daylight);
    scene.userData.terrascapeFog = {
        color: fogColor.clone(),
        near: fogRange.near,
        far: fogRange.far,
    };
    scene.fog = null;
    renderer.setClearColor(scene.background, 1);
}
function normalizeFogRange(range, daylight) {
    const fallbackNear = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(1100, 1500, daylight);
    const fallbackFar = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(3600, 5200, daylight);
    const near = Number(range?.near);
    const far = Number(range?.far);
    if (!Number.isFinite(near) || !Number.isFinite(far) || far <= near + 1) {
        return { near: fallbackNear, far: fallbackFar };
    }
    return {
        near: three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(near, 1, 10000),
        far: three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(far, near + 1, 20000),
    };
}
function applyLightingToObject(object, options) {
    object.traverse((node) => {
        if (!node.isMesh || !node.geometry)
            return;
        if (node.userData?.[TREE_SHADE_KEY])
            return;
        applyMaterialLightResponse(node, options);
    });
}
function positionSkyObjects(rig, origin) {
    rig.sky.position.copy(origin);
    rig.stars.position.copy(origin);
    positionSkyDisc(rig.sunDisc, origin);
    positionSkyDisc(rig.moonDisc, origin);
}
function createTreeShadeObject(chunkObject, options) {
    const clusters = collectTreeShadeClusters(chunkObject);
    if (clusters.length === 0) {
        return null;
    }
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.PlaneGeometry(1, 1);
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        map: getShadeTexture(),
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        depthTest: true,
        color: 0x1f3325,
    });
    const mesh = new three__WEBPACK_IMPORTED_MODULE_0__.InstancedMesh(geometry, material, clusters.length);
    mesh.name = 'terrascape-tree-shade';
    mesh.userData[TREE_SHADE_KEY] = true;
    mesh.userData.clusters = clusters;
    mesh.renderOrder = -2;
    updateTreeShadeObject(mesh, options);
    return mesh;
}
function updateTreeShadeObject(mesh, options) {
    if (!mesh?.userData?.[TREE_SHADE_KEY])
        return;
    mesh.visible = options.shade === true;
    const time = normalizeTime(options.time);
    const daylight = options.sun ? visualDaylight(time.dayProgress) : 0.78;
    const sunRayDirection = visualSunPosition(time).negate();
    const lowSun = 1 - three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(Math.abs(sunRayDirection.y) / 0.72, 0, 1);
    mesh.material.opacity = options.shadeDarkness * three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(daylight + 0.1, 0.12, 1) * (options.sun ? 1 : 0.75);
    mesh.material.needsUpdate = true;
    const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
    const position = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    const scale = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    const shadeAngle = Math.atan2(sunRayDirection.z, sunRayDirection.x);
    const rotation = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion().setFromEuler(new three__WEBPACK_IMPORTED_MODULE_0__.Euler(-Math.PI / 2, 0, shadeAngle));
    const offset = options.sun ? three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(1.6, 7.8, lowSun) * daylight : 1.6;
    const offsetX = sunRayDirection.x * offset;
    const offsetZ = sunRayDirection.z * offset;
    const stretch = options.sun ? three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(1, 1.72, lowSun) : 1;
    const sizeMultiplier = options.shadeSize;
    mesh.userData.clusters.forEach((cluster, index) => {
        const strength = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(cluster.count / 14, 0.55, 1.35);
        const radius = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(cluster.radius * (1.25 + strength * 0.28), 5.5, 15);
        position.set(cluster.x + offsetX, cluster.groundY + 0.075, cluster.z + offsetZ);
        const casterScale = cluster.shadeScale ?? 1;
        scale.set(radius * 1.42 * stretch * sizeMultiplier * casterScale, radius * 0.94 * sizeMultiplier * casterScale, 1);
        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
}
function createSkyDome() {
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.SphereGeometry(1400, 32, 16);
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.ShaderMaterial({
        uniforms: {
            topColor: { value: DAY_SKY_TOP.clone() },
            bottomColor: { value: DAY_SKY_HORIZON.clone() },
            sunDirection: { value: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55, 0.82, -0.22).normalize() },
            sunGlowColor: { value: DAWN_SUN_GLOW.clone() },
            dawnHazeColor: { value: DAWN_HAZE.clone() },
            daylight: { value: 1 },
            dawnAmount: { value: 0 },
        },
        vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDirection;
      uniform vec3 sunGlowColor;
      uniform vec3 dawnHazeColor;
      uniform float daylight;
      uniform float dawnAmount;
      varying vec3 vWorldPosition;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += noise(p) * amplitude;
          p *= 2.03;
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec3 direction = normalize(vWorldPosition);
        float h = direction.y;
        float mixValue = smoothstep(-0.08, 0.78, h);
        vec3 color = mix(bottomColor, topColor, mixValue);

        float horizon = 1.0 - smoothstep(0.0, 0.54, h);
        float sunFacing = max(dot(direction, normalize(sunDirection)), 0.0);
        float broadSunGlow = pow(sunFacing, 2.1) * horizon;
        float sunCoreGlow = pow(sunFacing, 18.0) * smoothstep(-0.12, 0.2, h);
        float dawnStrength = dawnAmount * smoothstep(-0.08, 0.38, h);
        float dayWarmth = daylight * (1.0 - smoothstep(0.2, 0.9, h)) * pow(sunFacing, 5.0);

        color = mix(color, dawnHazeColor, dawnStrength * horizon * 0.42);
        color = mix(color, sunGlowColor, dawnStrength * broadSunGlow * 0.78);
        color = mix(color, sunGlowColor, dayWarmth * 0.22);
        color += sunGlowColor * sunCoreGlow * dawnStrength * 0.2;

        vec2 skyUv = direction.xz / max(direction.y + 0.72, 0.18);
        float clouds = smoothstep(0.56, 0.82, fbm(skyUv * 2.25 + vec2(4.2, -1.7)));
        float cloudBand = smoothstep(0.08, 0.48, h) * (1.0 - smoothstep(0.84, 1.0, h));
        color = mix(color, vec3(0.78, 0.9, 1.0), clouds * cloudBand * daylight * 0.28);

        float nebula = smoothstep(0.64, 0.9, fbm(skyUv * 1.45 + vec2(-7.0, 3.5)));
        float nightSky = 1.0 - daylight;
        color = mix(color, vec3(0.5, 0.24, 0.34), nebula * nightSky * smoothstep(0.16, 0.86, h) * 0.16);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
        side: three__WEBPACK_IMPORTED_MODULE_0__.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
    });
    return new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(geometry, material);
}
function createStarField() {
    const count = 2600;
    const positions = new Float32Array(count * 3);
    let seed = 0x5eed1234;
    for (let i = 0; i < count; i++) {
        const theta = random01() * Math.PI * 2;
        const y = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(0.08, 0.98, random01());
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
        const radius = 1160;
        positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
        positions[i * 3 + 1] = y * radius;
        positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;
    }
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry();
    geometry.setAttribute('position', new three__WEBPACK_IMPORTED_MODULE_0__.BufferAttribute(positions, 3));
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.PointsMaterial({
        color: 0xd8ecff,
        size: 1.55,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        fog: false,
    });
    return new three__WEBPACK_IMPORTED_MODULE_0__.Points(geometry, material);
    function random01() {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 0x100000000;
    }
}
function createSkyDisc(color, size, opacity) {
    const texture = createDiscTexture(color, opacity);
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        fog: false,
    });
    const sprite = new three__WEBPACK_IMPORTED_MODULE_0__.Sprite(material);
    sprite.scale.setScalar(size);
    return sprite;
}
function updateSkyDisc(sprite, direction, opacity, radius) {
    sprite.visible = opacity > 0.03;
    sprite.material.opacity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(opacity, 0, 1);
    sprite.material.needsUpdate = true;
    sprite.userData.skyDirection = direction.clone().normalize();
    sprite.userData.skyRadius = radius;
    positionSkyDisc(sprite, new three__WEBPACK_IMPORTED_MODULE_0__.Vector3());
}
function positionSkyDisc(sprite, origin) {
    const direction = sprite.userData.skyDirection;
    const radius = sprite.userData.skyRadius;
    if (!direction || !radius) {
        sprite.position.copy(origin);
        return;
    }
    sprite.position.copy(origin).add(direction.clone().multiplyScalar(radius));
}
function createDiscTexture(color, opacity) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const colorValue = new three__WEBPACK_IMPORTED_MODULE_0__.Color(color);
    const r = Math.round(colorValue.r * 255);
    const g = Math.round(colorValue.g * 255);
    const b = Math.round(colorValue.b * 255);
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 60);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
    gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${opacity * 0.58})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new three__WEBPACK_IMPORTED_MODULE_0__.CanvasTexture(canvas);
}
function normalizeTime(time) {
    if (!time) {
        return {
            dayProgress: 0.5,
            sunlightFactor: 1,
            sunDirection: { x: SUN_RAY_DIRECTION.x, y: SUN_RAY_DIRECTION.y, z: SUN_RAY_DIRECTION.z },
        };
    }
    return {
        dayProgress: three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(Number(time.dayProgress ?? time.day_progress ?? 0.5), 0, 1),
        sunlightFactor: three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(Number(time.sunlightFactor ?? time.sunlight_factor ?? 1), 0, 1),
        sunDirection: time.sunDirection ?? time.sun_direction ?? { x: SUN_RAY_DIRECTION.x, y: SUN_RAY_DIRECTION.y, z: SUN_RAY_DIRECTION.z },
    };
}
function sunRayVector(time) {
    const source = time.sunDirection ?? {};
    const vector = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(Number(source.x), Number(source.y), Number(source.z));
    if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z) || vector.lengthSq() < 0.001) {
        return SUN_RAY_DIRECTION.clone();
    }
    if (vector.y > 0) {
        vector.negate();
    }
    return vector.normalize();
}
function visualSunPosition(time) {
    const ray = sunRayVector(time);
    const horizontal = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-ray.x, 0, -ray.z);
    if (horizontal.lengthSq() < 0.001) {
        horizontal.set(SUN_RAY_DIRECTION.x, 0, SUN_RAY_DIRECTION.z).negate();
    }
    horizontal.normalize();
    const rawElevation = Math.sin(time.dayProgress * Math.PI * 2 - Math.PI / 2);
    const daylight = visualDaylight(time.dayProgress);
    const elevation = daylight > 0.02
        ? Math.max(0.075, rawElevation)
        : Math.min(-0.075, rawElevation);
    const horizontalScale = Math.sqrt(Math.max(0, 1 - elevation * elevation));
    return horizontal.multiplyScalar(horizontalScale).setY(elevation).normalize();
}
function dawnAmount(progress) {
    const sunrise = pulse(progress, 0.25, 0.11);
    const sunset = pulse(progress, 0.75, 0.12);
    return Math.max(sunrise, sunset);
}
function visualDaylight(progress) {
    return Math.min(smoothstep(0.21, 0.31, progress), 1 - smoothstep(0.72, 0.82, progress));
}
function smoothstep(edge0, edge1, value) {
    const t = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}
function pulse(value, center, width) {
    const distance = Math.min(Math.abs(value - center), 1 - Math.abs(value - center));
    return three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp(1 - distance / width, 0, 1);
}
function colorForTime(nightColor, dayColor, dawnColor, daylight, dawn) {
    const base = nightColor.clone().lerp(dayColor, daylight);
    return base.lerp(dawnColor, dawn * (1 - daylight * 0.45));
}
function readRange(input, fallback) {
    const value = Number.parseFloat(input?.value);
    return Number.isFinite(value) ? value : fallback;
}
function applyMaterialLightResponse(mesh, options) {
    const time = normalizeTime(options.time);
    const daylight = visualDaylight(time.dayProgress);
    const nightGrade = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp((0.72 - daylight) / 0.72, 0, 1);
    const terrainTint = DAY_TERRAIN_TINT.clone().lerp(NIGHT_TERRAIN_TINT, nightGrade * 0.55);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
        if (!material)
            continue;
        if (material.color && material.userData?.terrascapeWater !== true) {
            material.color.copy(terrainTint);
        }
        material.roughness = material.userData?.terrascapeWater ? 0.38 : 0.88;
        material.metalness = 0;
        material.needsUpdate = true;
    }
}
function collectTreeShadeClusters(chunkObject) {
    chunkObject.updateMatrixWorld(true);
    const terrainHeights = collectTerrainHeights(chunkObject);
    const clusters = new Map();
    const worldPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    const localPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    chunkObject.traverse((node) => {
        if (!node.isMesh || !node.geometry || !isDetailMesh(node))
            return;
        const position = node.geometry.getAttribute('position');
        if (!position)
            return;
        for (let i = 0; i < position.count; i += 4) {
            worldPoint.fromBufferAttribute(position, i);
            node.localToWorld(worldPoint);
            localPoint.copy(worldPoint);
            chunkObject.worldToLocal(localPoint);
            const keyX = Math.floor(localPoint.x / SHADE_CLUSTER_SIZE);
            const keyZ = Math.floor(localPoint.z / SHADE_CLUSTER_SIZE);
            const key = `${keyX}:${keyZ}`;
            const cluster = clusters.get(key) ?? {
                x: 0,
                z: 0,
                count: 0,
                minX: localPoint.x,
                maxX: localPoint.x,
                minY: localPoint.y,
                maxY: localPoint.y,
                minZ: localPoint.z,
                maxZ: localPoint.z,
            };
            cluster.x += localPoint.x;
            cluster.z += localPoint.z;
            cluster.count++;
            cluster.minX = Math.min(cluster.minX, localPoint.x);
            cluster.maxX = Math.max(cluster.maxX, localPoint.x);
            cluster.minY = Math.min(cluster.minY, localPoint.y);
            cluster.maxY = Math.max(cluster.maxY, localPoint.y);
            cluster.minZ = Math.min(cluster.minZ, localPoint.z);
            cluster.maxZ = Math.max(cluster.maxZ, localPoint.z);
            clusters.set(key, cluster);
        }
    });
    return Array.from(clusters.values())
        .filter((cluster) => cluster.count >= 4)
        .map((cluster) => {
        const x = cluster.x / cluster.count;
        const z = cluster.z / cluster.count;
        const radius = Math.max(cluster.maxX - cluster.minX + 3, cluster.maxZ - cluster.minZ + 3, Math.sqrt(cluster.count) * 2.2);
        const groundY = sampleGroundY(terrainHeights, x, z);
        const canopyHeight = cluster.maxY - groundY;
        const verticalSpan = cluster.maxY - cluster.minY;
        const shrubLikely = canopyHeight < 5.5 || (canopyHeight < 8 && verticalSpan < 4);
        const shadeScale = shrubLikely
            ? three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.clamp((canopyHeight - 2) / 7, 0.16, 0.42)
            : 1;
        return {
            x,
            z,
            count: cluster.count,
            radius,
            groundY,
            shadeScale,
        };
    })
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_SHADES_PER_CHUNK);
}
function collectTerrainHeights(chunkObject) {
    const heights = new Map();
    const worldPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    const localPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    chunkObject.traverse((node) => {
        if (!node.isMesh || !node.geometry || isDetailMesh(node) || isWaterMesh(node))
            return;
        const position = node.geometry.getAttribute('position');
        const normal = node.geometry.getAttribute('normal');
        if (!position)
            return;
        for (let i = 0; i < position.count; i++) {
            if (normal && normal.getY(i) < 0.55)
                continue;
            worldPoint.fromBufferAttribute(position, i);
            node.localToWorld(worldPoint);
            localPoint.copy(worldPoint);
            chunkObject.worldToLocal(localPoint);
            const key = `${Math.round(localPoint.x)}:${Math.round(localPoint.z)}`;
            heights.set(key, Math.max(heights.get(key) ?? -Infinity, localPoint.y));
        }
    });
    return heights;
}
function sampleGroundY(heights, x, z) {
    let bestY = -Infinity;
    let bestDistance = Infinity;
    const cx = Math.round(x);
    const cz = Math.round(z);
    for (let dz = -4; dz <= 4; dz++) {
        for (let dx = -4; dx <= 4; dx++) {
            const y = heights.get(`${cx + dx}:${cz + dz}`);
            if (!Number.isFinite(y))
                continue;
            const distance = dx * dx + dz * dz;
            if (distance < bestDistance || (distance === bestDistance && y > bestY)) {
                bestY = y;
                bestDistance = distance;
            }
        }
    }
    return Number.isFinite(bestY) ? bestY : 100;
}
function isDetailMesh(mesh) {
    return materialsFor(mesh).some((material) => material?.name === 'terrascape-detail');
}
function isWaterMesh(mesh) {
    return materialsFor(mesh).some((material) => material?.name === 'terrascape-water' || material?.userData?.terrascapeWater === true);
}
function materialsFor(mesh) {
    if (!mesh.material)
        return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}
function getShadeTexture() {
    if (shadeTexture)
        return shadeTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
    gradient.addColorStop(0.46, 'rgba(0, 0, 0, 0.26)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    shadeTexture = new three__WEBPACK_IMPORTED_MODULE_0__.CanvasTexture(canvas);
    shadeTexture.name = 'terrascape-tree-shade-gradient';
    return shadeTexture;
}


/***/ },

/***/ "./src/main/resources/web/src/map-backdrop.ts"
/*!****************************************************!*\
  !*** ./src/main/resources/web/src/map-backdrop.ts ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MAP_HORIZON_MARGIN: () => (/* binding */ MAP_HORIZON_MARGIN),
/* harmony export */   auditMapTiles: () => (/* binding */ auditMapTiles),
/* harmony export */   clearMapBackdrop: () => (/* binding */ clearMapBackdrop),
/* harmony export */   configureMapBackdrop: () => (/* binding */ configureMapBackdrop),
/* harmony export */   loadMapTilesForKeys: () => (/* binding */ loadMapTilesForKeys),
/* harmony export */   mapBackdropStats: () => (/* binding */ mapBackdropStats),
/* harmony export */   mapTileMotionActive: () => (/* binding */ mapTileMotionActive),
/* harmony export */   mapTileSceneStats: () => (/* binding */ mapTileSceneStats),
/* harmony export */   probeMapTilePixel: () => (/* binding */ probeMapTilePixel),
/* harmony export */   pruneMapTiles: () => (/* binding */ pruneMapTiles),
/* harmony export */   sampleMapBackdropColor: () => (/* binding */ sampleMapBackdropColor),
/* harmony export */   setMapTileChunkCovered: () => (/* binding */ setMapTileChunkCovered),
/* harmony export */   tickMapTileMotion: () => (/* binding */ tickMapTileMotion),
/* harmony export */   updateMapBackdrop: () => (/* binding */ updateMapBackdrop)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./client-log.js */ "./src/main/resources/web/src/client-log.ts");
/* harmony import */ var _library_map_tile_loader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./library/map-tile-loader.js */ "./src/main/resources/web/src/library/map-tile-loader.ts");
/* harmony import */ var _mesh_cache_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mesh-cache.js */ "./src/main/resources/web/src/mesh-cache.ts");
/* harmony import */ var _water_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./water.js */ "./src/main/resources/web/src/water.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils.js */ "./src/main/resources/web/src/utils.ts");






const CHUNK_SIZE = 32;
/** Map tiles extend this many chunks beyond the voxel terrain square on each side. */
const MAP_HORIZON_MARGIN = 8;
const SKY_RGB = { r: 23, g: 52, b: 84 };
const RISE_START_Y = -48;
const RISE_MS = 140;
const RISE_FAILSAFE_MULTIPLIER = 1.5;
const PROMOTE_PER_FRAME = 96;
const TILE_LOAD_CONCURRENCY = 4;
const IMMEDIATE_TILE_LOAD_LIMIT = 96;
const TILE_QUEUE_SLICE_SIZE = 48;
const loadedTiles = new Map();
const loadedTilesByCoord = new Map();
const pendingRise = [];
const activeRise = new Map();
const desiredTileLoads = new Map();
const inFlightTileLoads = new Map();
let loadGeneration = 0;
let tileLoadGeneration = 0;
let tileLoadWorker = null;
let context = null;
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
function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
}
function tileCacheKey(world, chunkX, chunkZ, formatVersion) {
    return (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_3__.makeMapTileCacheKey)({ world, chunkX, chunkZ, formatVersion });
}
function tileMotionKey(chunkX, chunkZ) {
    return `${chunkX}:${chunkZ}`;
}
function coordKey(chunkX, chunkZ) {
    return `${chunkX}:${chunkZ}`;
}
async function runWithConcurrency(items, concurrency, worker) {
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const item = items[next++];
            await worker(item);
        }
    });
    await Promise.all(workers);
}
async function textureFromPngBytes(bytes, maxAnisotropy) {
    const blob = new Blob([bytes], { type: 'image/png' });
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const loader = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader();
        loader.load(objectUrl, (texture) => {
            URL.revokeObjectURL(objectUrl);
            texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace;
            texture.anisotropy = Math.min(4, maxAnisotropy);
            texture.needsUpdate = true;
            resolve({ texture, image: texture.image ?? null });
        }, undefined, (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        });
    });
}
function applyTileHeight(mesh, chunkX, chunkZ, y = _water_js__WEBPACK_IMPORTED_MODULE_4__.MAP_BACKDROP_Y) {
    mesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, y, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
}
function createTileMesh(texture, chunkX, chunkZ) {
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    geometry.rotateX(-Math.PI / 2);
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.98,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: three__WEBPACK_IMPORTED_MODULE_0__.DoubleSide,
        fog: true,
        toneMapped: false,
    });
    const mesh = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(geometry, material);
    applyTileHeight(mesh, chunkX, chunkZ);
    mesh.name = `map-tile:${chunkX}:${chunkZ}`;
    mesh.renderOrder = 0;
    return mesh;
}
function disposeTileEntry(entry) {
    entry.mesh.parent?.remove(entry.mesh);
    entry.texture.dispose();
    entry.mesh.geometry?.dispose();
    const material = entry.mesh.material;
    if (material && !Array.isArray(material)) {
        material.dispose();
    }
    entry.mesh.dispose?.();
}
function revealTile(entry, motionEnabled) {
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
async function installTile(scene, world, chunkX, chunkZ, bytes, maxAnisotropy, motionEnabled) {
    const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.chunkId)(world, chunkX, chunkZ);
    if (loadedTiles.has(id))
        return loadedTiles.get(id);
    const { texture, image } = await textureFromPngBytes(bytes, maxAnisotropy);
    const mesh = createTileMesh(texture, chunkX, chunkZ);
    const entry = {
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
    loadedTilesByCoord.set(coordKey(chunkX, chunkZ), entry);
    revealTile(entry, motionEnabled);
    return entry;
}
function updateStats() {
    let visibleTiles = 0;
    let totalBytes = 0;
    for (const entry of loadedTiles.values()) {
        if (entry.mesh.visible)
            visibleTiles += 1;
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
function configureMapBackdrop(scene, renderer, options) {
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
function pruneMapTiles(world, retainIds) {
    if (!context?.scene)
        return;
    const scene = context.scene;
    for (const [key, entry] of loadedTiles.entries()) {
        if (retainIds.has(key))
            continue;
        scene.remove(entry.mesh);
        disposeTileEntry(entry);
        loadedTiles.delete(key);
        loadedTilesByCoord.delete(coordKey(entry.chunkX, entry.chunkZ));
        desiredTileLoads.delete(key);
        activeRise.delete(tileMotionKey(entry.chunkX, entry.chunkZ));
    }
    pendingRise.splice(0, pendingRise.length, ...pendingRise.filter((rising) => {
        const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.chunkId)(world, rising.chunkX, rising.chunkZ);
        return retainIds.has(id);
    }));
    updateStats();
}
/** Load map tiles in caller-provided order, cache first, then direct chunk PNG fetches. */
async function loadMapTilesForKeys(world, keys, options = {}) {
    if (!context?.enabled || !context.scene || keys.length === 0)
        return;
    const { scene, renderer, formatVersion, motionEnabled } = context;
    const revealMotion = options.immediate === true ? false : motionEnabled;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
    if (options.replace) {
        for (const [id] of desiredTileLoads) {
            if (!inFlightTileLoads.has(id)) {
                desiredTileLoads.delete(id);
            }
        }
    }
    let queued = 0;
    const immediateRequests = [];
    for (const key of keys) {
        const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.chunkId)(world, key.chunkX, key.chunkZ);
        if (loadedTiles.has(id))
            continue;
        const request = {
            id,
            world,
            chunkX: key.chunkX,
            chunkZ: key.chunkZ,
            scene,
            formatVersion,
            maxAnisotropy,
            motionEnabled: revealMotion,
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
        await runWithConcurrency(immediateRequests, TILE_LOAD_CONCURRENCY, async (request) => {
            if (desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id))
                return;
            try {
                const result = await loadTileRequest(request, loadGeneration);
                if (result.installed || loadedTiles.has(request.id)) {
                    desiredTileLoads.delete(request.id);
                }
            }
            catch (error) {
                desiredTileLoads.delete(request.id);
                console.warn(`Failed to load map tile ${request.chunkX},${request.chunkZ}`, error);
            }
        });
        updateStats();
        loadedImmediateTiles = true;
    }
    startTileLoadWorker();
    if (loadedImmediateTiles)
        return;
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
        await runWithConcurrency(requests, TILE_LOAD_CONCURRENCY, async (request) => {
            if (generation !== loadGeneration)
                return;
            if (desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id))
                return;
            try {
                const result = await loadTileRequest(request, generation);
                if (result.network)
                    networkMissing += 1;
                if (result.installed || loadedTiles.has(request.id) || desiredTileLoads.get(request.id) !== request) {
                    desiredTileLoads.delete(request.id);
                }
            }
            catch (error) {
                desiredTileLoads.delete(request.id);
                console.warn(`Failed to load map tile ${request.chunkX},${request.chunkZ}`, error);
                (0,_client_log_js__WEBPACK_IMPORTED_MODULE_1__.logClientEvent)('map_tile_single_failed', {
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
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_1__.logClientEvent)('map_tiles_stream', {
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
async function loadTileRequest(request, generation) {
    if (loadedTiles.has(request.id))
        return { installed: false, network: false };
    const existing = inFlightTileLoads.get(request.id);
    if (existing && desiredTileLoads.get(request.id) === existing.request)
        return existing.promise;
    const task = loadTileRequestUncached(request, generation).finally(() => {
        if (inFlightTileLoads.get(request.id)?.promise === task) {
            inFlightTileLoads.delete(request.id);
        }
    });
    inFlightTileLoads.set(request.id, { request, promise: task });
    return task;
}
async function loadTileRequestUncached(request, generation) {
    const cacheKey = tileCacheKey(request.world, request.chunkX, request.chunkZ, request.formatVersion);
    const cached = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_3__.readMapTileCache)(cacheKey);
    if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) {
        return { installed: false, network: false };
    }
    if (cached?.bytes) {
        await installTile(request.scene, request.world, request.chunkX, request.chunkZ, cached.bytes, request.maxAnisotropy, request.motionEnabled);
        activeStats.reuses += 1;
        return { installed: true, network: false };
    }
    const result = await (0,_library_map_tile_loader_js__WEBPACK_IMPORTED_MODULE_2__.loadMapTilePng)(request.world, request.chunkX, request.chunkZ);
    if (generation !== loadGeneration || desiredTileLoads.get(request.id) !== request || loadedTiles.has(request.id)) {
        return { installed: false, network: true };
    }
    void (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_3__.writeMapTileCache)(cacheKey, result.bytes.slice(0), { source: result.source });
    await installTile(request.scene, request.world, request.chunkX, request.chunkZ, result.bytes, request.maxAnisotropy, request.motionEnabled);
    return { installed: true, network: true };
}
/** @deprecated Use configureMapBackdrop + loadMapTilesForKeys with terrain batches. */
function updateMapBackdrop(scene, renderer, options) {
    configureMapBackdrop(scene, renderer, options);
    activeStats.centerX = options.centerX ?? 0;
    activeStats.centerZ = options.centerZ ?? 0;
    activeStats.radius = options.meshRadius ?? 0;
    activeStats.chunks = (options.meshRadius ?? 0) * 2 + 1;
    activeStats.anchorX = options.centerX ?? 0;
    activeStats.anchorZ = options.centerZ ?? 0;
}
function setMapTileChunkCovered(_chunkX, _chunkZ, _covered) {
    // Bedrock map tiles stay visible; terrain depth buffer occludes them.
}
function clearMapBackdrop(scene) {
    loadGeneration += 1;
    pendingRise.splice(0, pendingRise.length);
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
function mapBackdropStats() {
    return activeStats;
}
function mapTileSceneStats() {
    let meshCount = 0;
    let visibleCount = 0;
    for (const entry of loadedTiles.values()) {
        meshCount += 1;
        if (entry.mesh.visible)
            visibleCount += 1;
    }
    return {
        meshCount,
        visibleCount,
        ...activeStats,
    };
}
function tickMapTileMotion(motionEnabled) {
    const now = performance.now();
    let promoted = 0;
    while (pendingRise.length > 0 && promoted < PROMOTE_PER_FRAME) {
        const rising = pendingRise.shift();
        if (!rising)
            break;
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
        rising.mesh.position.y = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(rising.startY, _water_js__WEBPACK_IMPORTED_MODULE_4__.MAP_BACKDROP_Y, easeOutCubic(Math.min(1, rawT)));
        if (rawT >= 1 || elapsed >= duration * RISE_FAILSAFE_MULTIPLIER) {
            applyTileHeight(rising.mesh, rising.chunkX, rising.chunkZ);
            activeRise.delete(key);
        }
    }
    updateStats();
    return activeRise.size + pendingRise.length;
}
function mapTileMotionActive() {
    return activeRise.size > 0 || pendingRise.length > 0;
}
function ensureTilePixels(entry) {
    if (entry.pixels || !entry.image)
        return entry.pixels;
    const image = entry.image;
    const width = image.width ?? CHUNK_SIZE;
    const height = image.height ?? CHUNK_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context2d = canvas.getContext('2d', { willReadFrequently: true });
    if (!context2d)
        return null;
    context2d.drawImage(entry.image, 0, 0);
    entry.pixelWidth = width;
    entry.pixelHeight = height;
    entry.pixels = context2d.getImageData(0, 0, width, height).data;
    return entry.pixels;
}
function auditMapTiles(scene) {
    const issues = [];
    const tiles = [];
    for (const entry of loadedTiles.values()) {
        const material = entry.mesh.material;
        const texture = material?.map;
        const image = texture?.image;
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
        if (!row.inScene)
            issues.push(`missing_scene:${entry.chunkX},${entry.chunkZ}`);
        if (!row.hasTexture)
            issues.push(`missing_texture:${entry.chunkX},${entry.chunkZ}`);
        if (row.textureWidth < 8 || row.textureHeight < 8)
            issues.push(`tiny_texture:${entry.chunkX},${entry.chunkZ}`);
        if (!row.visible)
            issues.push(`not_visible:${entry.chunkX},${entry.chunkZ}`);
        if (!sample)
            issues.push(`sample_failed:${entry.chunkX},${entry.chunkZ}`);
    }
    return {
        ok: issues.length === 0 && tiles.length > 0,
        count: tiles.length,
        issues,
        tiles: tiles.slice(0, 8),
    };
}
function probeMapTilePixel(scene, renderer, camera, renderFrame, chunkX, chunkZ) {
    const entry = loadedTilesByCoord.get(coordKey(chunkX, chunkZ));
    if (!entry) {
        return { ok: false, error: 'tile_missing' };
    }
    const savedVisibility = new Map();
    scene.traverse((object) => {
        savedVisibility.set(object, object.visible);
    });
    scene.traverse((object) => {
        if (object === entry.mesh) {
            object.visible = true;
            return;
        }
        if (object === scene)
            return;
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
    camera.lookAt(worldX, _water_js__WEBPACK_IMPORTED_MODULE_4__.MAP_BACKDROP_Y, worldZ);
    camera.updateMatrixWorld(true);
    scene.background = null;
    scene.fog = null;
    renderFrame();
    const canvas = renderer.domElement;
    const gl = renderer.getContext();
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
    const skyDistance = Math.hypot(pixel[0] - SKY_RGB.r, pixel[1] - SKY_RGB.g, pixel[2] - SKY_RGB.b);
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
function sampleMapBackdropColor(worldX, worldZ) {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
        return null;
    }
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const entry = loadedTilesByCoord.get(coordKey(chunkX, chunkZ));
    if (!entry?.image)
        return null;
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localZ = worldZ - chunkZ * CHUNK_SIZE;
    const u = localX / CHUNK_SIZE;
    const v = 1 - (localZ / CHUNK_SIZE);
    if (u < 0 || u > 1 || v < 0 || v > 1)
        return null;
    const pixels = ensureTilePixels(entry);
    if (!pixels)
        return null;
    const x = Math.max(0, Math.min(entry.pixelWidth - 1, Math.floor(u * entry.pixelWidth)));
    const y = Math.max(0, Math.min(entry.pixelHeight - 1, Math.floor(v * entry.pixelHeight)));
    const offset = (y * entry.pixelWidth + x) * 4;
    return { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
}


/***/ },

/***/ "./src/main/resources/web/src/mesh-cache.ts"
/*!**************************************************!*\
  !*** ./src/main/resources/web/src/mesh-cache.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearMeshCache: () => (/* binding */ clearMeshCache),
/* harmony export */   getMeshCacheStats: () => (/* binding */ getMeshCacheStats),
/* harmony export */   makeMapTileCacheKey: () => (/* binding */ makeMapTileCacheKey),
/* harmony export */   makeTerrainCacheKey: () => (/* binding */ makeTerrainCacheKey),
/* harmony export */   readMapTileCache: () => (/* binding */ readMapTileCache),
/* harmony export */   readTerrainCache: () => (/* binding */ readTerrainCache),
/* harmony export */   writeMapTileCache: () => (/* binding */ writeMapTileCache),
/* harmony export */   writeTerrainCache: () => (/* binding */ writeTerrainCache)
/* harmony export */ });
const DB_NAME = 'synthborn-terrascape-cache';
const LEGACY_DB_NAME = 'synthworldview-cache';
const CACHE_MIGRATION_KEY = 'synthborn-terrascape.cacheMigrated';
const DB_VERSION = 2;
const TERRAIN_STORE = 'terrainMeshes';
const MAP_TILE_STORE = 'mapTileTextures';
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let dbPromise = null;
const mapTileWriteQueue = new Map();
let mapTileWriteWorker = null;
function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled, cosmeticsMode, visualDetailMode }) {
    const details = detailsEnabled ? 'details' : 'surface';
    const cosmetics = cosmeticsMode || 'plain';
    const visualDetail = visualDetailMode || 'basic';
    return `${formatVersion}:${details}:${cosmetics}:${visualDetail}:${world}:${chunkX}:${chunkZ}`;
}
async function readTerrainCache(key) {
    try {
        const db = await openDb();
        const record = await requestPromise(db.transaction(TERRAIN_STORE, 'readonly').objectStore(TERRAIN_STORE).get(key));
        if (!record?.bytes || Date.now() - record.updatedAt > MAX_RECORD_AGE_MS) {
            return null;
        }
        return record;
    }
    catch {
        return null;
    }
}
function makeMapTileCacheKey({ world, chunkX, chunkZ, formatVersion }) {
    return `${formatVersion}:map:${world}:${chunkX}:${chunkZ}`;
}
async function readMapTileCache(key) {
    try {
        const db = await openDb();
        const record = await requestPromise(db.transaction(MAP_TILE_STORE, 'readonly').objectStore(MAP_TILE_STORE).get(key));
        if (!record?.bytes || Date.now() - record.updatedAt > MAX_RECORD_AGE_MS) {
            return null;
        }
        return record;
    }
    catch {
        return null;
    }
}
async function writeMapTileCache(key, bytes, meta = {}) {
    if (!bytes?.byteLength)
        return false;
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
    }
    catch {
        return false;
    }
}
async function writeTerrainCache(key, bytes, meta = {}) {
    if (!bytes?.byteLength)
        return false;
    try {
        const db = await openDb();
        await requestPromise(db.transaction(TERRAIN_STORE, 'readwrite').objectStore(TERRAIN_STORE).put({
            key,
            bytes,
            meta,
            updatedAt: Date.now(),
        }));
        return true;
    }
    catch {
        return false;
    }
}
async function getMeshCacheStats() {
    try {
        const db = await openDb();
        const terrain = await countStore(db, TERRAIN_STORE);
        const mapTiles = await countStore(db, MAP_TILE_STORE);
        return { terrain, mapTiles, total: terrain + mapTiles };
    }
    catch {
        return { terrain: 0, mapTiles: 0, total: 0 };
    }
}
async function clearMeshCache() {
    mapTileWriteQueue.clear();
    mapTileWriteWorker = null;
    try {
        const db = await openDb();
        const terrain = await clearStore(db, TERRAIN_STORE);
        const mapTiles = await clearStore(db, MAP_TILE_STORE);
        return { terrain, mapTiles, total: terrain + mapTiles };
    }
    catch (error) {
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
function openLegacyDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
}
async function migrateLegacyMeshCacheIfNeeded() {
    if (window.localStorage.getItem(CACHE_MIGRATION_KEY) === '1')
        return;
    try {
        const legacyDb = await openLegacyDb();
        const nextDb = await openDatabase(DB_NAME);
        for (const storeName of [TERRAIN_STORE, MAP_TILE_STORE]) {
            const records = await readAllStoreRecords(legacyDb, storeName);
            if (records.length === 0)
                continue;
            const transaction = nextDb.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            for (const record of records) {
                store.put(record);
            }
            await transactionPromise(transaction);
        }
        legacyDb.close();
        window.localStorage.setItem(CACHE_MIGRATION_KEY, '1');
    }
    catch {
        // Legacy cache missing or migration not possible; fresh cache is fine.
    }
}
function readAllStoreRecords(db, storeName) {
    return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
    });
}
function openDatabase(name) {
    return new Promise((resolve, reject) => {
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
    if (dbPromise)
        return dbPromise;
    if (!window.indexedDB) {
        dbPromise = Promise.reject(new Error('IndexedDB unavailable'));
        return dbPromise;
    }
    dbPromise = migrateLegacyMeshCacheIfNeeded().then(() => openDatabase(DB_NAME));
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


/***/ },

/***/ "./src/main/resources/web/src/mob-card.ts"
/*!************************************************!*\
  !*** ./src/main/resources/web/src/mob-card.ts ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createMobBadge: () => (/* binding */ createMobBadge),
/* harmony export */   updateMobBadge: () => (/* binding */ updateMobBadge)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");

const ICON_REDRAWS_PER_FRAME = 8;
const MOB_BADGE_WIDTH = 3.6;
const MOB_BADGE_HEIGHT = 4.8;
const PLAYER_BADGE_WIDTH = 4.8;
const PLAYER_BADGE_HEIGHT = 6.4;
const iconCache = new Map();
const pendingIconRedraws = [];
let iconRedrawScheduled = false;
function createMobBadge(mob, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const texture = new three__WEBPACK_IMPORTED_MODULE_0__.CanvasTexture(canvas);
    texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace;
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new three__WEBPACK_IMPORTED_MODULE_0__.Sprite(material);
    sprite.scale.set(4.8, 6.4, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.ctx = ctx;
    sprite.userData.texture = texture;
    sprite.userData.colorHex = `#${color.getHexString()}`;
    updateMobBadge(sprite, mob);
    return sprite;
}
function updateMobBadge(sprite, mob) {
    const key = mobCardKey(mob);
    if (sprite.userData.cardKey === key)
        return;
    sprite.userData.cardKey = key;
    sprite.userData.mob = { ...mob };
    configureMobBadgeScale(sprite);
    const iconUrl = typeof mob.iconUrl === 'string' ? mob.iconUrl : '';
    if (!iconUrl) {
        sprite.userData.iconUrl = '';
        sprite.userData.iconImage = null;
        drawMobBadge(sprite, mob);
        return;
    }
    const cachedIcon = iconCache.get(iconUrl);
    if (cachedIcon?.image) {
        sprite.userData.iconUrl = iconUrl;
        sprite.userData.iconImage = cachedIcon.image;
        drawMobBadge(sprite, mob, cachedIcon.image);
        return;
    }
    sprite.userData.iconUrl = iconUrl;
    sprite.userData.iconImage = null;
    drawMobBadge(sprite, mob);
    if (cachedIcon) {
        cachedIcon.sprites.add(sprite);
        return;
    }
    const iconEntry = {
        image: null,
        sprites: new Set([sprite]),
    };
    iconCache.set(iconUrl, iconEntry);
    const image = new Image();
    image.onload = () => {
        iconEntry.image = image;
        for (const pendingSprite of iconEntry.sprites) {
            enqueueIconRedraw(pendingSprite, iconUrl, image);
        }
        iconEntry.sprites.clear();
    };
    image.onerror = () => {
        for (const pendingSprite of iconEntry.sprites) {
            if (pendingSprite.userData.iconUrl === iconUrl) {
                pendingSprite.userData.iconImage = null;
                drawMobBadge(pendingSprite, pendingSprite.userData.mob);
            }
        }
        iconEntry.sprites.clear();
    };
    image.src = iconUrl;
}
function enqueueIconRedraw(sprite, iconUrl, image) {
    pendingIconRedraws.push({ sprite, iconUrl, image });
    if (!iconRedrawScheduled) {
        iconRedrawScheduled = true;
        requestAnimationFrame(processPendingIconRedraws);
    }
}
function processPendingIconRedraws() {
    iconRedrawScheduled = false;
    let processed = 0;
    while (pendingIconRedraws.length > 0 && processed < ICON_REDRAWS_PER_FRAME) {
        const { sprite, iconUrl, image } = pendingIconRedraws.shift();
        if (sprite.userData.iconUrl === iconUrl) {
            sprite.userData.iconImage = image;
            drawMobBadge(sprite, sprite.userData.mob, image);
        }
        processed += 1;
    }
    if (pendingIconRedraws.length > 0) {
        iconRedrawScheduled = true;
        requestAnimationFrame(processPendingIconRedraws);
    }
}
function drawMobBadge(sprite, mob, image = null) {
    const { ctx, canvas, texture, colorHex: hex } = sprite.userData;
    const label = shortMobLabel(mob.label || mob.type || 'Mob');
    const initials = mobInitials(label);
    const count = Number(mob.count ?? mob.stack ?? 1);
    const damage = statText(mob.attackDamage ?? mob.damage ?? mob.attack, '');
    const hp = statText(mob.hp ?? mob.health ?? mob.maxHealth ?? mob.maxHp, '');
    const hideStats = mob.hideStats === true;
    const showDamage = !hideStats && damage !== '';
    const showHp = !hideStats && hp !== '';
    const showCount = !hideStats && Number.isFinite(count) && count > 1;
    const cardX = 18;
    const cardY = 34;
    const cardWidth = 156;
    const cardHeight = 192;
    const cardRadius = 18;
    const labelHeight = 34;
    const labelX = cardX + 5;
    const labelY = cardY + cardHeight - labelHeight - 6;
    const labelWidth = cardWidth - 10;
    const imageInset = 2;
    const artX = cardX + 4;
    const artY = cardY + 42;
    const artWidth = cardWidth - 8;
    const artHeight = 128;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    drawSlateCardBackground(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (image) {
        const panelGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
        panelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.035)');
        panelGradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.015)');
        panelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
        ctx.fillStyle = panelGradient;
        roundRect(ctx, cardX + imageInset, cardY + imageInset, cardWidth - imageInset * 2, cardHeight - imageInset * 2, cardRadius - imageInset);
        ctx.fill();
        drawCardImage(ctx, image, artX, artY, artWidth, artHeight, 10);
        ctx.fillStyle = 'rgba(5, 9, 11, 0.04)';
        roundRect(ctx, cardX + imageInset, cardY + imageInset, cardWidth - imageInset * 2, cardHeight - imageInset * 2, cardRadius - imageInset);
        ctx.fill();
    }
    else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        roundRect(ctx, 28, 72, 136, 104, 10);
        ctx.fill();
        ctx.fillStyle = hex;
        ctx.font = '900 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 96, 122);
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = hex;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.stroke();
    if (showDamage) {
        const text = `ATK ${damage}`;
        drawStatPill(ctx, cardX + 4, cardY + 4, text, hex, statPillWidth(ctx, text));
    }
    if (showHp) {
        const text = `HP ${hp}`;
        const width = statPillWidth(ctx, text);
        drawStatPill(ctx, cardX + cardWidth - width - 4, cardY + 4, text, hex, width);
    }
    if (showCount) {
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.arc(96, 36, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(5, 8, 10, 0.94)';
        ctx.stroke();
        ctx.fillStyle = '#07100c';
        ctx.font = '1000 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.round(count)), 96, 36);
    }
    ctx.fillStyle = image ? 'rgba(4, 8, 10, 0.78)' : 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);
    ctx.fill();
    ctx.fillStyle = '#f2fbf7';
    ctx.font = fitFont(ctx, label, labelWidth - 18, 19, 12);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cardX + cardWidth / 2, labelY + labelHeight / 2);
    texture.needsUpdate = true;
}
function configureMobBadgeScale(sprite) {
    const mob = sprite.userData.mob;
    const width = mob?.playerCard === true ? PLAYER_BADGE_WIDTH : MOB_BADGE_WIDTH;
    const height = mob?.playerCard === true ? PLAYER_BADGE_HEIGHT : MOB_BADGE_HEIGHT;
    sprite.scale.set(width, height, 1);
}
function drawSlateCardBackground(ctx, x, y, width, height, radius) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.98)');
    gradient.addColorStop(0.45, 'rgba(15, 23, 42, 0.98)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    const sheen = ctx.createLinearGradient(x, y, x, y + height);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    sheen.addColorStop(0.34, 'rgba(255, 255, 255, 0.02)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.fillStyle = sheen;
    roundRect(ctx, x + 2, y + 2, width - 4, height - 4, Math.max(1, radius - 2));
    ctx.fill();
}
function statPillWidth(ctx, text) {
    ctx.font = '900 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    return Math.ceil(Math.max(46, Math.min(66, ctx.measureText(text).width + 14)));
}
function drawStatPill(ctx, x, y, text, hex, width) {
    const height = 24;
    ctx.fillStyle = 'rgba(4, 8, 10, 0.92)';
    ctx.strokeStyle = hex;
    ctx.lineWidth = 2.5;
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#edf7f2';
    ctx.font = fitFont(ctx, text, width - 10, 12, 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}
const imageContentBounds = new WeakMap();
function drawCardImage(ctx, image, x, y, width, height, radius = 0, cover = false) {
    const bounds = transparentContentBounds(image);
    const sourceX = bounds?.x ?? 0;
    const sourceY = bounds?.y ?? 0;
    const sourceWidth = bounds?.width ?? image.naturalWidth;
    const sourceHeight = bounds?.height ?? image.naturalHeight;
    const ratio = cover
        ? Math.max(width / sourceWidth, height / sourceHeight)
        : Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = Math.max(1, sourceWidth * ratio);
    const drawHeight = Math.max(1, sourceHeight * ratio);
    ctx.save();
    if (radius > 0) {
        roundRect(ctx, x, y, width, height, radius);
        ctx.clip();
    }
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.restore();
}
function transparentContentBounds(image) {
    if (imageContentBounds.has(image))
        return imageContentBounds.get(image);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height)
        return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const alpha = pixels[(y * width + x) * 4 + 3];
            if (alpha < 8)
                continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }
    const bounds = maxX < minX || maxY < minY
        ? null
        : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    imageContentBounds.set(image, bounds);
    return bounds;
}
function fitFont(ctx, text, maxWidth, startSize, minSize) {
    for (let size = startSize; size >= minSize; size -= 1) {
        const font = `900 ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.font = font;
        if (ctx.measureText(text).width <= maxWidth)
            return font;
    }
    return `900 ${minSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}
function mobCardKey(mob) {
    return [
        mob.label,
        mob.type,
        mob.iconUrl,
        mob.count,
        mob.stack,
        mob.attackDamage,
        mob.damage,
        mob.attack,
        mob.hp,
        mob.health,
        mob.maxHealth,
        mob.maxHp,
        mob.playerCard,
        mob.hideStats,
    ].join('|');
}
function statText(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.round(value));
    }
    const text = String(value ?? '').trim();
    return text.length > 0 ? text.slice(0, 4).toUpperCase() : '';
}
function mobInitials(text) {
    const words = String(text)
        .replace(/^NPC_/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const letters = words.length >= 2
        ? `${words[0][0]}${words[1][0]}`
        : (words[0] || 'M').slice(0, 2);
    return letters.toUpperCase();
}
function shortMobLabel(text) {
    return String(text)
        .replace(/^NPC_/, '')
        .replace(/_Wander$/i, '')
        .replace(/_Fighter$/i, '')
        .replace(/_+/g, ' ')
        .trim()
        .slice(0, 18) || 'Mob';
}
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}


/***/ },

/***/ "./src/main/resources/web/src/npc-catalog.ts"
/*!***************************************************!*\
  !*** ./src/main/resources/web/src/npc-catalog.ts ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createNpcCatalog: () => (/* binding */ createNpcCatalog)
/* harmony export */ });
function normalizeNpcKey(value) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function stripRuntimeSuffix(value) {
    if (typeof value !== 'string')
        return null;
    return value.replace(/_(Wander|Patrol|Fighter|Archer|Scout|Soldier)$/i, '');
}
function firstFiniteNumber(...values) {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
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
function createNpcCatalog({ logClientEvent }) {
    let loaded = false;
    const detailsById = new Map();
    const aliases = new Map();
    async function load() {
        try {
            const response = await fetch('/npc-details.json');
            if (!response.ok) {
                throw new Error(`NPC details request failed: ${response.status}`);
            }
            const data = await response.json();
            detailsById.clear();
            aliases.clear();
            for (const entry of Object.values(data.entries ?? {})) {
                if (!entry?.id)
                    continue;
                detailsById.set(entry.id, entry);
                for (const alias of entry.aliases ?? []) {
                    aliases.set(normalizeNpcKey(alias), entry);
                }
                aliases.set(normalizeNpcKey(entry.id), entry);
                aliases.set(normalizeNpcKey(entry.label), entry);
                aliases.set(normalizeNpcKey(entry.appearance), entry);
            }
            loaded = true;
            logClientEvent('npc_details_loaded', {
                roles: detailsById.size,
                aliases: aliases.size,
            });
        }
        catch (error) {
            loaded = false;
            console.warn('NPC details lookup failed', error);
            logClientEvent('npc_details_failed', { error: error?.message ?? error });
        }
    }
    function enrich(mob, id) {
        const details = resolve(mob);
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
    function resolve(mob) {
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
            const exact = detailsById.get(candidate);
            if (exact)
                return exact;
            const alias = aliases.get(normalizeNpcKey(candidate));
            if (alias)
                return alias;
        }
        return null;
    }
    function state() {
        return {
            loaded,
            entries: detailsById.size,
            aliases: aliases.size,
        };
    }
    return { load, enrich, state };
}


/***/ },

/***/ "./src/main/resources/web/src/player-tiles.ts"
/*!****************************************************!*\
  !*** ./src/main/resources/web/src/player-tiles.ts ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createPlayerTile: () => (/* binding */ createPlayerTile),
/* harmony export */   updatePlayerTile: () => (/* binding */ updatePlayerTile)
/* harmony export */ });
function playerInitials(name) {
    const parts = String(name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0)
        return '?';
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}
function playerAvatarUrl(player) {
    if (!player?.uuid || !player?.name)
        return null;
    return `/api/player-avatar/${encodeURIComponent(player.uuid)}.png?name=${encodeURIComponent(player.name)}`;
}
function createPlayerTile(player, { activeViewUuid, activeFollowUuid, onFocus, onToggleEyeView, onToggleFollow }) {
    const tile = document.createElement('div');
    tile.className = 'player-tile';
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'player-tile-main';
    main.title = 'Move camera to player';
    main.addEventListener('click', () => onFocus(player.uuid));
    const avatar = document.createElement('span');
    avatar.className = 'player-avatar';
    const name = document.createElement('span');
    name.className = 'player-name';
    main.append(avatar, name);
    const actions = document.createElement('div');
    actions.className = 'player-actions';
    const eyeButton = document.createElement('button');
    eyeButton.type = 'button';
    eyeButton.className = `player-icon-button${activeViewUuid === player.uuid ? ' active' : ''}`;
    eyeButton.textContent = '\u{1F441}\uFE0F';
    eyeButton.title = 'Attach camera to player view';
    eyeButton.setAttribute('aria-label', 'Attach camera to player view');
    eyeButton.setAttribute('aria-pressed', String(activeViewUuid === player.uuid));
    eyeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onToggleEyeView(player.uuid);
    });
    const walkButton = document.createElement('button');
    walkButton.type = 'button';
    walkButton.className = `player-icon-button${activeFollowUuid === player.uuid ? ' active' : ''}`;
    walkButton.textContent = '\u{1F6B6}';
    walkButton.title = 'Follow player from isometric view';
    walkButton.setAttribute('aria-label', 'Follow player from isometric view');
    walkButton.setAttribute('aria-pressed', String(activeFollowUuid === player.uuid));
    walkButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onToggleFollow(player.uuid);
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
function updatePlayerTile(tile, player, { activeViewUuid, activeFollowUuid }) {
    const initials = playerInitials(player.name);
    if (tile.avatar.firstChild?.nodeType === Node.TEXT_NODE) {
        tile.avatar.firstChild.nodeValue = initials;
    }
    else {
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
    }
    else if (!avatarUrl && tile.avatarUrl) {
        tile.avatarUrl = null;
        tile.avatarImage?.remove();
        tile.avatarImage = null;
        tile.avatar.classList.remove('loaded');
    }
    tile.name.textContent = player.name;
    tile.eyeButton.classList.toggle('active', activeViewUuid === player.uuid);
    tile.eyeButton.setAttribute('aria-pressed', String(activeViewUuid === player.uuid));
    tile.walkButton.classList.toggle('active', activeFollowUuid === player.uuid);
    tile.walkButton.setAttribute('aria-pressed', String(activeFollowUuid === player.uuid));
}


/***/ },

/***/ "./src/main/resources/web/src/players.ts"
/*!***********************************************!*\
  !*** ./src/main/resources/web/src/players.ts ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createMobMarker: () => (/* binding */ createMobMarker),
/* harmony export */   createPlayerMarker: () => (/* binding */ createPlayerMarker),
/* harmony export */   disposeObject: () => (/* binding */ disposeObject),
/* harmony export */   updateMobMarkerCard: () => (/* binding */ updateMobMarkerCard),
/* harmony export */   updateMobMarkerHeight: () => (/* binding */ updateMobMarkerHeight),
/* harmony export */   updatePlayerMarkerCard: () => (/* binding */ updatePlayerMarkerCard),
/* harmony export */   updatePlayerMarkerCardHeight: () => (/* binding */ updatePlayerMarkerCardHeight)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var _mob_card_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mob-card.js */ "./src/main/resources/web/src/mob-card.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/main/resources/web/src/utils.ts");



const PLAYER_HEAD_TOP_Y = 2.8;
const PLAYER_CARD_POINTER_MIN_LENGTH = 0.9;
const CARD_POINTER_CARD_OVERLAP = 0.08;
const MOB_POINTER_ANCHOR_Y = 0.65;
const MOB_HEADSHOT_BLOCK_HEIGHT = 2.3;
const MOB_HEADSHOT_BLOCK_MIN_SIZE = 0.2;
const MOB_HEADSHOT_BLOCK_MAX_SIZE = 3.3;
const MOB_HEADSHOT_BLOCK_PIXEL_PADDING = 1;
const MOB_HEADSHOT_IMAGE_TINT = 0xffffff;
const PLAYER_CARD_COLOR = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x5ef1b5);
const fallbackMobHeadshotGeometry = createMobHeadshotGeometry({ width: 1, height: 1 });
const mobHeadshotTextureLoader = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader();
const mobHeadshotMaterials = new Map();
function createPlayerMarker(player) {
    const group = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
    group.name = `player:${player.uuid}`;
    const avatar = createPlayerAvatar();
    group.userData.avatar = avatar;
    group.add(avatar);
    const pointer = createPointer(PLAYER_CARD_COLOR, 'player-card-pointer', 36);
    group.userData.pointer = pointer;
    group.userData.cardPointer = pointer;
    group.userData.cardAnchorY = PLAYER_HEAD_TOP_Y;
    group.userData.minCardPointerLength = PLAYER_CARD_POINTER_MIN_LENGTH;
    group.userData.pointerConnectsToCardBottom = true;
    group.add(pointer);
    const card = (0,_mob_card_js__WEBPACK_IMPORTED_MODULE_1__.createMobBadge)(playerCardData(player), PLAYER_CARD_COLOR);
    card.name = 'player-card';
    card.renderOrder = 38;
    group.userData.badge = card;
    group.userData.card = card;
    group.add(card);
    updatePlayerMarkerCard(group, player);
    updatePlayerMarkerCardHeight(group, 4.35);
    return group;
}
function updatePlayerMarkerCard(marker, player) {
    if (!marker?.userData?.badge)
        return;
    (0,_mob_card_js__WEBPACK_IMPORTED_MODULE_1__.updateMobBadge)(marker.userData.badge, playerCardData(player));
}
function updatePlayerMarkerCardHeight(marker, cardHeight) {
    updateMarkerCardHeight(marker, cardHeight);
}
function createMobMarker(mob) {
    const group = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
    group.name = `mob:${mob.id}`;
    const color = new three__WEBPACK_IMPORTED_MODULE_0__.Color(mob.color || '#ff6f91');
    group.add(createGroundGlow(color));
    group.add(createGroundShadow());
    const stem = createPointer(color, 'mob-pointer', 32);
    group.userData.pointer = stem;
    group.add(stem);
    const badge = (0,_mob_card_js__WEBPACK_IMPORTED_MODULE_1__.createMobBadge)(mob, color);
    badge.name = 'mob-card';
    badge.renderOrder = 35;
    group.userData.badge = badge;
    group.add(badge);
    const headshotBlock = createMobHeadshotBlock(mob);
    group.userData.headshotBlock = headshotBlock;
    group.add(headshotBlock);
    updateMobMarkerHeight(group, 3.4);
    return group;
}
function updateMobMarkerCard(marker, mob) {
    if (!marker?.userData?.badge)
        return;
    (0,_mob_card_js__WEBPACK_IMPORTED_MODULE_1__.updateMobBadge)(marker.userData.badge, mob);
    updateMobHeadshotBlock(marker, mob);
}
function updateMobMarkerHeight(marker, cardHeight) {
    updateMarkerCardHeight(marker, cardHeight);
}
function createPlayerAvatar() {
    const avatar = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
    avatar.name = 'player-facing-avatar';
    const legs = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BoxGeometry(0.54, 1.28, 0.42), new three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial({
        color: 0x5f666b,
        emissive: 0x15181a,
        roughness: 0.72,
    }));
    legs.name = 'player-legs';
    legs.position.y = 0.68;
    avatar.add(legs);
    const body = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BoxGeometry(0.78, 0.78, 0.52), new three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial({
        color: 0x9da5aa,
        emissive: 0x24282b,
        roughness: 0.65,
    }));
    body.name = 'player-body';
    body.position.y = 1.68;
    avatar.add(body);
    const head = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.SphereGeometry(0.36, 24, 16), new three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial({
        color: 0xf5f7f7,
        emissive: 0x34393a,
        roughness: 0.58,
    }));
    head.name = 'player-head';
    head.position.y = 2.43;
    avatar.add(head);
    const faceGlow = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.CircleGeometry(0.16, 24), new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: 0x5bbdff,
        transparent: true,
        opacity: 0.92,
        side: three__WEBPACK_IMPORTED_MODULE_0__.DoubleSide,
        depthWrite: false,
    }));
    faceGlow.name = 'player-face-glow';
    faceGlow.position.set(0, 2.43, -0.365);
    avatar.add(faceGlow);
    const lookLight = new three__WEBPACK_IMPORTED_MODULE_0__.SpotLight(0x66cfff, 4.8, 24, Math.PI * 0.18, 0.72, 1.2);
    lookLight.name = 'player-look-light';
    lookLight.position.set(0, 2.39, -0.38);
    lookLight.castShadow = false;
    avatar.add(lookLight);
    const lookTarget = new three__WEBPACK_IMPORTED_MODULE_0__.Object3D();
    lookTarget.name = 'player-look-light-target';
    lookTarget.position.set(0, 2.31, -8);
    avatar.add(lookTarget);
    lookLight.target = lookTarget;
    return avatar;
}
function createGroundGlow(color) {
    const shadow = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.CircleGeometry(2.25, 36), new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    }));
    shadow.name = 'mob-ground-glow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    shadow.renderOrder = 18;
    return shadow;
}
function createGroundShadow() {
    const contact = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.CircleGeometry(0.72, 28), new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: 0x07100c,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
    }));
    contact.name = 'mob-ground-shadow';
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.055;
    contact.renderOrder = 19;
    return contact;
}
function createMobHeadshotBlock(mob) {
    const entry = mobHeadshotResource(mob);
    const mesh = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(entry.geometry, entry.materials);
    mesh.name = 'mob-headshot-block';
    mesh.renderOrder = 20;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.terrascapeMobHeadshot = true;
    updateMobHeadshotBlockMesh(mesh, mob);
    return mesh;
}
function updateMobHeadshotBlock(marker, mob) {
    let block = marker.userData.headshotBlock;
    if (!block) {
        block = createMobHeadshotBlock(mob);
        marker.userData.headshotBlock = block;
        marker.add(block);
        return;
    }
    const materialKey = mobHeadshotMaterialKey(mob);
    if (block.userData.materialKey !== materialKey) {
        const entry = mobHeadshotResource(mob);
        block.geometry = entry.geometry;
        block.material = entry.materials;
    }
    updateMobHeadshotBlockMesh(block, mob);
}
function updateMobHeadshotBlockMesh(mesh, mob) {
    const materialKey = mobHeadshotMaterialKey(mob);
    if (mesh.userData.materialKey && mesh.userData.materialKey !== materialKey) {
        mobHeadshotMaterials.get(mesh.userData.materialKey)?.meshes.delete(mesh);
    }
    const entry = mobHeadshotMaterials.get(materialKey);
    mesh.userData.materialKey = materialKey;
    mesh.userData.mob = { ...mob };
    entry?.meshes.add(mesh);
    mesh.geometry = entry?.geometry ?? fallbackMobHeadshotGeometry;
    mesh.scale.set(1, 1, 1);
    positionMobHeadshotBlock(mesh);
}
function mobHeadshotMaterialKey(mob) {
    return typeof mob?.iconUrl === 'string' && mob.iconUrl ? mob.iconUrl : `color:${mob?.color ?? 'default'}`;
}
function mobHeadshotResource(mob) {
    const key = mobHeadshotMaterialKey(mob);
    const existing = mobHeadshotMaterials.get(key);
    if (existing)
        return existing;
    const fallbackMaterial = sharedMobHeadshotSideMaterial(mob?.color);
    const capMaterial = sharedMobHeadshotCapMaterial(mob?.color);
    const materials = mobHeadshotFaceMaterials(fallbackMaterial, capMaterial);
    const entry = {
        aspect: 1,
        geometry: fallbackMobHeadshotGeometry,
        materials,
        meshes: new Set(),
    };
    mobHeadshotMaterials.set(key, entry);
    const iconUrl = typeof mob?.iconUrl === 'string' ? mob.iconUrl : '';
    if (iconUrl) {
        mobHeadshotTextureLoader.load(iconUrl, (texture) => {
            texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace;
            texture.userData.terrascapeShared = true;
            const image = texture.image;
            const imageWidth = image?.width ?? 1;
            const imageHeight = image?.height ?? 1;
            const iconBounds = mobHeadshotIconBounds(image);
            const cropBounds = paddedMobHeadshotBounds(iconBounds, imageWidth, imageHeight);
            applyMobHeadshotTextureCrop(texture, cropBounds, imageWidth, imageHeight);
            const aspect = cropBounds.width && cropBounds.height ? cropBounds.width / cropBounds.height : 1;
            entry.aspect = aspect;
            entry.geometry = createMobHeadshotGeometry(cropBounds, imageWidth, imageHeight);
            const imageMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
                map: texture,
                color: MOB_HEADSHOT_IMAGE_TINT,
                transparent: true,
                opacity: 1,
                depthWrite: true,
            });
            imageMaterial.userData.terrascapeShared = true;
            entry.materials = mobHeadshotFaceMaterials(imageMaterial, capMaterial);
            for (const mesh of entry.meshes) {
                if (mesh.userData.materialKey !== key)
                    continue;
                mesh.geometry = entry.geometry;
                mesh.material = entry.materials;
                positionMobHeadshotBlock(mesh);
            }
        }, undefined, () => {
            entry.meshes.clear();
        });
    }
    return entry;
}
function createMobHeadshotGeometry(bounds, imageWidth = bounds?.width, imageHeight = bounds?.height) {
    const safeWidth = Math.max(1, Number(bounds?.width) || 1);
    const safeHeight = Math.max(1, Number(bounds?.height) || 1);
    const sourceHeight = Math.max(1, Number(imageHeight) || safeHeight);
    const pixelWorldSize = MOB_HEADSHOT_BLOCK_HEIGHT / sourceHeight;
    const width = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.clamp)(safeWidth * pixelWorldSize, MOB_HEADSHOT_BLOCK_MIN_SIZE, MOB_HEADSHOT_BLOCK_MAX_SIZE);
    const height = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.clamp)(safeHeight * pixelWorldSize, MOB_HEADSHOT_BLOCK_MIN_SIZE, MOB_HEADSHOT_BLOCK_HEIGHT);
    const depth = width;
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BoxGeometry(width, height, depth);
    geometry.userData.terrascapeShared = true;
    geometry.userData.mobHeadshotSize = {
        imageWidth: Math.max(1, Number(imageWidth) || safeWidth),
        imageHeight: sourceHeight,
        cropX: Math.max(0, Number(bounds?.x) || 0),
        cropY: Math.max(0, Number(bounds?.y) || 0),
        cropWidth: safeWidth,
        cropHeight: safeHeight,
        width,
        height,
        depth,
    };
    return geometry;
}
function positionMobHeadshotBlock(mesh) {
    const height = Number(mesh.geometry?.userData?.mobHeadshotSize?.height) || MOB_HEADSHOT_BLOCK_HEIGHT;
    mesh.position.set(0, 0.12 + height / 2, 0);
}
function mobHeadshotIconBounds(image) {
    const width = Math.max(1, Number(image?.width) || 1);
    const height = Math.max(1, Number(image?.height) || 1);
    const fallback = { x: 0, y: 0, width, height };
    if (!image || typeof document === 'undefined')
        return fallback;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx)
            return fallback;
        ctx.drawImage(image, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                if (data[(y * width + x) * 4 + 3] <= 8)
                    continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        if (maxX < minX || maxY < minY)
            return fallback;
        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        };
    }
    catch {
        return fallback;
    }
}
function paddedMobHeadshotBounds(bounds, imageWidth, imageHeight) {
    const width = Math.max(1, Number(imageWidth) || 1);
    const height = Math.max(1, Number(imageHeight) || 1);
    const x = Math.max(0, Math.floor(bounds.x) - MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
    const y = Math.max(0, Math.floor(bounds.y) - MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
    const right = Math.min(width, Math.ceil(bounds.x + bounds.width) + MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
    const bottom = Math.min(height, Math.ceil(bounds.y + bounds.height) + MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
    return {
        x,
        y,
        width: Math.max(1, right - x),
        height: Math.max(1, bottom - y),
    };
}
function applyMobHeadshotTextureCrop(texture, bounds, imageWidth, imageHeight) {
    const width = Math.max(1, Number(imageWidth) || 1);
    const height = Math.max(1, Number(imageHeight) || 1);
    texture.offset.set(bounds.x / width, 1 - ((bounds.y + bounds.height) / height));
    texture.repeat.set(bounds.width / width, bounds.height / height);
    texture.needsUpdate = true;
}
function sharedMobHeadshotSideMaterial(color) {
    const baseColor = new three__WEBPACK_IMPORTED_MODULE_0__.Color(color || '#1a2325');
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: baseColor.multiplyScalar(0.32),
        transparent: false,
        opacity: 1,
        depthWrite: true,
    });
    material.userData.terrascapeShared = true;
    return material;
}
function sharedMobHeadshotCapMaterial(color) {
    const baseColor = new three__WEBPACK_IMPORTED_MODULE_0__.Color(color || '#1a2325');
    const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: baseColor.multiplyScalar(0.18),
        transparent: false,
        opacity: 1,
        depthWrite: true,
    });
    material.userData.terrascapeShared = true;
    return material;
}
function mobHeadshotFaceMaterials(sideMaterial, capMaterial) {
    // BoxGeometry material order: +x, -x, +y, -y, +z, -z.
    // The four vertical sides carry the mob image; top and bottom stay dark glass.
    return [sideMaterial, sideMaterial, capMaterial, capMaterial, sideMaterial, sideMaterial];
}
function createPointer(color, name, renderOrder) {
    const pointer = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.CylinderGeometry(0.035, 0.09, 1, 12), new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
    }));
    pointer.name = name;
    pointer.renderOrder = renderOrder;
    return pointer;
}
function playerCardData(player) {
    return {
        id: player?.uuid ?? 'player',
        type: 'Player',
        label: player?.name ?? 'Player',
        iconUrl: typeof player?.avatarUrl === 'string' ? player.avatarUrl : '',
        color: `#${PLAYER_CARD_COLOR.getHexString()}`,
        playerCard: true,
        hideStats: true,
    };
}
function updateMarkerCardHeight(marker, cardHeight) {
    const pointer = marker?.userData?.pointer;
    const card = marker?.userData?.badge;
    if (!pointer || !card)
        return;
    const cardHalfHeight = Math.max(0, card.scale?.y ?? 0) / 2;
    const anchorY = Number.isFinite(marker.userData.cardAnchorY)
        ? marker.userData.cardAnchorY
        : MOB_POINTER_ANCHOR_Y;
    const minPointerLength = Number.isFinite(marker.userData.minCardPointerLength)
        ? marker.userData.minCardPointerLength
        : 0.8;
    const connectsToCardBottom = marker.userData.pointerConnectsToCardBottom === true;
    const minimumHeight = connectsToCardBottom
        ? anchorY + minPointerLength + cardHalfHeight
        : anchorY + minPointerLength;
    const height = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.clamp)(Math.max(cardHeight, minimumHeight), 2.8, 24);
    const pointerTopY = connectsToCardBottom
        ? height - cardHalfHeight + CARD_POINTER_CARD_OVERLAP
        : height;
    const pointerLength = Math.max(minPointerLength, pointerTopY - anchorY);
    pointer.scale.y = pointerLength;
    pointer.position.y = anchorY + pointerLength / 2;
    card.position.y = height;
}
function disposeObject(root) {
    root.traverse((object) => {
        if (object.userData?.terrascapeMobHeadshot && object.userData.materialKey) {
            mobHeadshotMaterials.get(object.userData.materialKey)?.meshes.delete(object);
        }
        if (object.geometry && object.geometry.userData?.terrascapeShared !== true)
            object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (material?.userData?.terrascapeShared === true)
                    continue;
                for (const value of Object.values(material)) {
                    if (value?.isTexture && value.userData?.terrascapeShared !== true)
                        value.dispose();
                }
                material.dispose();
            }
        }
    });
}


/***/ },

/***/ "./src/main/resources/web/src/postprocessing.ts"
/*!******************************************************!*\
  !*** ./src/main/resources/web/src/postprocessing.ts ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createPostProcessing: () => (/* binding */ createPostProcessing),
/* harmony export */   renderPostProcessing: () => (/* binding */ renderPostProcessing),
/* harmony export */   resizePostProcessing: () => (/* binding */ resizePostProcessing),
/* harmony export */   setFogOptions: () => (/* binding */ setFogOptions)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three_addons_postprocessing_EffectComposer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! three/addons/postprocessing/EffectComposer.js */ "three/addons/postprocessing/EffectComposer.js");
/* harmony import */ var three_addons_postprocessing_RenderPass_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! three/addons/postprocessing/RenderPass.js */ "three/addons/postprocessing/RenderPass.js");
/* harmony import */ var three_addons_postprocessing_ShaderPass_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! three/addons/postprocessing/ShaderPass.js */ "three/addons/postprocessing/ShaderPass.js");




const DEFAULT_FOG_COLOR = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xd9f3f2);
const DEPTH_FOG_SHADER = {
    name: 'SynthTerrascapeDepthFog',
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 6000 },
        fogNear: { value: 150 },
        fogFar: { value: 620 },
        fogColor: { value: DEFAULT_FOG_COLOR.clone() },
        fogStrength: { value: 0.9 },
        horizonStrength: { value: 0.65 },
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    #include <packing>

    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float fogNear;
    uniform float fogFar;
    uniform vec3 fogColor;
    uniform float fogStrength;
    uniform float horizonStrength;
    varying vec2 vUv;

    float readViewZ(sampler2D depthSampler, vec2 coord) {
      float fragCoordZ = texture2D(depthSampler, coord).x;
      float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      return -viewZ;
    }

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      float rawDepth = texture2D(tDepth, vUv).x;
      float viewDistance = readViewZ(tDepth, vUv);
      float range = max(1.0, fogFar - fogNear);
      float distanceFog = smoothstep(fogNear, fogNear + range, viewDistance);
      float skyPixel = step(0.9999, rawDepth);
      float skyHaze = skyPixel * smoothstep(0.72, 0.34, vUv.y) * horizonStrength;
      float terrainHaze = (1.0 - skyPixel) * distanceFog * smoothstep(0.62, 0.24, vUv.y) * horizonStrength * 0.3;
      float fogAmount = clamp(max(distanceFog, skyHaze) * fogStrength + terrainHaze, 0.0, 1.0);
      vec3 hazeColor = max(fogColor, source.rgb);
      vec3 color = mix(source.rgb, hazeColor, fogAmount);
      gl_FragColor = vec4(color, source.a);
    }
  `,
};
function createPostProcessing(renderer, scene, camera) {
    const renderTarget = createDepthRenderTarget(renderer);
    const composer = new three_addons_postprocessing_EffectComposer_js__WEBPACK_IMPORTED_MODULE_1__.EffectComposer(renderer, renderTarget);
    const renderPass = new three_addons_postprocessing_RenderPass_js__WEBPACK_IMPORTED_MODULE_2__.RenderPass(scene, camera);
    const fogPass = new three_addons_postprocessing_ShaderPass_js__WEBPACK_IMPORTED_MODULE_3__.ShaderPass(DEPTH_FOG_SHADER);
    composer.addPass(renderPass);
    composer.addPass(fogPass);
    fogPass.enabled = true;
    setDepthTextureUniform(composer, fogPass);
    updateCameraUniforms(fogPass, camera);
    return { composer, fogPass, renderPass, enabled: true };
}
function setFogOptions(post, options = {}) {
    post.enabled = options.enabled !== false;
    post.fogPass.enabled = post.enabled;
    post.fogPass.uniforms.fogNear.value = finiteNumber(options.near, 150);
    post.fogPass.uniforms.fogFar.value = Math.max(post.fogPass.uniforms.fogNear.value + 1, finiteNumber(options.far, 620));
    post.fogPass.uniforms.fogStrength.value = finiteNumber(options.strength, 0.9);
    post.fogPass.uniforms.horizonStrength.value = finiteNumber(options.horizonStrength, 0.65);
    if (options.color?.isColor) {
        post.fogPass.uniforms.fogColor.value.copy(options.color);
    }
}
function resizePostProcessing(post, width, height, pixelRatio) {
    post.composer.setPixelRatio(pixelRatio);
    post.composer.setSize(width, height);
    ensureDepthTexture(post.composer.renderTarget1);
    ensureDepthTexture(post.composer.renderTarget2);
    setDepthTextureUniform(post.composer, post.fogPass);
}
function renderPostProcessing(post, renderer, scene, camera, deltaSeconds) {
    if (!post.enabled) {
        renderer.render(scene, camera);
        return;
    }
    updateCameraUniforms(post.fogPass, camera);
    setDepthTextureUniform(post.composer, post.fogPass);
    post.composer.render(deltaSeconds);
}
function createDepthRenderTarget(renderer) {
    const size = renderer.getSize(new three__WEBPACK_IMPORTED_MODULE_0__.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const renderTarget = new three__WEBPACK_IMPORTED_MODULE_0__.WebGLRenderTarget(Math.max(1, Math.floor(size.x * pixelRatio)), Math.max(1, Math.floor(size.y * pixelRatio)), {
        type: three__WEBPACK_IMPORTED_MODULE_0__.HalfFloatType,
        minFilter: three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter,
        magFilter: three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter,
        stencilBuffer: false,
        depthBuffer: true,
    });
    ensureDepthTexture(renderTarget);
    return renderTarget;
}
function ensureDepthTexture(target) {
    if (!target)
        return;
    if (target.depthTexture)
        return;
    target.depthBuffer = true;
    target.depthTexture = new three__WEBPACK_IMPORTED_MODULE_0__.DepthTexture(target.width, target.height);
    target.depthTexture.format = three__WEBPACK_IMPORTED_MODULE_0__.DepthFormat;
    target.depthTexture.type = three__WEBPACK_IMPORTED_MODULE_0__.UnsignedShortType;
    target.depthTexture.name = 'terrascape-postprocess-depth';
}
function setDepthTextureUniform(composer, fogPass) {
    ensureDepthTexture(composer.readBuffer);
    fogPass.uniforms.tDepth.value = composer.readBuffer.depthTexture;
}
function updateCameraUniforms(fogPass, camera) {
    fogPass.uniforms.cameraNear.value = camera.near;
    fogPass.uniforms.cameraFar.value = camera.far;
}
function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}


/***/ },

/***/ "./src/main/resources/web/src/time-ribbon.ts"
/*!***************************************************!*\
  !*** ./src/main/resources/web/src/time-ribbon.ts ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTimeRibbon: () => (/* binding */ createTimeRibbon)
/* harmony export */ });
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
function createTimeRibbon({ labelEl, sceneEl, sunEl, moonEl, starsEl }) {
    function update(worldTime) {
        if (!worldTime) {
            labelEl.value = '--:--';
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
        labelEl.value = `${pad2(hour)}:${pad2(minute)} ${phase}`;
        renderSky(progress);
    }
    function renderSky(progress) {
        const { top, bottom } = skyColors(progress);
        sceneEl.style.background = `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
        const day = dayFactor(progress);
        placeSkyBody(sunEl, (progress - 0.25) / 0.5, day);
        const moonProgress = progress >= 0.5 ? progress : progress + 1;
        placeSkyBody(moonEl, (moonProgress - 0.75) / 0.5, 1 - day);
        starsEl.style.opacity = (1 - day).toFixed(3);
    }
    return { update };
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
function placeSkyBody(el, t, opacity) {
    const clamped = Math.max(0, Math.min(1, t));
    const arc = Math.sin(clamped * Math.PI);
    el.style.left = `${6 + clamped * 88}%`;
    el.style.top = `${78 - arc * 62}%`;
    el.style.opacity = opacity.toFixed(3);
}
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


/***/ },

/***/ "./src/main/resources/web/src/utils.ts"
/*!*********************************************!*\
  !*** ./src/main/resources/web/src/utils.ts ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   base64ToArrayBuffer: () => (/* binding */ base64ToArrayBuffer),
/* harmony export */   centerId: () => (/* binding */ centerId),
/* harmony export */   chunkId: () => (/* binding */ chunkId),
/* harmony export */   clamp: () => (/* binding */ clamp),
/* harmony export */   delay: () => (/* binding */ delay),
/* harmony export */   formatBytes: () => (/* binding */ formatBytes),
/* harmony export */   formatCoord: () => (/* binding */ formatCoord),
/* harmony export */   numberOr: () => (/* binding */ numberOr)
/* harmony export */ });
function chunkId(world, chunkX, chunkZ) {
    return `${world}:${chunkX}:${chunkZ}`;
}
function centerId(world, chunkX, chunkZ) {
    return `${world}:${chunkX}:${chunkZ}`;
}
function numberOr(value, fallback) {
    return Number.isNaN(value) ? fallback : value;
}
function formatCoord(value) {
    return Math.round(value).toString();
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0)
        return '';
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/***/ },

/***/ "./src/main/resources/web/src/view-state.ts"
/*!**************************************************!*\
  !*** ./src/main/resources/web/src/view-state.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VIEW_STATE_KEY: () => (/* binding */ VIEW_STATE_KEY),
/* harmony export */   isVectorState: () => (/* binding */ isVectorState),
/* harmony export */   loadStoredViewState: () => (/* binding */ loadStoredViewState),
/* harmony export */   saveStoredViewState: () => (/* binding */ saveStoredViewState),
/* harmony export */   vectorState: () => (/* binding */ vectorState)
/* harmony export */ });
const VIEW_STATE_KEY = 'synthborn-terrascape.viewState.v1';
const LEGACY_VIEW_STATE_KEY = 'synthworldview.viewState.v1';
function loadStoredViewState() {
    try {
        let raw = window.localStorage.getItem(VIEW_STATE_KEY);
        if (!raw) {
            raw = window.localStorage.getItem(LEGACY_VIEW_STATE_KEY);
            if (raw) {
                window.localStorage.setItem(VIEW_STATE_KEY, raw);
                window.localStorage.removeItem(LEGACY_VIEW_STATE_KEY);
            }
        }
        return raw ? JSON.parse(raw) : null;
    }
    catch (error) {
        console.warn('Failed to load view state', error);
        return null;
    }
}
function saveStoredViewState(state) {
    try {
        window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
        return true;
    }
    catch (error) {
        console.warn('Failed to save view state', error);
        return false;
    }
}
function vectorState(vector) {
    return {
        x: roundStateNumber(vector.x),
        y: roundStateNumber(vector.y),
        z: roundStateNumber(vector.z),
    };
}
function isVectorState(value) {
    return value
        && Number.isFinite(value.x)
        && Number.isFinite(value.y)
        && Number.isFinite(value.z);
}
function roundStateNumber(value) {
    return Math.round(value * 1000) / 1000;
}


/***/ },

/***/ "./src/main/resources/web/src/water.ts"
/*!*********************************************!*\
  !*** ./src/main/resources/web/src/water.ts ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MAP_BACKDROP_Y: () => (/* binding */ MAP_BACKDROP_Y),
/* harmony export */   applyWaterModeToObject: () => (/* binding */ applyWaterModeToObject),
/* harmony export */   prepareWaterMaterials: () => (/* binding */ prepareWaterMaterials),
/* harmony export */   resolveMapBackdropY: () => (/* binding */ resolveMapBackdropY),
/* harmony export */   tintWaterMaterialsFromMap: () => (/* binding */ tintWaterMaterialsFromMap),
/* harmony export */   updateWaterMaterials: () => (/* binding */ updateWaterMaterials)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");

const FALLBACK_MAP_WATER_COLOR = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x2a80b7);
const WATER_DEFAULTS = {
    waveHeight: 0.35,
    waveFrequency: 1.0,
    waveSpeed: 0.38,
    waterOpacity: 0.92,
};
const tempBox = new three__WEBPACK_IMPORTED_MODULE_0__.Box3();
const tempCenter = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempEye = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempDirection = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempLookAt = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempUp = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const textureMatrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
const reflectionCamera = new three__WEBPACK_IMPORTED_MODULE_0__.PerspectiveCamera();
const trackedWaterMaterials = new Set();
const trackedWaterMeshes = new Set();
const waterNormals = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader().load('/textures/waternormals.jpg');
waterNormals.wrapS = waterNormals.wrapT = three__WEBPACK_IMPORTED_MODULE_0__.RepeatWrapping;
waterNormals.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.NoColorSpace;
let reflectionTarget = null;
const waterVertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  uniform float time;
  uniform float waveHeight;
  uniform float waveFrequency;

  varying vec4 mirrorCoord;
  varying vec3 vWorldPosition;

  float waterWave(vec2 p) {
    float waveA = sin((p.x * 0.018 + time * 0.65) * waveFrequency);
    float waveB = sin((p.y * 0.024 + p.x * 0.006 - time * 0.42) * waveFrequency);
    float waveC = sin((p.x * -0.012 + p.y * 0.019 + time * 0.31) * waveFrequency);
    return waveA * 0.55 + waveB * 0.32 + waveC * 0.18;
  }

  void main() {
    vec3 transformed = position;
    vec4 baseWorldPosition = modelMatrix * vec4(position, 1.0);
    transformed.y += waterWave(vec2(baseWorldPosition.x, -baseWorldPosition.z)) * waveHeight;
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    mirrorCoord = textureMatrix * worldPosition;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;
const waterFragmentShader = /* glsl */ `
  uniform sampler2D reflectionSampler;
  uniform sampler2D normalSampler;
  uniform float alpha;
  uniform float time;
  uniform float size;
  uniform float shaderMix;
  uniform float distortionScale;
  uniform vec3 eye;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform vec3 waterColor;

  varying vec4 mirrorCoord;
  varying vec3 vWorldPosition;

  vec4 flowNoise(vec2 uv) {
    vec2 uv0 = (uv / 103.0) + vec2(time / 17.0, time / 29.0);
    vec2 uv1 = uv / 107.0 - vec2(time / -19.0, time / 31.0);
    vec2 uv2 = uv / vec2(8907.0, 9803.0) + vec2(time / 101.0, time / 97.0);
    vec2 uv3 = uv / vec2(1091.0, 1027.0) - vec2(time / 109.0, time / -113.0);
    vec4 noise = texture2D(normalSampler, uv0)
      + texture2D(normalSampler, uv1)
      + texture2D(normalSampler, uv2)
      + texture2D(normalSampler, uv3);
    return noise * 0.5 - 1.0;
  }

  void sunLight(
    const vec3 surfaceNormal,
    const vec3 eyeDirection,
    float shiny,
    float spec,
    float diffuse,
    inout vec3 diffuseColor,
    inout vec3 specularColor
  ) {
    vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
    float direction = max(0.0, dot(eyeDirection, reflection));
    specularColor += pow(direction, shiny) * sunColor * spec;
    diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;
  }

  void main() {
    vec4 noise = flowNoise(vWorldPosition.xz * size);
    vec3 surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5));

    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);

    vec3 worldToEye = eye - vWorldPosition;
    vec3 eyeDirection = normalize(worldToEye);
    sunLight(surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);

    float eyeDist = length(worldToEye);
    vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / eyeDist) * distortionScale;
    vec3 reflectionSample = vec3(
      texture2D(reflectionSampler, mirrorCoord.xy / mirrorCoord.w + distortion)
    );

    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow(1.0 - theta, 5.0);
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
    vec3 albedo = mix(
      sunColor * diffuseLight * 0.3 + scatter,
      vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight,
      reflectance
    );
    gl_FragColor = vec4(mix(waterColor, albedo, shaderMix), alpha);
    #include <colorspace_fragment>
  }
`;
function prepareWaterMaterials(root) {
    root.traverse((object) => {
        if (!object.isMesh || !object.material)
            return;
        let hasWaterMaterial = false;
        if (Array.isArray(object.material)) {
            object.material = object.material.map((material) => {
                const prepared = prepareWaterMaterial(material);
                hasWaterMaterial = hasWaterMaterial || isWaterMaterial(prepared);
                return prepared;
            });
        }
        else {
            object.material = prepareWaterMaterial(object.material);
            hasWaterMaterial = isWaterMaterial(object.material);
        }
        if (hasWaterMaterial) {
            trackWaterMesh(object);
        }
    });
}
function tintWaterMaterialsFromMap(root, sampleMapColor) {
    root.updateWorldMatrix?.(true, true);
    root.traverse((object) => {
        if (!object.isMesh || !object.material)
            return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const waterMaterials = materials.filter(isWaterMaterial);
        if (waterMaterials.length === 0)
            return;
        const tint = sampleWaterTint(object, sampleMapColor);
        for (const material of waterMaterials) {
            material.vertexColors = false;
            if (material.uniforms?.waterColor) {
                material.uniforms.waterColor.value.copy(tint);
            }
            material.userData.terrascapeWaterColor = tint.clone();
            material.needsUpdate = true;
        }
    });
}
function applyWaterModeToObject(root, mode) {
    root.traverse((object) => {
        if (!object.material)
            return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        let hasWaterMaterial = false;
        for (const material of materials) {
            if (!isWaterMaterial(material))
                continue;
            hasWaterMaterial = true;
            material.visible = mode !== 'hidden';
            material.transparent = true;
            material.opacity = mode === 'transparent' ? 0.48 : (mode === 'shader' ? WATER_DEFAULTS.waterOpacity : 1.0);
            setWaterAlpha(material, material.opacity);
            setWaterShaderActive(material, mode === 'shader');
            material.depthWrite = mode !== 'transparent';
            material.needsUpdate = true;
        }
        if (object.isMesh && hasWaterMaterial) {
            object.renderOrder = mode === 'transparent' ? 5 : 0;
        }
    });
}
function updateWaterMaterials(scene, renderer, elapsedSeconds, camera) {
    tempEye.copy(camera.position);
    updateWaterReflection(scene, renderer, camera);
    for (const material of trackedWaterMaterials) {
        material.uniforms.time.value = elapsedSeconds * WATER_DEFAULTS.waveSpeed;
        material.uniforms.eye.value.copy(tempEye);
        material.uniforms.textureMatrix.value.copy(textureMatrix);
    }
}
function isWaterMaterial(material) {
    return material?.userData?.terrascapeWater === true || material?.name === 'terrascape-water';
}
function prepareWaterMaterial(material) {
    if (!isWaterMaterial(material))
        return material;
    if (material.isShaderMaterial && material.userData?.terrascapeWater === true) {
        trackWaterMaterial(material);
        return material;
    }
    const waterColor = material.color?.clone?.() ?? FALLBACK_MAP_WATER_COLOR.clone();
    const waterMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.ShaderMaterial({
        name: 'terrascape-water',
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            alpha: { value: WATER_DEFAULTS.waterOpacity },
            time: { value: 0.0 },
            size: { value: 1.0 },
            shaderMix: { value: 0.0 },
            waveHeight: { value: WATER_DEFAULTS.waveHeight },
            waveFrequency: { value: WATER_DEFAULTS.waveFrequency },
            distortionScale: { value: 20.0 },
            textureMatrix: { value: textureMatrix.clone() },
            normalSampler: { value: waterNormals },
            reflectionSampler: { value: reflectionTexture() },
            eye: { value: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3() },
            sunDirection: { value: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.42, 0.82, 0.38).normalize() },
            sunColor: { value: new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffffff) },
            waterColor: { value: waterColor.clone() },
        },
        side: material.side ?? three__WEBPACK_IMPORTED_MODULE_0__.DoubleSide,
        transparent: true,
        depthWrite: true,
        fog: false,
        toneMapped: false,
    });
    waterMaterial.name = 'terrascape-water';
    waterMaterial.userData.terrascapeWater = true;
    waterMaterial.userData.terrascapeOriginalVertexColors = material.vertexColors;
    waterMaterial.userData.terrascapeWaterColor = waterColor.clone();
    waterMaterial.transparent = true;
    waterMaterial.opacity = WATER_DEFAULTS.waterOpacity;
    waterMaterial.toneMapped = false;
    waterMaterial.fog = false;
    trackWaterMaterial(waterMaterial);
    return waterMaterial;
}
function trackWaterMaterial(material) {
    trackedWaterMaterials.add(material);
    if (material.userData.terrascapeWaterDisposeTracked === true)
        return;
    material.userData.terrascapeWaterDisposeTracked = true;
    material.addEventListener('dispose', () => trackedWaterMaterials.delete(material));
}
function trackWaterMesh(mesh) {
    trackedWaterMeshes.add(mesh);
}
function reflectionTexture() {
    return ensureReflectionTarget().texture;
}
function ensureReflectionTarget() {
    if (!reflectionTarget) {
        reflectionTarget = new three__WEBPACK_IMPORTED_MODULE_0__.WebGLRenderTarget(512, 512);
        reflectionTarget.texture.name = 'terrascape-water-reflection';
    }
    return reflectionTarget;
}
function updateWaterReflection(scene, renderer, camera) {
    if (!hasActiveShaderWater() || trackedWaterMeshes.size === 0)
        return;
    const target = ensureReflectionTarget();
    const waterY = estimateWaterY();
    reflectionCamera.near = camera.near;
    reflectionCamera.far = camera.far;
    reflectionCamera.aspect = camera.aspect;
    reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);
    reflectionCamera.position.copy(camera.position);
    reflectionCamera.position.y = waterY * 2 - camera.position.y;
    camera.getWorldDirection(tempDirection);
    tempDirection.y *= -1;
    tempLookAt.copy(reflectionCamera.position).add(tempDirection);
    tempUp.copy(camera.up);
    tempUp.y *= -1;
    reflectionCamera.up.copy(tempUp);
    reflectionCamera.lookAt(tempLookAt);
    reflectionCamera.updateMatrixWorld();
    textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    textureMatrix.multiply(reflectionCamera.projectionMatrix);
    textureMatrix.multiply(reflectionCamera.matrixWorldInverse);
    const visibleStates = [];
    for (const mesh of trackedWaterMeshes) {
        visibleStates.push([mesh, mesh.visible]);
        mesh.visible = false;
    }
    const currentTarget = renderer.getRenderTarget();
    const currentXrEnabled = renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);
    renderer.clear();
    renderer.render(scene, reflectionCamera);
    renderer.setRenderTarget(currentTarget);
    renderer.xr.enabled = currentXrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    for (const [mesh, visible] of visibleStates) {
        mesh.visible = visible;
    }
}
/** Fixed Y where per-chunk map tiles meet the voxel water surface (pre-instancer value). */
const MAP_BACKDROP_Y = 112;
function resolveMapBackdropY() {
    return MAP_BACKDROP_Y;
}
function estimateWaterY() {
    let y = 0;
    let count = 0;
    for (const mesh of trackedWaterMeshes) {
        if (!mesh.parent)
            continue;
        tempBox.setFromObject(mesh);
        if (tempBox.isEmpty())
            continue;
        y += tempBox.max.y;
        count++;
    }
    return count > 0 ? y / count : 112;
}
function setWaterAlpha(material, alpha) {
    if (material.uniforms?.alpha) {
        material.uniforms.alpha.value = alpha;
    }
}
function setWaterShaderActive(material, active) {
    material.userData.terrascapeWaterShaderActive = active;
    if (material.uniforms?.shaderMix) {
        material.uniforms.shaderMix.value = active ? 1.0 : 0.0;
    }
    if (material.uniforms?.waveHeight) {
        material.uniforms.waveHeight.value = active ? WATER_DEFAULTS.waveHeight : 0.0;
    }
    if (material.uniforms?.distortionScale) {
        material.uniforms.distortionScale.value = active ? 20.0 : 0.0;
    }
}
function hasActiveShaderWater() {
    for (const material of trackedWaterMaterials) {
        if (material.visible !== false && material.userData?.terrascapeWaterShaderActive === true) {
            return true;
        }
    }
    return false;
}
function sampleWaterTint(mesh, sampleMapColor) {
    return averageWaterSamples(mesh, sampleMapColor) ?? FALLBACK_MAP_WATER_COLOR.clone();
}
function averageWaterSamples(mesh, sampleMapColor) {
    if (typeof sampleMapColor !== 'function')
        return null;
    tempBox.setFromObject(mesh);
    if (tempBox.isEmpty())
        return null;
    tempBox.getCenter(tempCenter);
    const samplePoints = [
        [tempCenter.x, tempCenter.z],
        [tempBox.min.x, tempCenter.z],
        [tempBox.max.x, tempCenter.z],
        [tempCenter.x, tempBox.min.z],
        [tempCenter.x, tempBox.max.z],
        [tempBox.min.x, tempBox.min.z],
        [tempBox.max.x, tempBox.max.z],
    ];
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (const [x, z] of samplePoints) {
        const sample = sampleMapColor(x, z);
        if (!sample || !isLikelyWater(sample))
            continue;
        r += sample.r;
        g += sample.g;
        b += sample.b;
        count++;
    }
    if (count === 0)
        return null;
    return new three__WEBPACK_IMPORTED_MODULE_0__.Color().setRGB(r / count / 255, g / count / 255, b / count / 255, three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace);
}
function isLikelyWater(sample) {
    return sample.b > sample.r + 24
        && sample.g > sample.r + 10
        && sample.b > 90
        && sample.g > 80;
}


/***/ },

/***/ "three"
/*!************************!*\
  !*** external "three" ***!
  \************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three__;

/***/ },

/***/ "three/addons/controls/OrbitControls.js"
/*!*********************************************************!*\
  !*** external "three/addons/controls/OrbitControls.js" ***!
  \*********************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three_addons_controls_OrbitControls_js_30cef365__;

/***/ },

/***/ "three/addons/loaders/GLTFLoader.js"
/*!*****************************************************!*\
  !*** external "three/addons/loaders/GLTFLoader.js" ***!
  \*****************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three_addons_loaders_GLTFLoader_js_5f8ad198__;

/***/ },

/***/ "three/addons/postprocessing/EffectComposer.js"
/*!****************************************************************!*\
  !*** external "three/addons/postprocessing/EffectComposer.js" ***!
  \****************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_EffectComposer_js_5fede484__;

/***/ },

/***/ "three/addons/postprocessing/RenderPass.js"
/*!************************************************************!*\
  !*** external "three/addons/postprocessing/RenderPass.js" ***!
  \************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_RenderPass_js_8f6528ce__;

/***/ },

/***/ "three/addons/postprocessing/ShaderPass.js"
/*!************************************************************!*\
  !*** external "three/addons/postprocessing/ShaderPass.js" ***!
  \************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_three_addons_postprocessing_ShaderPass_js_85531946__;

/***/ }

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	if (!(moduleId in __webpack_modules__)) {
/******/ 		delete __webpack_module_cache__[moduleId];
/******/ 		var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 		e.code = 'MODULE_NOT_FOUND';
/******/ 		throw e;
/******/ 	}
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/async module */
/******/ (() => {
/******/ 	var hasSymbol = typeof Symbol === "function";
/******/ 	var webpackQueues = hasSymbol ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 	var webpackExports = hasSymbol ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 	var webpackError = hasSymbol ? Symbol("webpack error") : "__webpack_error__";
/******/ 	
/******/ 	var resolveQueue = (queue) => {
/******/ 		if(queue && queue.d < 1) {
/******/ 			queue.d = 1;
/******/ 			queue.forEach((fn) => (fn.r--));
/******/ 			queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 		}
/******/ 	}
/******/ 	var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 		if(dep !== null && typeof dep === "object") {
/******/ 	
/******/ 			if(dep[webpackQueues]) return dep;
/******/ 			if(dep.then) {
/******/ 				var queue = [];
/******/ 				queue.d = 0;
/******/ 				dep.then((r) => {
/******/ 					obj[webpackExports] = r;
/******/ 					resolveQueue(queue);
/******/ 				}, (e) => {
/******/ 					obj[webpackError] = e;
/******/ 					resolveQueue(queue);
/******/ 				});
/******/ 				var obj = {};
/******/ 	
/******/ 				obj[webpackQueues] = (fn) => (fn(queue));
/******/ 				return obj;
/******/ 			}
/******/ 		}
/******/ 		var ret = {};
/******/ 		ret[webpackQueues] = x => {};
/******/ 		ret[webpackExports] = dep;
/******/ 		return ret;
/******/ 	}));
/******/ 	__webpack_require__.a = (module, body, hasAwait) => {
/******/ 		var queue;
/******/ 		hasAwait && ((queue = []).d = -1);
/******/ 		var depQueues = new Set();
/******/ 		var exports = module.exports;
/******/ 		var currentDeps;
/******/ 		var outerResolve;
/******/ 		var reject;
/******/ 		var promise = new Promise((resolve, rej) => {
/******/ 			reject = rej;
/******/ 			outerResolve = resolve;
/******/ 		});
/******/ 		promise[webpackExports] = exports;
/******/ 		promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 		module.exports = promise;
/******/ 		var handle = (deps) => {
/******/ 			currentDeps = wrapDeps(deps);
/******/ 			var fn;
/******/ 			var getResult = () => (currentDeps.map((d) => {
/******/ 	
/******/ 				if(d[webpackError]) throw d[webpackError];
/******/ 				return d[webpackExports];
/******/ 			}))
/******/ 			var promise = new Promise((resolve) => {
/******/ 				fn = () => (resolve(getResult));
/******/ 				fn.r = 0;
/******/ 				var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 				currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 			});
/******/ 			return fn.r ? promise : getResult();
/******/ 		}
/******/ 		var done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 		body(handle, done);
/******/ 		queue && queue.d < 0 && (queue.d = 0);
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
/******/ 
/******/ // startup
/******/ // Load entry module and return exports
/******/ // This entry module used 'module' so it can't be inlined
/******/ var __webpack_exports__ = __webpack_require__("./src/main/resources/web/src/app.ts");
/******/ __webpack_exports__ = await __webpack_exports__;
/******/ const __webpack_exports__createMobMarker = __webpack_exports__.createMobMarker;
/******/ const __webpack_exports__createPlayerMarker = __webpack_exports__.createPlayerMarker;
/******/ const __webpack_exports__disposeObject = __webpack_exports__.disposeObject;
/******/ const __webpack_exports__updateMobMarkerHeight = __webpack_exports__.updateMobMarkerHeight;
/******/ export { __webpack_exports__createMobMarker as createMobMarker, __webpack_exports__createPlayerMarker as createPlayerMarker, __webpack_exports__disposeObject as disposeObject, __webpack_exports__updateMobMarkerHeight as updateMobMarkerHeight };
/******/ 
