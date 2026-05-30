import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const worldSelect = document.querySelector('#world');
const chunkXInput = document.querySelector('#chunk-x');
const chunkZInput = document.querySelector('#chunk-z');
const radiusInput = document.querySelector('#radius');
const autoStreamInput = document.querySelector('#auto-stream');
const loadButton = document.querySelector('#load');
const statusEl = document.querySelector('#status');
const metricsEl = document.querySelector('#metrics');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x101416, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x101416, 150, 520);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
camera.position.set(88, 188, 88);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 122, 16);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 18;
controls.maxDistance = 420;
controls.maxPolarAngle = Math.PI * 0.47;
controls.screenSpacePanning = false;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY,
};
controls.touches = {
  ONE: THREE.TOUCH.PAN,
  TWO: THREE.TOUCH.DOLLY_ROTATE,
};

scene.add(new THREE.HemisphereLight(0xcde8ff, 0x26342e, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(80, 180, 40);
scene.add(sun);

const grid = new THREE.GridHelper(1024, 128, 0x35524a, 0x223530);
grid.position.y = 100;
scene.add(grid);

const loader = new GLTFLoader();
const loadedChunks = new Map();
let loadGeneration = 0;
let hasFocusedInitialGrid = false;
let activeCenterId = null;
let requestedCenterId = null;
let scheduledCenterId = null;
let streamTimer = null;
const pressedKeys = new Set();
const clock = new THREE.Clock();

function setStatus(text) {
  statusEl.textContent = text;
}

function updateMetrics() {
  const loaded = loadedChunks.size;
  const center = activeCenterId ? activeCenterId.split(':').slice(1).join(', ') : 'pending';
  metricsEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'} loaded · center ${center}`;
}

async function loadWorlds() {
  setStatus('Loading worlds');
  const response = await fetch('/api/worlds');
  const data = await response.json();
  worldSelect.replaceChildren();
  for (const world of data.worlds ?? []) {
    const option = document.createElement('option');
    option.value = world.name;
    option.textContent = world.name;
    worldSelect.append(option);
  }
  setStatus(worldSelect.value ? 'Ready' : 'No worlds found');
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
  let loaded = 0;
  let failed = 0;
  for (const key of needed) {
    if (generation !== loadGeneration) return;
    if (!loadedChunks.has(key.id)) {
      try {
        await loadChunk(world, key.chunkX, key.chunkZ);
      } catch (error) {
        failed++;
        console.warn(`Failed to load chunk ${key.chunkX},${key.chunkZ}`, error);
      }
      if (generation !== loadGeneration) return;
    }
    loaded++;
    setStatus(`Loaded ${loaded}/${needed.length} chunks around ${centerX}, ${centerZ}`);
    updateMetrics();
  }

  activeCenterId = centerKey;
  requestedCenterId = null;
  updateMetrics();
  setStatus(failed === 0
    ? `Loaded ${needed.length} chunks around ${centerX}, ${centerZ}`
    : `Loaded ${needed.length - failed}/${needed.length} chunks around ${centerX}, ${centerZ}`);
}

async function loadChunk(world, chunkX, chunkZ) {
  const url = `/api/terrain/${encodeURIComponent(world)}/0/${chunkX}/${chunkZ}.glb`;
  const gltf = await loadGltfWithRetry(url);
  const object = gltf.scene;
  object.position.set(chunkX * 32, 0, chunkZ * 32);
  scene.add(object);
  loadedChunks.set(chunkId(world, chunkX, chunkZ), { world, chunkX, chunkZ, object });
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  entry.object.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    }
  });
  loadedChunks.delete(id);
}

function focusGrid(centerX, centerZ, radius) {
  const center = new THREE.Vector3(centerX * 32 + 16, 122, centerZ * 32 + 16);
  controls.target.copy(center);
  camera.position.set(center.x + 78, center.y + 58, center.z + 78);
  controls.update();
}

function chunkId(world, chunkX, chunkZ) {
  return `${world}:${chunkX}:${chunkZ}`;
}

function centerId(world, chunkX, chunkZ) {
  return `${world}:${chunkX}:${chunkZ}`;
}

function targetChunk() {
  return {
    chunkX: Math.floor(controls.target.x / 32),
    chunkZ: Math.floor(controls.target.z / 32),
  };
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

function numberOr(value, fallback) {
  return Number.isNaN(value) ? fallback : value;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function handleKeyboardNavigation(deltaSeconds) {
  if (pressedKeys.size === 0 || isTypingInHud()) return;

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

  if (move.lengthSq() === 0) return;
  move.normalize();

  const boost = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? 3 : 1;
  move.multiplyScalar(72 * boost * deltaSeconds);
  camera.position.add(move);
  controls.target.add(move);
}

function isTypingInHud() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement
    || active instanceof HTMLSelectElement
    || active instanceof HTMLTextAreaElement;
}

function animate() {
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  handleKeyboardNavigation(deltaSeconds);
  controls.update();
  maybeAutoStream();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  if (isTypingInHud()) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
    event.preventDefault();
    pressedKeys.add(event.code);
  }
});
window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});
loadButton.addEventListener('click', () => {
  loadGrid().catch((error) => setStatus(error.message));
});

resize();
animate();
await loadWorlds();
if (worldSelect.value) {
  await loadGrid({ focus: true }).catch((error) => setStatus(error.message));
}
