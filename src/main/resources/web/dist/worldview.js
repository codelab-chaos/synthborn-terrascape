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
/* harmony import */ var _dom_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./dom.js */ "./src/main/resources/web/src/dom.ts");
/* harmony import */ var _lighting_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./lighting.js */ "./src/main/resources/web/src/lighting.ts");
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./client-log.js */ "./src/main/resources/web/src/client-log.ts");
/* harmony import */ var _fps_counter_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./fps-counter.js */ "./src/main/resources/web/src/fps-counter.ts");
/* harmony import */ var _map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./map-backdrop.js */ "./src/main/resources/web/src/map-backdrop.ts");
/* harmony import */ var _npc_catalog_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./npc-catalog.js */ "./src/main/resources/web/src/npc-catalog.ts");
/* harmony import */ var _player_tiles_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./player-tiles.js */ "./src/main/resources/web/src/player-tiles.ts");
/* harmony import */ var _postprocessing_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./postprocessing.js */ "./src/main/resources/web/src/postprocessing.ts");
/* harmony import */ var _time_ribbon_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./time-ribbon.js */ "./src/main/resources/web/src/time-ribbon.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./utils.js */ "./src/main/resources/web/src/utils.ts");
/* harmony import */ var _view_state_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./view-state.js */ "./src/main/resources/web/src/view-state.ts");
/* harmony import */ var _water_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./water.js */ "./src/main/resources/web/src/water.ts");
/* harmony import */ var _mesh_cache_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./mesh-cache.js */ "./src/main/resources/web/src/mesh-cache.ts");



















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
const renderer = new three__WEBPACK_IMPORTED_MODULE_0__.WebGLRenderer({ canvas: _dom_js__WEBPACK_IMPORTED_MODULE_5__.canvas, antialias: true });
const rendererPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(rendererPixelRatio);
renderer.setClearColor(SKY_COLOR, 1);
const scene = new three__WEBPACK_IMPORTED_MODULE_0__.Scene();
scene.background = new three__WEBPACK_IMPORTED_MODULE_0__.Color(SKY_COLOR);
scene.fog = new three__WEBPACK_IMPORTED_MODULE_0__.Fog(SKY_COLOR, 620, 4200);
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
const lightingRig = (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.createLightingRig)(scene, SKY_COLOR);
const postProcessing = (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_12__.createPostProcessing)(renderer, scene, camera);
const fpsCounter = (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_8__.createFpsCounter)(scene, camera, renderer);
const npcCatalog = (0,_npc_catalog_js__WEBPACK_IMPORTED_MODULE_10__.createNpcCatalog)({ logClientEvent: _client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent });
const timeRibbon = (0,_time_ribbon_js__WEBPACK_IMPORTED_MODULE_13__.createTimeRibbon)({
    labelEl: _dom_js__WEBPACK_IMPORTED_MODULE_5__.timeCycleLabelEl,
    sceneEl: _dom_js__WEBPACK_IMPORTED_MODULE_5__.skySceneEl,
    sunEl: _dom_js__WEBPACK_IMPORTED_MODULE_5__.skySunEl,
    moonEl: _dom_js__WEBPACK_IMPORTED_MODULE_5__.skyMoonEl,
    starsEl: _dom_js__WEBPACK_IMPORTED_MODULE_5__.skyStarsEl,
});
const grid = new three__WEBPACK_IMPORTED_MODULE_0__.GridHelper(EMPTY_GRID_SIZE, EMPTY_GRID_DIVISIONS, GRID_AXIS_COLOR, GRID_LINE_COLOR);
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
    material.transparent = true;
    material.opacity = 0.42;
    material.depthTest = true;
    material.depthWrite = false;
}
grid.renderOrder = -50;
scene.add(grid);
const loader = new three_addons_loaders_GLTFLoader_js__WEBPACK_IMPORTED_MODULE_3__.GLTFLoader();
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
let mapTileLayerKey = null;
let mapTileCoverageDirty = true;
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
const clock = new three__WEBPACK_IMPORTED_MODULE_0__.Clock();
const initialParams = new URLSearchParams(window.location.search);
let experimentalDetailsEnabled = false;
let terrainFormatVersion = 'unknown';
let storedViewState = (0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.loadStoredViewState)();
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
const tempPlayerTarget = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempMobTarget = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempPlayerCamera = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
const tempPlayerLook = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
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
    return (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.lightingOptionsFromInputs)({
        sunLightingInput: _dom_js__WEBPACK_IMPORTED_MODULE_5__.sunLightingInput,
        treeShadeInput: _dom_js__WEBPACK_IMPORTED_MODULE_5__.treeShadeInput,
        shadeSizeInput: _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeValueInput,
        shadeDarknessInput: _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessValueInput,
        time: _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.checked ? worldTime : NOON_LIGHTING_TIME,
    });
}
function setStatus(text) {
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.statusEl.textContent = text;
}
function updateMetrics() {
    const loaded = loadedChunks.size;
    const center = activeCenterId ? activeCenterId.split(':').slice(1).join(', ') : 'pending';
    const resources = collectResourceStats();
    const rendererMemory = renderer.info.memory;
    const mapBackdrop = (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.mapBackdropStats)();
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricLoadedEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'}`
        + (mapBackdrop.loaded > 0
            ? ` · map backdrop ${mapBackdrop.chunks}x${mapBackdrop.chunks}`
                + (mapBackdrop.bytes > 0 ? ` ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatBytes)(mapBackdrop.bytes)}` : '')
                + (mapBackdrop.loadMs > 0 ? ` ${Math.round(mapBackdrop.loadMs)}ms` : '')
            : '');
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricMeshesEl.textContent = `${resources.meshes}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricMobsEl.textContent = mobMetricText();
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.metricCenterEl.textContent = center;
}
function mobMetricText() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked) {
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
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.experimentalDetailsStateEl.textContent = experimentalDetailsEnabled
        ? 'Detailed trees: server on'
        : 'Detailed trees: server off';
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.experimentalDetailsStateEl.classList.toggle('enabled', experimentalDetailsEnabled);
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.replaceChildren();
    for (const world of data.worlds ?? []) {
        const option = document.createElement('option');
        option.value = world.name;
        option.textContent = world.name;
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.append(option);
    }
    applyStoredWorld();
    applyInitialWorldParam();
    setStatus(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value ? 'Ready' : 'No worlds found');
}
function applyInitialParams() {
    applyStoredInputs();
    applyNumberParam('chunkX', _dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput);
    applyNumberParam('chunkZ', _dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput);
    applyNumberParam('radius', _dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput);
    applyBooleanParam('auto', _dom_js__WEBPACK_IMPORTED_MODULE_5__.autoStreamInput);
    applyBooleanParam('bounds', _dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput);
    applyBooleanParam('players', _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput);
    applyBooleanParam('mobs', _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput);
    applyBooleanParam('sun', _dom_js__WEBPACK_IMPORTED_MODULE_5__.sunLightingInput);
    applyBooleanParam('shade', _dom_js__WEBPACK_IMPORTED_MODULE_5__.treeShadeInput);
    applyBooleanParam('mapTiles', _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput);
    applyBooleanParam('mapTime', _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput);
    applyFloatParam('shadeSize', _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeValueInput);
    applyFloatParam('shadeDarkness', _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessValueInput);
    applySelectParam('water', _dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput);
    applySelectParam('shader', _dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput);
    applySelectParam('playerRate', _dom_js__WEBPACK_IMPORTED_MODULE_5__.playerUpdateRateInput);
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_12__.setShaderEffect)(postProcessing, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput.value);
    applyLighting();
}
function applyStoredInputs() {
    if (!storedViewState)
        return;
    setNumberInput(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput, storedViewState.chunkX);
    setNumberInput(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput, storedViewState.chunkZ);
    setNumberInput(_dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput, storedViewState.radius);
    if (typeof storedViewState.auto === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.autoStreamInput.checked = storedViewState.auto;
    if (typeof storedViewState.bounds === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.checked = storedViewState.bounds;
    if (typeof storedViewState.players === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked = storedViewState.players;
    if (typeof storedViewState.mobs === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked = storedViewState.mobs;
    if (typeof storedViewState.sun === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.sunLightingInput.checked = storedViewState.sun;
    if (typeof storedViewState.shade === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.treeShadeInput.checked = storedViewState.shade;
    if (typeof storedViewState.mapTime === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.checked = storedViewState.mapTime;
    if (typeof storedViewState.mapTiles === 'boolean')
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked = storedViewState.mapTiles;
    if (typeof storedViewState.renderDetails === 'boolean')
        setRenderDetailsOpen(storedViewState.renderDetails);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeValueInput, storedViewState.shadeSize);
    setPairedControlValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessValueInput, storedViewState.shadeDarkness);
    if (typeof storedViewState.water === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput, storedViewState.water);
    }
    if (typeof storedViewState.shader === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput, storedViewState.shader);
    }
    if (typeof storedViewState.playerRate === 'string') {
        applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.playerUpdateRateInput, storedViewState.playerRate);
    }
}
function applyStoredWorld() {
    if (!storedViewState?.world)
        return;
    applySelectValue(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect, storedViewState.world);
}
function applyInitialWorldParam() {
    const world = initialParams.get('world');
    if (!world)
        return;
    for (const option of _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.options) {
        if (option.value === world) {
            _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value = world;
            return;
        }
    }
}
function applyNumberParam(name, input) {
    const value = initialParams.get(name);
    if (value === null || value.trim() === '')
        return;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed))
        input.value = parsed;
}
function applyBooleanParam(name, input) {
    const value = initialParams.get(name);
    if (value === null)
        return;
    input.checked = ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
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
    const gridStarted = performance.now();
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value;
    const centerX = options.centerX ?? Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput.value, 10);
    const centerZ = options.centerZ ?? Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput.value, 10);
    const radius = Math.max(0, (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.numberOr)(Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput.value, 10), 0));
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput.value = radius;
    if (!world || Number.isNaN(centerX) || Number.isNaN(centerZ)) {
        setStatus('Choose a world and integer chunk coordinates');
        return;
    }
    const generation = ++loadGeneration;
    const centerKey = (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.centerId)(world, centerX, centerZ);
    requestedCenterId = centerKey;
    scheduledCenterId = null;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput.value = centerX;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput.value = centerZ;
    if (options.focus === true && !hasFocusedInitialGrid) {
        focusGrid(centerX, centerZ, radius);
        hasFocusedInitialGrid = true;
    }
    const needed = chunkKeys(centerX, centerZ, radius);
    retainOnly(world, needed);
    updateMapTileLayer({ force: true });
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
    const networkMissing = [];
    const cacheReadStarted = performance.now();
    for (const key of missing) {
        if (generation !== loadGeneration)
            return;
        const cacheKey = terrainCacheKey(world, key.chunkX, key.chunkZ);
        const cached = await (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_17__.readTerrainCache)(cacheKey);
        if (!cached?.bytes) {
            cacheMisses++;
            networkMissing.push(key);
            continue;
        }
        try {
            const parseStarted = performance.now();
            const gltf = await parseGltfBytes(cached.bytes);
            cacheParseMs += performance.now() - parseStarted;
            if (generation !== loadGeneration)
                return;
            addChunkObject(world, key.chunkX, key.chunkZ, gltf.scene);
            cacheHits++;
            completed++;
        }
        catch (error) {
            console.warn(`Cached terrain parse failed for ${key.chunkX},${key.chunkZ}`, error);
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('terrain_cache_parse_failed', {
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
        if (generation !== loadGeneration)
            return;
        const batch = networkMissing.slice(i, i + TERRAIN_BATCH_SIZE);
        i += batch.length;
        const results = await loadChunkBatch(world, batch, generation);
        for (const result of results) {
            if (generation !== loadGeneration)
                return;
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
    updateMapTileLayer({ force: true });
    updateMetrics();
    setStatus(failed === 0
        ? `Loaded ${needed.length} chunks around ${centerX}, ${centerZ}`
        : `Loaded ${needed.length - failed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientTiming)('grid_load', gridStarted, {
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
    if (generation !== loadGeneration)
        return false;
    addChunkObject(world, chunkX, chunkZ, gltf.scene);
    (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientTiming)('terrain_single_load', started, { world, chunkX, chunkZ });
    return true;
}
async function loadChunkBatch(world, keys, generation) {
    if (keys.length === 0)
        return [];
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
            if (generation !== loadGeneration)
                return results;
            if (chunk.ok && chunk.base64) {
                const source = chunk.cache ?? 'other';
                if (source in cacheSummary) {
                    cacheSummary[source]++;
                }
                else {
                    cacheSummary.other++;
                }
                base64Bytes += chunk.base64.length;
                const decodeStarted = performance.now();
                const bytes = (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.base64ToArrayBuffer)(chunk.base64);
                decodeMs += performance.now() - decodeStarted;
                cacheWriteAttempts++;
                (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_17__.writeTerrainCache)(terrainCacheKey(world, chunk.chunkX, chunk.chunkZ), bytes.slice(0), {
                    source,
                    columns: chunk.columns,
                    vertices: chunk.vertices,
                    triangles: chunk.triangles,
                    details: chunk.details,
                });
                const parseStarted = performance.now();
                const gltf = await parseGltfBytes(bytes);
                parseMs += performance.now() - parseStarted;
                if (generation !== loadGeneration)
                    return results;
                addChunkObject(world, chunk.chunkX, chunk.chunkZ, gltf.scene);
                results.push({ ok: true, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
            }
            else {
                console.warn(`Failed to load chunk ${chunk.chunkX},${chunk.chunkZ}: ${chunk.error ?? 'unknown error'}`);
                results.push({ ok: false, chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
            }
        }
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientTiming)('terrain_batch_load', started, {
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
    }
    catch (error) {
        console.warn('Batch terrain request failed, falling back to single chunk requests', error);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('terrain_batch_failed', {
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
            }
            catch (chunkError) {
                console.warn(`Failed to load chunk ${key.chunkX},${key.chunkZ}`, chunkError);
                return { ok: false, chunkX: key.chunkX, chunkZ: key.chunkZ };
            }
        }));
    }
}
function addChunkObject(world, chunkX, chunkZ, object) {
    object.position.set(chunkX * 32, 0, chunkZ * 32);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.prepareWaterMaterials)(object);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.tintWaterMaterialsFromMap)(object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.sampleMapBackdropColor);
    (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.applyWaterModeToObject)(object, _dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput.value);
    const lightingOptions = currentLightingOptions();
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.applyLightingToObject)(object, lightingOptions);
    const shade = (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.createTreeShadeObject)(object, lightingOptions);
    if (shade) {
        object.add(shade);
    }
    const debug = (0,_chunk_debug_js__WEBPACK_IMPORTED_MODULE_4__.createChunkDebug)(chunkX, chunkZ, object);
    debug.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.checked;
    object.add(debug);
    scene.add(object);
    loadedChunks.set((0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.chunkId)(world, chunkX, chunkZ), {
        world,
        chunkX,
        chunkZ,
        object,
        debug,
        shade,
    });
    markMapTileCoverageDirty();
}
async function parseGltfBytes(arrayBuffer) {
    return await loader.parseAsync(arrayBuffer, '');
}
async function loadGltfWithRetry(url) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await loader.loadAsync(url);
        }
        catch (error) {
            lastError = error;
            await (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.delay)(150 * attempt);
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
                id: (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.chunkId)(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value, chunkX, chunkZ),
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
        if (object.geometry)
            geometries.add(object.geometry);
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
    for (const texture of textures)
        texture.dispose();
    for (const material of materials)
        material.dispose();
    for (const geometry of geometries)
        geometry.dispose();
    disposalStats.chunks++;
    disposalStats.geometries += geometries.size;
    disposalStats.materials += materials.size;
    disposalStats.textures += textures.size;
    loadedChunks.delete(id);
    markMapTileCoverageDirty();
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
    for (const entry of loadedChunks.values()) {
        (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.tintWaterMaterialsFromMap)(entry.object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.sampleMapBackdropColor);
        (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.applyWaterModeToObject)(entry.object, _dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput.value);
    }
}
function terrainCacheKey(world, chunkX, chunkZ) {
    return (0,_mesh_cache_js__WEBPACK_IMPORTED_MODULE_17__.makeTerrainCacheKey)({
        world,
        chunkX,
        chunkZ,
        formatVersion: terrainFormatVersion,
        detailsEnabled: experimentalDetailsEnabled,
    });
}
function applyMapWaterTint() {
    for (const entry of loadedChunks.values()) {
        (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.tintWaterMaterialsFromMap)(entry.object, _map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.sampleMapBackdropColor);
    }
}
function mapBackdropCenter() {
    const gridX = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput.value, 10);
    const gridZ = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput.value, 10);
    if (activeCenterId && Number.isFinite(gridX) && Number.isFinite(gridZ)) {
        const parts = activeCenterId.split(':');
        const activeX = Number.parseInt(parts[parts.length - 2], 10);
        const activeZ = Number.parseInt(parts[parts.length - 1], 10);
        if (gridX === activeX && gridZ === activeZ) {
            return { chunkX: gridX, chunkZ: gridZ };
        }
    }
    return cameraChunk();
}
function updateMapTileLayer(options = {}) {
    grid.visible = !_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked;
    const center = mapBackdropCenter();
    const radius = Math.max(0, (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.numberOr)(Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput.value, 10), 0));
    const layerKey = `${_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value}:${center.chunkX}:${center.chunkZ}:${radius}:${_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked}`;
    if (!options.force && !mapTileCoverageDirty && layerKey === mapTileLayerKey) {
        return;
    }
    mapTileLayerKey = layerKey;
    (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.updateMapBackdrop)(scene, renderer, {
        enabled: _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked,
        world: _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value,
        centerX: center.chunkX,
        centerZ: center.chunkZ,
        meshRadius: radius,
        coveredChunks: mapCoveredChunks(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value),
    });
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked || (0,_map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.mapBackdropStats)().loaded > 0) {
        mapTileCoverageDirty = false;
    }
    updateMetrics();
}
function markMapTileCoverageDirty() {
    mapTileCoverageDirty = true;
}
function cameraChunk() {
    return {
        chunkX: Math.floor(camera.position.x / 32),
        chunkZ: Math.floor(camera.position.z / 32),
    };
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
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.applyLightingEnvironment)(scene, renderer, lightingRig, options);
    for (const entry of loadedChunks.values()) {
        (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.applyLightingToObject)(entry.object, options);
        (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.updateTreeShadeObject)(entry.shade, options);
    }
}
async function refreshWorldTime() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value) {
        return;
    }
    try {
        const response = await fetch(`/api/time/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)}`);
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
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('world_time_refresh_failed', { error: error?.message ?? error });
    }
}
function worldTimePollDelayMs() {
    if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.checked) {
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
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value || isRefreshingPlayers) {
        return;
    }
    isRefreshingPlayers = true;
    try {
        const response = await fetch(`/api/players/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)}`);
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
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('player_refresh_failed', { error: error?.message ?? error });
    }
    finally {
        isRefreshingPlayers = false;
    }
}
function playerUpdateRateMs() {
    const parsed = Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.playerUpdateRateInput.value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYER_UPDATE_RATE_MS;
}
function playerPollDelayMs() {
    if (lastPlayerPollFailed) {
        return PLAYER_POLL_ERROR_MS;
    }
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked) {
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
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value || !_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked || isRefreshingMobs) {
        return;
    }
    isRefreshingMobs = true;
    try {
        const response = await fetch(`/api/mobs/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)}`);
        if (!response.ok) {
            throw new Error(`Mob request failed: ${response.status}`);
        }
        const data = await response.json();
        lastMobPollFailed = false;
        lastMobSourceStats = data.sourceStats ?? null;
        updateMobs(data.mobs ?? []);
    }
    catch (error) {
        lastMobPollFailed = true;
        console.warn('Mob refresh failed', error);
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('mob_refresh_failed', { error: error?.message ?? error });
    }
    finally {
        isRefreshingMobs = false;
    }
}
function mobPollDelayMs() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked) {
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
    if (delayMs === null || entityStreamConnected)
        return;
    mobPollTimer = setTimeout(async () => {
        await refreshMobs();
        restartMobPolling();
    }, delayMs);
}
function wantsEntityStream() {
    return _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value && (_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked || _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked);
}
function restartEntityStream() {
    clearTimeout(entityStreamFallbackTimer);
    if (!('EventSource' in window) || !wantsEntityStream()) {
        closeEntityStream();
        restartPlayerPolling();
        restartMobPolling();
        return;
    }
    const includePlayers = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked;
    const includeMobs = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked;
    if (entityStream
        && entityStreamWorld === _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value
        && entityStreamPlayers === includePlayers
        && entityStreamMobs === includeMobs) {
        return;
    }
    closeEntityStream();
    entityStreamWorld = _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value;
    entityStreamPlayers = includePlayers;
    entityStreamMobs = includeMobs;
    const params = new URLSearchParams({
        players: includePlayers ? '1' : '0',
        mobs: includeMobs ? '1' : '0',
    });
    entityStream = new EventSource(`/api/entities/stream/${encodeURIComponent(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)}?${params}`);
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
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('entity_stream_parse_failed', { error: error?.message ?? error });
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
    if (snapshot.world && snapshot.world !== _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)
        return;
    if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked) {
        updatePlayers(snapshot.players ?? []);
    }
    if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked) {
        lastMobSourceStats = snapshot.mobSourceStats ?? null;
        updateMobs(snapshot.mobs ?? []);
    }
}
function updatePlayers(players) {
    const previousPlayerCount = lastPlayerCount;
    lastPlayerCount = players.length;
    if (previousPlayerCount !== lastPlayerCount) {
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('player_count_changed', {
            players: lastPlayerCount,
            nextPollMs: playerPollDelayMs(),
        });
        restartWorldTimePolling();
        if (lastPlayerCount > previousPlayerCount) {
            schedulePlayerConnectMobSample(players);
        }
    }
    const seen = new Set();
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked) {
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.replaceChildren();
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.textContent = 'Players hidden';
    }
    else if (players.length === 0) {
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.replaceChildren();
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.textContent = 'No players';
    }
    else if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.childNodes.length === 1 && _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.firstChild.nodeType === Node.TEXT_NODE) {
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.replaceChildren();
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
            marker.rotation.y = player.yaw ?? 0;
        }
        marker.userData.targetPosition ??= new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        marker.userData.targetPosition.set(player.x, player.y, player.z);
        marker.userData.targetYaw = player.yaw ?? marker.userData.targetYaw ?? 0;
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked;
        marker.userData.player = player;
        (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updatePlayerMarkerCard)(marker, player);
        (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updatePlayerMarkerCardHeight)(marker, 4.35);
        playerMarkers.set(player.uuid, marker);
        if (!marker.parent) {
            scene.add(marker);
        }
        if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked) {
            continue;
        }
        const tile = playerTiles.get(player.uuid) ?? (0,_player_tiles_js__WEBPACK_IMPORTED_MODULE_11__.createPlayerTile)(player, playerTileContext());
        if (!playerTiles.has(player.uuid)) {
            playerTiles.set(player.uuid, tile);
        }
        (0,_player_tiles_js__WEBPACK_IMPORTED_MODULE_11__.updatePlayerTile)(tile, player, playerTileContext());
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
    const current = _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.children[index] ?? null;
    if (current === tileElement) {
        return;
    }
    if (tileElement.parentElement !== _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl) {
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.insertBefore(tileElement, current);
        return;
    }
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.insertBefore(tileElement, current);
}
function schedulePlayerConnectMobSample(players) {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value || !_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked)
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
    const world = _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value;
    if (!world || !_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked)
        return;
    try {
        const response = await fetch(`/api/mobs/${encodeURIComponent(world)}`);
        if (!response.ok) {
            throw new Error(`Mob sample request failed: ${response.status}`);
        }
        const data = await response.json();
        const mobs = Array.isArray(data.mobs) ? data.mobs : [];
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('mob_connect_sample', {
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
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('mob_connect_sample_failed', { error: error?.message ?? error });
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
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked && mobs.length > 0) {
        return;
    }
    const previousMobCount = lastMobCount;
    lastMobCount = mobs.length;
    if (previousMobCount !== lastMobCount) {
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_7__.logClientEvent)('mob_count_changed', {
            mobs: lastMobCount,
            nextPollMs: mobPollDelayMs(),
        });
    }
    const seen = new Set();
    for (const mob of mobs) {
        const id = String(mob.id ?? `${mob.type}:${mob.x}:${mob.y}:${mob.z}`);
        const enrichedMob = npcCatalog.enrich(mob, id);
        seen.add(id);
        const marker = mobMarkers.get(id) ?? (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.createMobMarker)(enrichedMob);
        if (!mobMarkers.has(id)) {
            marker.position.set(mob.x, mob.y, mob.z);
        }
        marker.userData.targetPosition ??= new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        marker.userData.targetPosition.set(mob.x, mob.y, mob.z);
        marker.userData.mob = enrichedMob;
        (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updateMobMarkerCard)(marker, enrichedMob);
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked;
        mobMarkers.set(id, marker);
        if (!marker.parent) {
            scene.add(marker);
        }
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
        updateEyeCamera();
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
        entry.debug.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.checked;
    }
}
function setRenderDetailsOpen(open) {
    const isOpen = open === true;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardEl.classList.toggle('collapsed', !isOpen);
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardHeadEl.setAttribute('aria-expanded', String(isOpen));
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardHeadEl.title = isOpen ? 'Hide render details' : 'Show render details';
}
function toggleRenderDetails() {
    setRenderDetailsOpen(_dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardEl.classList.contains('collapsed'));
    saveViewState();
}
function updateEntityVisibility() {
    for (const marker of playerMarkers.values()) {
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked;
    }
    for (const marker of mobMarkers.values()) {
        marker.visible = _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked;
    }
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked) {
        _dom_js__WEBPACK_IMPORTED_MODULE_5__.playersEl.textContent = 'Players hidden';
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
        npcDetailsState: () => npcCatalog.state(),
        loadGrid: (options = {}) => loadGrid(options),
        mapBackdropStats: _map_backdrop_js__WEBPACK_IMPORTED_MODULE_9__.mapBackdropStats,
        terrainFormatVersion: () => terrainFormatVersion,
        activeCenterId: () => activeCenterId,
        requestedCenterId: () => requestedCenterId,
        updatePlayersForTest: (players) => updatePlayers(players),
        updateMobsForTest: (mobs) => updateMobs(mobs),
        waterMaterialSummary: () => waterMaterialSummary(),
        cameraPose: () => ({
            camera: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.vectorState)(camera.position),
            target: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.vectorState)(controls.target),
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
            _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.checked = true;
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
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.isVectorState)(cameraState)) {
                camera.position.set(cameraState.x, cameraState.y, cameraState.z);
            }
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.isVectorState)(targetState)) {
                controls.target.set(targetState.x, targetState.y, targetState.z);
            }
            controls.update();
            if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.isVectorState)(lookAt)) {
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
                if (material?.name !== 'worldview-water' && material?.userData?.worldviewWater !== true)
                    continue;
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
    if (!(0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.isVectorState)(cameraState) || !(0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.isVectorState)(targetState)) {
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
    if (!hasStarted || !_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)
        return;
    const target = controls.target;
    const chunk = playerChunk();
    const state = {
        world: _dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value,
        chunkX: Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput.value, 10) || chunk.chunkX,
        chunkZ: Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput.value, 10) || chunk.chunkZ,
        radius: Math.max(0, Number.parseInt(_dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput.value, 10) || 0),
        auto: _dom_js__WEBPACK_IMPORTED_MODULE_5__.autoStreamInput.checked,
        bounds: _dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.checked,
        players: _dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.checked,
        mobs: _dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked,
        renderDetails: !_dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardEl.classList.contains('collapsed'),
        sun: _dom_js__WEBPACK_IMPORTED_MODULE_5__.sunLightingInput.checked,
        shade: _dom_js__WEBPACK_IMPORTED_MODULE_5__.treeShadeInput.checked,
        mapTime: _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.checked,
        mapTiles: _dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.checked,
        shadeSize: Number.parseFloat(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeValueInput.value),
        shadeDarkness: Number.parseFloat(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessValueInput.value),
        water: _dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput.value,
        shader: _dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput.value,
        playerRate: _dom_js__WEBPACK_IMPORTED_MODULE_5__.playerUpdateRateInput.value,
        camera: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.vectorState)(camera.position),
        target: (0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.vectorState)(target),
    };
    if ((0,_view_state_js__WEBPACK_IMPORTED_MODULE_15__.saveStoredViewState)(state)) {
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
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.coordTargetEl.textContent = `${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(target.x)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(target.y)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(target.z)}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.coordChunkEl.textContent = `${chunk.chunkX}, ${chunk.chunkZ}`;
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.coordCameraEl.textContent = `${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(camera.position.x)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(camera.position.y)}, ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.formatCoord)(camera.position.z)}`;
}
function updateEmptyGrid() {
    grid.position.set(Math.round(camera.position.x / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP, EMPTY_GRID_Y, Math.round(camera.position.z / EMPTY_GRID_CHUNK_SNAP) * EMPTY_GRID_CHUNK_SNAP);
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
function maybeAutoStream() {
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.autoStreamInput.checked || !hasFocusedInitialGrid || !_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value)
        return;
    const player = playerChunk();
    const playerId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.centerId)(_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value, player.chunkX, player.chunkZ);
    if (playerId === activeCenterId || playerId === requestedCenterId || playerId === scheduledCenterId)
        return;
    clearTimeout(streamTimer);
    scheduledCenterId = playerId;
    streamTimer = setTimeout(() => {
        scheduledCenterId = null;
        loadGrid({ centerX: player.chunkX, centerZ: player.chunkZ }).catch((error) => setStatus(error.message));
    }, 250);
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
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_12__.resizePostProcessing)(postProcessing, width, height, rendererPixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_8__.positionFpsCounter)(fpsCounter);
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
            const cardHeight = (0,_utils_js__WEBPACK_IMPORTED_MODULE_14__.clamp)(desiredWorldY - targetPosition.y, MOB_CARD_MIN_HEIGHT, MOB_CARD_TREE_TOP_HEIGHT);
            (0,_players_js__WEBPACK_IMPORTED_MODULE_1__.updateMobMarkerHeight)(marker, cardHeight);
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
    (0,_lighting_js__WEBPACK_IMPORTED_MODULE_6__.positionSkyObjects)(lightingRig, camera.position);
    updateEmptyGrid();
    updateMapTileLayer();
    (0,_fps_counter_js__WEBPACK_IMPORTED_MODULE_8__.updateFpsCounter)(fpsCounter, deltaSeconds);
    maybeAutoStream();
    updateCoordinates();
    (0,_water_js__WEBPACK_IMPORTED_MODULE_16__.updateWaterMaterials)(scene, renderer, elapsedSeconds, camera);
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_12__.renderPostProcessing)(postProcessing, renderer, scene, camera, deltaSeconds, elapsedSeconds);
    updateMetrics();
    maybeSaveViewState();
    requestAnimationFrame(animate);
}
window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
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
window.addEventListener('worldview:map-backdrop-loaded', applyMapWaterTint);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.addEventListener('change', updateDebugBounds);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.debugBoundsInput.addEventListener('change', saveViewState);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.showPlayersInput.addEventListener('change', () => {
    updateEntityVisibility();
    restartEntityStream();
    restartPlayerPolling();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.addEventListener('change', () => {
    clearTimeout(mobPollTimer);
    mobPollTimer = null;
    if (!_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked) {
        clearMobs();
    }
    updateEntityVisibility();
    restartEntityStream();
    if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.showMobsInput.checked) {
        restartMobPolling(0);
    }
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_5__.waterModeInput.addEventListener('change', () => {
    applyWaterMode();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_5__.playerUpdateRateInput.addEventListener('change', () => {
    restartPlayerPolling();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput.addEventListener('change', () => {
    (0,_postprocessing_js__WEBPACK_IMPORTED_MODULE_12__.setShaderEffect)(postProcessing, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shaderEffectInput.value);
    saveViewState();
});
for (const input of [_dom_js__WEBPACK_IMPORTED_MODULE_5__.sunLightingInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.treeShadeInput]) {
    const eventName = input.type === 'range' ? 'input' : 'change';
    input.addEventListener(eventName, () => {
        applyLighting();
        saveViewState();
    });
}
_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTimeInput.addEventListener('change', () => {
    applyLighting();
    restartWorldTimePolling();
    saveViewState();
});
_dom_js__WEBPACK_IMPORTED_MODULE_5__.mapTilesInput.addEventListener('change', () => {
    updateMapTileLayer();
    saveViewState();
});
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeSizeValueInput);
syncPairedControl(_dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.shadeDarknessValueInput);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.addEventListener('change', () => {
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
for (const input of [_dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkXInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.chunkZInput, _dom_js__WEBPACK_IMPORTED_MODULE_5__.radiusInput]) {
    input.addEventListener('input', scheduleControlGridLoad);
    input.addEventListener('change', scheduleControlGridLoad);
}
_dom_js__WEBPACK_IMPORTED_MODULE_5__.panelToggle.addEventListener('click', () => {
    const open = _dom_js__WEBPACK_IMPORTED_MODULE_5__.hudEl.classList.toggle('open');
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.panelToggle.classList.toggle('active', open);
    _dom_js__WEBPACK_IMPORTED_MODULE_5__.panelToggle.setAttribute('aria-expanded', String(open));
});
setRenderDetailsOpen(!storedViewState || storedViewState.renderDetails !== false);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardHeadEl.addEventListener('click', toggleRenderDetails);
_dom_js__WEBPACK_IMPORTED_MODULE_5__.infoCardHeadEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ')
        return;
    event.preventDefault();
    toggleRenderDetails();
});
applyInitialParams();
exposeDebugState();
resize();
timeRibbon.update(worldTime);
animate();
await loadWorlds();
await npcCatalog.load();
if (_dom_js__WEBPACK_IMPORTED_MODULE_5__.worldSelect.value) {
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
let queue = [];
let flushTimer = null;
let sequence = 0;
function logClientEvent(type, fields = {}) {
    if (!type)
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
/* harmony export */   coordCameraEl: () => (/* binding */ coordCameraEl),
/* harmony export */   coordChunkEl: () => (/* binding */ coordChunkEl),
/* harmony export */   coordTargetEl: () => (/* binding */ coordTargetEl),
/* harmony export */   debugBoundsInput: () => (/* binding */ debugBoundsInput),
/* harmony export */   experimentalDetailsStateEl: () => (/* binding */ experimentalDetailsStateEl),
/* harmony export */   hudEl: () => (/* binding */ hudEl),
/* harmony export */   infoCardEl: () => (/* binding */ infoCardEl),
/* harmony export */   infoCardHeadEl: () => (/* binding */ infoCardHeadEl),
/* harmony export */   mapTilesInput: () => (/* binding */ mapTilesInput),
/* harmony export */   mapTimeInput: () => (/* binding */ mapTimeInput),
/* harmony export */   metricCenterEl: () => (/* binding */ metricCenterEl),
/* harmony export */   metricDisposedEl: () => (/* binding */ metricDisposedEl),
/* harmony export */   metricGpuEl: () => (/* binding */ metricGpuEl),
/* harmony export */   metricLoadedEl: () => (/* binding */ metricLoadedEl),
/* harmony export */   metricMeshesEl: () => (/* binding */ metricMeshesEl),
/* harmony export */   metricMobsEl: () => (/* binding */ metricMobsEl),
/* harmony export */   metricResourcesEl: () => (/* binding */ metricResourcesEl),
/* harmony export */   panelToggle: () => (/* binding */ panelToggle),
/* harmony export */   playerUpdateRateInput: () => (/* binding */ playerUpdateRateInput),
/* harmony export */   playersEl: () => (/* binding */ playersEl),
/* harmony export */   radiusInput: () => (/* binding */ radiusInput),
/* harmony export */   shadeDarknessInput: () => (/* binding */ shadeDarknessInput),
/* harmony export */   shadeDarknessValueInput: () => (/* binding */ shadeDarknessValueInput),
/* harmony export */   shadeSizeInput: () => (/* binding */ shadeSizeInput),
/* harmony export */   shadeSizeValueInput: () => (/* binding */ shadeSizeValueInput),
/* harmony export */   shaderEffectInput: () => (/* binding */ shaderEffectInput),
/* harmony export */   showMobsInput: () => (/* binding */ showMobsInput),
/* harmony export */   showPlayersInput: () => (/* binding */ showPlayersInput),
/* harmony export */   skyMoonEl: () => (/* binding */ skyMoonEl),
/* harmony export */   skySceneEl: () => (/* binding */ skySceneEl),
/* harmony export */   skyStarsEl: () => (/* binding */ skyStarsEl),
/* harmony export */   skySunEl: () => (/* binding */ skySunEl),
/* harmony export */   statusEl: () => (/* binding */ statusEl),
/* harmony export */   sunLightingInput: () => (/* binding */ sunLightingInput),
/* harmony export */   timeCycleLabelEl: () => (/* binding */ timeCycleLabelEl),
/* harmony export */   treeShadeInput: () => (/* binding */ treeShadeInput),
/* harmony export */   waterModeInput: () => (/* binding */ waterModeInput),
/* harmony export */   worldSelect: () => (/* binding */ worldSelect)
/* harmony export */ });
const canvas = document.querySelector('#scene');
const worldSelect = document.querySelector('#world');
const chunkXInput = document.querySelector('#chunk-x');
const chunkZInput = document.querySelector('#chunk-z');
const radiusInput = document.querySelector('#radius');
const autoStreamInput = document.querySelector('#auto-stream');
const debugBoundsInput = document.querySelector('#debug-bounds');
const showPlayersInput = document.querySelector('#show-players');
const showMobsInput = document.querySelector('#show-mobs');
const playerUpdateRateInput = document.querySelector('#player-update-rate');
const sunLightingInput = document.querySelector('#sun-lighting');
const treeShadeInput = document.querySelector('#tree-shade');
const mapTilesInput = document.querySelector('#map-tiles');
const shadeSizeInput = document.querySelector('#shade-size');
const shadeSizeValueInput = document.querySelector('#shade-size-value');
const shadeDarknessInput = document.querySelector('#shade-darkness');
const shadeDarknessValueInput = document.querySelector('#shade-darkness-value');
const experimentalDetailsStateEl = document.querySelector('#experimental-details-state');
const waterModeInput = document.querySelector('#water-mode');
const shaderEffectInput = document.querySelector('#shader-effect');
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
const TREE_SHADE_KEY = 'worldviewTreeShade';
const DAY_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x3d86cf);
const DAY_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x88badd);
const NIGHT_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x07111f);
const NIGHT_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x151f34);
const DAWN_SKY_TOP = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x7d91c4);
const DAWN_SKY_HORIZON = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xe9a18a);
const DAWN_SUN_GLOW = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffdf92);
const DAWN_HAZE = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xd9a4bd);
const FOG_DAY = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x547b93);
const FOG_NIGHT = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x071321);
const FOG_DAWN = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xc39698);
const NIGHT_TERRAIN_TINT = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x243225);
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
function lightingOptionsFromInputs({ sunLightingInput, treeShadeInput, shadeSizeInput, shadeDarknessInput, time }) {
    return {
        sun: sunLightingInput.checked,
        shade: treeShadeInput.checked,
        shadeSize: readRange(shadeSizeInput, 1.85),
        shadeDarkness: readRange(shadeDarknessInput, 0.4),
        time,
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
    if (options.sun) {
        rig.ambient.intensity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(0.24, 1.55, daylight) + dawn * 0.12;
        rig.ambient.color.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x24364f).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xe7f4ff), daylight));
        rig.ambient.groundColor.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x07110d).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x405638), daylight));
        rig.sun.intensity = three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(0.0, 3.9, daylight);
        rig.sun.color.copy(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x8fb5ff).lerp(new three__WEBPACK_IMPORTED_MODULE_0__.Color(0xffddb0), Math.max(daylight, dawn)));
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
    scene.fog = new three__WEBPACK_IMPORTED_MODULE_0__.Fog(fogColor, three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(1100, 1500, daylight), three__WEBPACK_IMPORTED_MODULE_0__.MathUtils.lerp(3600, 5200, daylight));
    renderer.setClearColor(scene.background, 1);
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
    mesh.name = 'worldview-tree-shade';
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
    const terrainTint = DAY_TERRAIN_TINT.clone().lerp(NIGHT_TERRAIN_TINT, nightGrade * 0.72);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
        if (!material)
            continue;
        if (material.color && material.userData?.worldviewWater !== true) {
            material.color.copy(terrainTint);
        }
        material.roughness = material.userData?.worldviewWater ? 0.38 : 0.88;
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
    return materialsFor(mesh).some((material) => material?.name === 'worldview-detail');
}
function isWaterMesh(mesh) {
    return materialsFor(mesh).some((material) => material?.name === 'worldview-water' || material?.userData?.worldviewWater === true);
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
    shadeTexture.name = 'worldview-tree-shade-gradient';
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
/* harmony export */   clearMapBackdrop: () => (/* binding */ clearMapBackdrop),
/* harmony export */   mapBackdropStats: () => (/* binding */ mapBackdropStats),
/* harmony export */   sampleMapBackdropColor: () => (/* binding */ sampleMapBackdropColor),
/* harmony export */   updateMapBackdrop: () => (/* binding */ updateMapBackdrop)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var _client_log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./client-log.js */ "./src/main/resources/web/src/client-log.ts");


const CHUNK_SIZE = 32;
const MAP_REGION_BONUS_RADIUS = 54;
const MAP_REGION_MAX_RADIUS = 102;
const MAP_BACKDROP_PAN_MARGIN = 20;
const MAP_BACKDROP_Y = 112.0;
let activeBackdrop = null;
let pendingTextureKey = null;
let activeGeometryKey = null;
let activeSampler = null;
let textureAnchor = null;
let requestSerial = 0;
let fetchCount = 0;
let reuseCount = 0;
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
};
function updateMapBackdrop(scene, renderer, options) {
    const { enabled, world, centerX, centerZ, meshRadius, coveredChunks } = options;
    if (!enabled || !world || !Number.isFinite(centerX) || !Number.isFinite(centerZ)) {
        clearMapBackdrop(scene);
        return;
    }
    const innerRadius = Math.max(0, Math.floor(meshRadius));
    const displayRadius = computeDisplayRadius(innerRadius);
    const fetchRadius = computeFetchRadius(displayRadius);
    const geometryKey = `${world}:${centerX}:${centerZ}:${innerRadius}:${displayRadius}:${coveredChunkKey(coveredChunks)}`;
    if (canReuseTexture(world, centerX, centerZ, innerRadius, displayRadius, fetchRadius)) {
        applyLoadedBackdrop(scene, {
            world,
            viewCenterX: centerX,
            viewCenterZ: centerZ,
            innerRadius,
            displayRadius,
            coveredChunks,
            geometryKey,
            reused: true,
        });
        return;
    }
    const anchorX = centerX;
    const anchorZ = centerZ;
    const textureKey = `${world}:${anchorX}:${anchorZ}:${innerRadius}:${fetchRadius}`;
    if (textureKey === pendingTextureKey) {
        return;
    }
    pendingTextureKey = textureKey;
    activeStats = {
        loaded: 0,
        centerX,
        centerZ,
        radius: displayRadius,
        chunks: displayRadius * 2 + 1,
        bytes: 0,
        loadMs: 0,
        textureSize: '',
        reused: false,
        fetches: fetchCount,
        reuses: reuseCount,
        anchorX,
        anchorZ,
    };
    const serial = ++requestSerial;
    const textureLoader = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader();
    const url = `/api/mapregion/${encodeURIComponent(world)}/${anchorX}/${anchorZ}/${fetchRadius}.png`;
    const started = performance.now();
    fetch(url)
        .then((response) => {
        if (!response.ok) {
            throw new Error(`Map backdrop request failed: ${response.status}`);
        }
        return response.blob();
    })
        .then((blob) => new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        textureLoader.load(objectUrl, (texture) => {
            URL.revokeObjectURL(objectUrl);
            resolve({ texture, bytes: blob.size, loadMs: performance.now() - started });
        }, undefined, (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        });
    }))
        .then(({ texture, bytes, loadMs }) => {
        if (serial !== requestSerial) {
            texture.dispose();
            return;
        }
        texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
        texture.needsUpdate = true;
        textureAnchor = {
            world,
            centerX: anchorX,
            centerZ: anchorZ,
            innerRadius,
            displayRadius,
            fetchRadius,
            textureKey,
        };
        fetchCount += 1;
        pendingTextureKey = null;
        const chunkCount = fetchRadius * 2 + 1;
        applyLoadedBackdrop(scene, {
            world,
            viewCenterX: centerX,
            viewCenterZ: centerZ,
            innerRadius,
            displayRadius,
            coveredChunks,
            geometryKey,
            texture,
            bytes,
            loadMs,
            reused: false,
        });
        activeStats = {
            loaded: 1,
            centerX,
            centerZ,
            radius: displayRadius,
            chunks: chunkCount,
            bytes,
            loadMs,
            textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : '',
            reused: false,
            fetches: fetchCount,
            reuses: reuseCount,
            anchorX,
            anchorZ,
        };
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_1__.logClientEvent)('map_backdrop_load', {
            world,
            centerX,
            centerZ,
            anchorX,
            anchorZ,
            radius: fetchRadius,
            displayRadius,
            chunks: chunkCount,
            bytes,
            ms: Math.round(loadMs),
            textureSize: activeStats.textureSize,
        });
        window.dispatchEvent(new CustomEvent('worldview:map-backdrop-loaded'));
    })
        .catch((error) => {
        if (serial === requestSerial) {
            pendingTextureKey = null;
            console.warn('Map backdrop load failed', error);
            (0,_client_log_js__WEBPACK_IMPORTED_MODULE_1__.logClientEvent)('map_backdrop_failed', {
                world,
                centerX,
                centerZ,
                radius: fetchRadius,
                error: error?.message ?? error,
            });
            if (!activeBackdrop) {
                clearMapBackdrop(scene);
            }
        }
    });
}
function clearMapBackdrop(scene) {
    pendingTextureKey = null;
    activeGeometryKey = null;
    textureAnchor = null;
    requestSerial++;
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
        fetches: fetchCount,
        reuses: reuseCount,
        anchorX: 0,
        anchorZ: 0,
    };
    activeSampler = null;
    disposeActiveBackdrop(scene);
}
function canReuseTexture(world, viewCenterX, viewCenterZ, innerRadius, displayRadius, fetchRadius) {
    if (!activeBackdrop || !textureAnchor?.textureKey)
        return false;
    if (textureAnchor.world !== world)
        return false;
    if (textureAnchor.innerRadius !== innerRadius)
        return false;
    if (textureAnchor.fetchRadius !== fetchRadius)
        return false;
    return viewFitsAnchor(viewCenterX, viewCenterZ, displayRadius, textureAnchor);
}
function viewFitsAnchor(viewCenterX, viewCenterZ, displayRadius, anchor) {
    return viewCenterX - displayRadius >= anchor.centerX - anchor.fetchRadius
        && viewCenterX + displayRadius <= anchor.centerX + anchor.fetchRadius
        && viewCenterZ - displayRadius >= anchor.centerZ - anchor.fetchRadius
        && viewCenterZ + displayRadius <= anchor.centerZ + anchor.fetchRadius;
}
function applyLoadedBackdrop(scene, options) {
    const { viewCenterX, viewCenterZ, innerRadius, displayRadius, coveredChunks, geometryKey, texture = null, bytes = activeStats.bytes, loadMs = 0, reused = false, } = options;
    const anchor = textureAnchor;
    if (!anchor)
        return;
    const textureMinX = (anchor.centerX - anchor.fetchRadius) * CHUNK_SIZE;
    const textureMinZ = (anchor.centerZ - anchor.fetchRadius) * CHUNK_SIZE;
    const textureSize = anchor.fetchRadius * 2 + 1;
    const textureWorldSize = textureSize * CHUNK_SIZE;
    const geometry = createBackdropCoverageGeometry(textureMinX, textureMinZ, textureWorldSize, viewCenterX, viewCenterZ, displayRadius, innerRadius, coveredChunks);
    if (texture) {
        applyBackdropMesh(scene, geometry, texture, textureSize, anchor.fetchRadius);
    }
    else if (activeBackdrop) {
        const previousGeometry = activeBackdrop.geometry;
        activeBackdrop.geometry = geometry;
        previousGeometry?.dispose();
        if (!activeBackdrop.parent) {
            scene.add(activeBackdrop);
        }
    }
    activeGeometryKey = geometryKey;
    activeSampler = createBackdropSampler(activeBackdrop?.material?.map?.image, textureMinX, textureMinZ, textureWorldSize);
    if (reused) {
        reuseCount += 1;
        activeStats = {
            ...activeStats,
            loaded: 1,
            centerX: viewCenterX,
            centerZ: viewCenterZ,
            radius: displayRadius,
            chunks: displayRadius * 2 + 1,
            bytes,
            loadMs: 0,
            textureSize: activeBackdrop?.material?.map?.image
                ? `${activeBackdrop.material.map.image.width}x${activeBackdrop.material.map.image.height}`
                : activeStats.textureSize,
            reused: true,
            fetches: fetchCount,
            reuses: reuseCount,
            anchorX: anchor.centerX,
            anchorZ: anchor.centerZ,
        };
        (0,_client_log_js__WEBPACK_IMPORTED_MODULE_1__.logClientEvent)('map_backdrop_reuse', {
            world: anchor.world,
            centerX: viewCenterX,
            centerZ: viewCenterZ,
            anchorX: anchor.centerX,
            anchorZ: anchor.centerZ,
            displayRadius,
            fetchRadius: anchor.fetchRadius,
        });
        window.dispatchEvent(new CustomEvent('worldview:map-backdrop-loaded'));
    }
}
function computeDisplayRadius(innerRadius) {
    return Math.min(MAP_REGION_MAX_RADIUS, Math.max(innerRadius + MAP_REGION_BONUS_RADIUS, innerRadius + 1));
}
function computeFetchRadius(displayRadius) {
    return Math.min(MAP_REGION_MAX_RADIUS, displayRadius + MAP_BACKDROP_PAN_MARGIN);
}
function disposeActiveBackdrop(scene) {
    if (!activeBackdrop)
        return;
    scene.remove(activeBackdrop);
    activeBackdrop.geometry?.dispose();
    if (activeBackdrop.material?.map) {
        activeBackdrop.material.map.dispose();
    }
    activeBackdrop.material?.dispose();
    activeBackdrop = null;
}
function applyBackdropMesh(scene, geometry, texture, chunkCount, radius) {
    if (!activeBackdrop) {
        const material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
            map: texture,
            side: three__WEBPACK_IMPORTED_MODULE_0__.DoubleSide,
            transparent: true,
            opacity: 0.98,
            depthTest: true,
            depthWrite: false,
            fog: false,
            toneMapped: false,
        });
        activeBackdrop = new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(geometry, material);
        activeBackdrop.name = 'worldview-map-backdrop';
        activeBackdrop.renderOrder = -30;
        activeBackdrop.frustumCulled = false;
        scene.add(activeBackdrop);
    }
    else {
        const previousGeometry = activeBackdrop.geometry;
        const previousTexture = activeBackdrop.material?.map;
        activeBackdrop.geometry = geometry;
        activeBackdrop.material.map = texture;
        activeBackdrop.material.needsUpdate = true;
        previousGeometry?.dispose();
        previousTexture?.dispose();
        if (!activeBackdrop.parent) {
            scene.add(activeBackdrop);
        }
    }
    activeBackdrop.userData.chunkCount = chunkCount;
    activeBackdrop.userData.radius = radius;
}
function mapBackdropStats() {
    return activeStats;
}
function sampleMapBackdropColor(worldX, worldZ) {
    if (!activeSampler || !Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
        return null;
    }
    const pixels = activeSampler.getPixels();
    if (!pixels)
        return null;
    const u = (worldX - activeSampler.minX) / activeSampler.size;
    const v = (worldZ - activeSampler.minZ) / activeSampler.size;
    if (u < 0 || u > 1 || v < 0 || v > 1) {
        return null;
    }
    const x = Math.max(0, Math.min(activeSampler.width - 1, Math.floor(u * activeSampler.width)));
    const y = Math.max(0, Math.min(activeSampler.height - 1, Math.floor(v * activeSampler.height)));
    const offset = (y * activeSampler.width + x) * 4;
    return {
        r: pixels[offset],
        g: pixels[offset + 1],
        b: pixels[offset + 2],
    };
}
function createBackdropSampler(image, minX, minZ, size) {
    if (!image?.width || !image?.height)
        return null;
    return {
        minX,
        minZ,
        size,
        width: image.width,
        height: image.height,
        image,
        pixels: null,
        getPixels() {
            if (this.pixels)
                return this.pixels;
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context)
                return null;
            context.drawImage(image, 0, 0);
            this.pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            return this.pixels;
        },
    };
}
function coveredChunkKey(coveredChunks) {
    if (!(coveredChunks instanceof Set) || coveredChunks.size === 0)
        return '';
    return Array.from(coveredChunks).sort().join('|');
}
function createBackdropCoverageGeometry(minX, minZ, size, centerX, centerZ, radius, innerRadius, coveredChunks) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const addRect = (x0, z0, x1, z1) => {
        if (x1 <= x0 || z1 <= z0)
            return;
        const index = positions.length / 3;
        positions.push(x0, MAP_BACKDROP_Y, z0, x1, MAP_BACKDROP_Y, z0, x1, MAP_BACKDROP_Y, z1, x0, MAP_BACKDROP_Y, z1);
        uvs.push(uvX(x0), uvZ(z0), uvX(x1), uvZ(z0), uvX(x1), uvZ(z1), uvX(x0), uvZ(z1));
        indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
    };
    const covered = coveredChunks instanceof Set ? coveredChunks : new Set();
    for (let chunkZ = centerZ - radius; chunkZ <= centerZ + radius; chunkZ += 1) {
        for (let chunkX = centerX - radius; chunkX <= centerX + radius; chunkX += 1) {
            const x0 = chunkX * CHUNK_SIZE;
            const z0 = chunkZ * CHUNK_SIZE;
            const x1 = x0 + CHUNK_SIZE;
            const z1 = z0 + CHUNK_SIZE;
            if (!covered.has(`${chunkX}:${chunkZ}`)) {
                addRect(x0, z0, x1, z1);
            }
        }
    }
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry();
    geometry.setAttribute('position', new three__WEBPACK_IMPORTED_MODULE_0__.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new three__WEBPACK_IMPORTED_MODULE_0__.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
    function uvX(x) {
        return (x - minX) / size;
    }
    function uvZ(z) {
        return 1 - (z - minZ) / size;
    }
}


/***/ },

/***/ "./src/main/resources/web/src/mesh-cache.ts"
/*!**************************************************!*\
  !*** ./src/main/resources/web/src/mesh-cache.ts ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   makeTerrainCacheKey: () => (/* binding */ makeTerrainCacheKey),
/* harmony export */   readTerrainCache: () => (/* binding */ readTerrainCache),
/* harmony export */   writeTerrainCache: () => (/* binding */ writeTerrainCache)
/* harmony export */ });
const DB_NAME = 'synthworldview-cache';
const DB_VERSION = 1;
const TERRAIN_STORE = 'terrainMeshes';
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let dbPromise = null;
function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled }) {
    const details = detailsEnabled ? 'details' : 'surface';
    return `${formatVersion}:${details}:${world}:${chunkX}:${chunkZ}`;
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
function openDb() {
    if (dbPromise)
        return dbPromise;
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
    if (sprite.userData.iconUrl === iconUrl && sprite.userData.iconImage) {
        drawMobBadge(sprite, mob, sprite.userData.iconImage);
        return;
    }
    sprite.userData.iconUrl = iconUrl;
    sprite.userData.iconImage = null;
    drawMobBadge(sprite, mob);
    const image = new Image();
    image.onload = () => {
        if (sprite.userData.iconUrl !== iconUrl)
            return;
        sprite.userData.iconImage = image;
        drawMobBadge(sprite, sprite.userData.mob, image);
    };
    image.onerror = () => {
        if (sprite.userData.iconUrl === iconUrl) {
            sprite.userData.iconImage = null;
            drawMobBadge(sprite, sprite.userData.mob);
        }
    };
    image.src = iconUrl;
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
    sprite.scale.set(4.8, 6.4, 1);
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
const PLAYER_CARD_COLOR = new three__WEBPACK_IMPORTED_MODULE_0__.Color(0x5ef1b5);
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
    updateMobMarkerHeight(group, 3.4);
    return group;
}
function updateMobMarkerCard(marker, mob) {
    if (!marker?.userData?.badge)
        return;
    (0,_mob_card_js__WEBPACK_IMPORTED_MODULE_1__.updateMobBadge)(marker.userData.badge, mob);
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
        if (object.geometry)
            object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                for (const value of Object.values(material)) {
                    if (value?.isTexture)
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
/* harmony export */   SHADER_EFFECTS: () => (/* binding */ SHADER_EFFECTS),
/* harmony export */   createPostProcessing: () => (/* binding */ createPostProcessing),
/* harmony export */   renderPostProcessing: () => (/* binding */ renderPostProcessing),
/* harmony export */   resizePostProcessing: () => (/* binding */ resizePostProcessing),
/* harmony export */   setShaderEffect: () => (/* binding */ setShaderEffect)
/* harmony export */ });
/* harmony import */ var three_addons_postprocessing_EffectComposer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three/addons/postprocessing/EffectComposer.js */ "three/addons/postprocessing/EffectComposer.js");
/* harmony import */ var three_addons_postprocessing_RenderPass_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! three/addons/postprocessing/RenderPass.js */ "three/addons/postprocessing/RenderPass.js");
/* harmony import */ var three_addons_postprocessing_ShaderPass_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! three/addons/postprocessing/ShaderPass.js */ "three/addons/postprocessing/ShaderPass.js");



const SHADER_EFFECTS = Object.freeze({
    none: 0,
    tiltShift: 1,
    pixelMap: 2,
    vignette: 3,
    bloomLite: 4,
    cartographicInk: 5,
    nightScan: 6,
});
const CATALOG_SHADER = {
    name: 'SynthWorldviewShaderCatalog',
    uniforms: {
        tDiffuse: { value: null },
        mode: { value: SHADER_EFFECTS.none },
        resolution: { value: [1, 1] },
        time: { value: 0 },
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform int mode;
    uniform vec2 resolution;
    uniform float time;
    varying vec2 vUv;

    vec3 sampleColor(vec2 uv) {
      return texture2D(tDiffuse, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
    }

    float luma(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    vec3 tiltShift(vec2 uv) {
      float distanceFromFocus = abs(uv.y - 0.53);
      float blur = smoothstep(0.18, 0.48, distanceFromFocus);
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv) * 0.28;
      color += sampleColor(uv + vec2(texel.x * 1.5, 0.0) * blur) * 0.18;
      color += sampleColor(uv - vec2(texel.x * 1.5, 0.0) * blur) * 0.18;
      color += sampleColor(uv + vec2(0.0, texel.y * 2.2) * blur) * 0.18;
      color += sampleColor(uv - vec2(0.0, texel.y * 2.2) * blur) * 0.18;
      color += vec3(0.025, 0.016, 0.0);
      return mix(sampleColor(uv), color, 0.88);
    }

    vec3 pixelMap(vec2 uv) {
      float pixelSize = 3.0;
      vec2 pixelUv = (floor(uv * resolution / pixelSize) * pixelSize + pixelSize * 0.5) / resolution;
      vec3 color = sampleColor(pixelUv);
      color = floor(color * 14.0) / 14.0;
      return color * vec3(1.04, 1.02, 0.96);
    }

    vec3 vignette(vec2 uv) {
      vec3 color = sampleColor(uv);
      float distanceFromCenter = distance(uv, vec2(0.5));
      float edge = smoothstep(0.36, 0.76, distanceFromCenter);
      color *= mix(1.08, 0.62, edge);
      color = mix(color, vec3(luma(color)), 0.08);
      return color;
    }

    vec3 bloomLite(vec2 uv) {
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv);
      vec3 glow = vec3(0.0);
      glow += sampleColor(uv + texel * vec2(2.0, 0.0));
      glow += sampleColor(uv + texel * vec2(-2.0, 0.0));
      glow += sampleColor(uv + texel * vec2(0.0, 2.0));
      glow += sampleColor(uv + texel * vec2(0.0, -2.0));
      glow += sampleColor(uv + texel * vec2(2.0, 2.0));
      glow += sampleColor(uv + texel * vec2(-2.0, -2.0));
      glow /= 6.0;
      float bright = smoothstep(0.48, 0.92, luma(glow));
      return color + glow * bright * 0.28;
    }

    vec3 cartographicInk(vec2 uv) {
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv);
      float c = luma(color);
      float dx = abs(c - luma(sampleColor(uv + vec2(texel.x, 0.0)))) + abs(c - luma(sampleColor(uv - vec2(texel.x, 0.0))));
      float dy = abs(c - luma(sampleColor(uv + vec2(0.0, texel.y)))) + abs(c - luma(sampleColor(uv - vec2(0.0, texel.y))));
      float edge = smoothstep(0.08, 0.22, dx + dy);
      vec3 ink = vec3(0.025, 0.045, 0.045);
      color = floor(color * 18.0) / 18.0;
      return mix(color * vec3(1.05, 1.03, 0.94), ink, edge * 0.56);
    }

    vec3 nightScan(vec2 uv) {
      vec3 color = sampleColor(uv);
      float scan = sin((uv.y * resolution.y + time * 26.0) * 0.72) * 0.5 + 0.5;
      color = mix(color, color * vec3(0.58, 0.96, 0.86), 0.42);
      color += vec3(0.0, 0.03, 0.02) * scan;
      color *= 0.86 + scan * 0.08;
      return color;
    }

    void main() {
      vec3 color = sampleColor(vUv);
      if (mode == 1) {
        color = tiltShift(vUv);
      } else if (mode == 2) {
        color = pixelMap(vUv);
      } else if (mode == 3) {
        color = vignette(vUv);
      } else if (mode == 4) {
        color = bloomLite(vUv);
      } else if (mode == 5) {
        color = cartographicInk(vUv);
      } else if (mode == 6) {
        color = nightScan(vUv);
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
function createPostProcessing(renderer, scene, camera) {
    const composer = new three_addons_postprocessing_EffectComposer_js__WEBPACK_IMPORTED_MODULE_0__.EffectComposer(renderer);
    composer.addPass(new three_addons_postprocessing_RenderPass_js__WEBPACK_IMPORTED_MODULE_1__.RenderPass(scene, camera));
    const shaderPass = new three_addons_postprocessing_ShaderPass_js__WEBPACK_IMPORTED_MODULE_2__.ShaderPass(CATALOG_SHADER);
    shaderPass.enabled = false;
    composer.addPass(shaderPass);
    return { composer, shaderPass, mode: 'none' };
}
function setShaderEffect(post, value) {
    const mode = SHADER_EFFECTS[value] ?? SHADER_EFFECTS.none;
    post.mode = value in SHADER_EFFECTS ? value : 'none';
    post.shaderPass.uniforms.mode.value = mode;
    post.shaderPass.enabled = mode !== SHADER_EFFECTS.none;
}
function resizePostProcessing(post, width, height, pixelRatio) {
    post.composer.setPixelRatio(pixelRatio);
    post.composer.setSize(width, height);
    post.shaderPass.uniforms.resolution.value = [Math.max(1, width * pixelRatio), Math.max(1, height * pixelRatio)];
}
function renderPostProcessing(post, renderer, scene, camera, deltaSeconds, elapsedSeconds) {
    if (post.shaderPass.enabled) {
        post.shaderPass.uniforms.time.value = elapsedSeconds;
        post.composer.render(deltaSeconds);
        return;
    }
    renderer.render(scene, camera);
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
const VIEW_STATE_KEY = 'synthworldview.viewState.v1';
function loadStoredViewState() {
    try {
        const raw = window.localStorage.getItem(VIEW_STATE_KEY);
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
/* harmony export */   applyWaterModeToObject: () => (/* binding */ applyWaterModeToObject),
/* harmony export */   prepareWaterMaterials: () => (/* binding */ prepareWaterMaterials),
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
            material.userData.worldviewWaterColor = tint.clone();
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
    return material?.userData?.worldviewWater === true || material?.name === 'worldview-water';
}
function prepareWaterMaterial(material) {
    if (!isWaterMaterial(material))
        return material;
    if (material.isShaderMaterial && material.userData?.worldviewWater === true) {
        trackWaterMaterial(material);
        return material;
    }
    const waterColor = material.color?.clone?.() ?? FALLBACK_MAP_WATER_COLOR.clone();
    const waterMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.ShaderMaterial({
        name: 'worldview-water',
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
    waterMaterial.name = 'worldview-water';
    waterMaterial.userData.worldviewWater = true;
    waterMaterial.userData.worldviewOriginalVertexColors = material.vertexColors;
    waterMaterial.userData.worldviewWaterColor = waterColor.clone();
    waterMaterial.transparent = true;
    waterMaterial.opacity = WATER_DEFAULTS.waterOpacity;
    waterMaterial.toneMapped = false;
    waterMaterial.fog = false;
    trackWaterMaterial(waterMaterial);
    return waterMaterial;
}
function trackWaterMaterial(material) {
    trackedWaterMaterials.add(material);
    if (material.userData.worldviewWaterDisposeTracked === true)
        return;
    material.userData.worldviewWaterDisposeTracked = true;
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
        reflectionTarget.texture.name = 'worldview-water-reflection';
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
    material.userData.worldviewWaterShaderActive = active;
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
        if (material.visible !== false && material.userData?.worldviewWaterShaderActive === true) {
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
