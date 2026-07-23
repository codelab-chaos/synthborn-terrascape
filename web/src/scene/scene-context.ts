import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { canvas, statusEl } from '../ui/dom.ts';
import { createChunkPlaceholderManager } from '../terrain/chunk-placeholder.ts';
import { createChunkLandMotion } from '../library/chunk-land-motion.ts';
import { createFrameJankRecorder } from './frame-jank.ts';
import { createLightingRig } from './lighting.ts';
import { createPostProcessing } from './postprocessing.ts';
import { createFpsCounter } from '../ui/fps-counter.ts';
import { createNpcCatalog } from '../entities/npc-catalog.ts';
import { createTimeRibbon } from '../ui/time-ribbon.ts';
import { logClientEvent } from '../platform/client-log.ts';
import { AppRuntimeState } from '../common/app-state.ts';
import { loadStoredViewState } from '../ui/view-state.ts';
import {
  skySceneEl,
  skySunEl,
  skyMoonEl,
  skyStarsEl,
  timeCycleLabelEl,
} from '../ui/dom.ts';

// Shared scene constants.
export const SKY_COLOR = 0x173454;
const EMPTY_GRID_AXIS_COLOR = 0x1faa6a;
const EMPTY_GRID_LINE_COLOR = 0x15965a;
const EMPTY_GRID_SIZE = 1024;
const EMPTY_GRID_DIVISIONS = 128;

export const NOON_LIGHTING_TIME = {
  dayProgress: 0.5,
  sunlightFactor: 1,
  phase: 'noon',
  sunDirection: { x: 0.2, y: -1, z: 0.25 },
};

// Core renderer / scene / camera singletons.
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
export const rendererPixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(rendererPixelRatio);
renderer.setClearColor(SKY_COLOR, 1);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = null;

export const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 6000);
camera.position.set(88, 188, 88);

export const controls = new OrbitControls(camera, renderer.domElement);
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
export const FLY_MOUSE_BUTTONS = { ...controls.mouseButtons };
export const FOLLOW_MOUSE_BUTTONS = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY,
};

// Higher-level scene services.
export const lightingRig = createLightingRig(scene, SKY_COLOR);
export const postProcessing = createPostProcessing(renderer, scene, camera);
export const fpsCounter = createFpsCounter();
export const npcCatalog = createNpcCatalog({ logClientEvent });
export const timeRibbon = createTimeRibbon({
  labelEl: timeCycleLabelEl,
  sceneEl: skySceneEl,
  sunEl: skySunEl,
  moonEl: skyMoonEl,
  starsEl: skyStarsEl,
});

export const grid = new THREE.GridHelper(
  EMPTY_GRID_SIZE,
  EMPTY_GRID_DIVISIONS,
  EMPTY_GRID_AXIS_COLOR,
  EMPTY_GRID_LINE_COLOR,
);
for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
  material.transparent = true;
  material.opacity = 0.42;
  material.depthTest = true;
  material.depthWrite = false;
}
grid.renderOrder = -50;
scene.add(grid);

export const loader = new GLTFLoader();
export const chunkPlaceholderManager = createChunkPlaceholderManager(scene);
export const chunkLandMotion = createChunkLandMotion();
export const frameJank = createFrameJankRecorder();
export const clock = new THREE.Clock();
export const initialParams = new URLSearchParams(window.location.search);
export const runtime = new AppRuntimeState(loadStoredViewState());

// Shared collections tracking live scene objects.
export const loadedChunks = new Map();
export const playerMarkers = new Map();
export const playerTiles = new Map();
export const mobMarkers = new Map();
export const disposalStats = {
  chunks: 0,
  geometries: 0,
  materials: 0,
  textures: 0,
};
export const pressedKeys = new Set<string>();
export const cameraModeStack = [];
export const playerEyeState = {
  uuid: null,
  yawRad: 0,
  pitchRad: 0,
};

export function setStatus(text) {
  statusEl.textContent = text;
}

export function displayColor(color) {
  if (!color?.clone) return null;
  const srgb = color.clone().convertLinearToSRGB();
  return {
    r: Math.round(srgb.r * 255),
    g: Math.round(srgb.g * 255),
    b: Math.round(srgb.b * 255),
  };
}
