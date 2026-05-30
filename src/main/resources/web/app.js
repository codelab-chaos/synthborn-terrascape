import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const worldSelect = document.querySelector('#world');
const chunkXInput = document.querySelector('#chunk-x');
const chunkZInput = document.querySelector('#chunk-z');
const loadButton = document.querySelector('#load');
const statusEl = document.querySelector('#status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x101416, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x101416, 150, 520);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
camera.position.set(38, 190, 72);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 122, 16);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.48;

scene.add(new THREE.HemisphereLight(0xcde8ff, 0x26342e, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(80, 180, 40);
scene.add(sun);

const grid = new THREE.GridHelper(256, 32, 0x35524a, 0x223530);
grid.position.y = 100;
scene.add(grid);

const loader = new GLTFLoader();
let currentChunk = null;

function setStatus(text) {
  statusEl.textContent = text;
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

async function loadChunk() {
  const world = worldSelect.value;
  const chunkX = Number.parseInt(chunkXInput.value, 10);
  const chunkZ = Number.parseInt(chunkZInput.value, 10);
  if (!world || Number.isNaN(chunkX) || Number.isNaN(chunkZ)) {
    setStatus('Choose a world and integer chunk coordinates');
    return;
  }

  setStatus(`Loading ${world} chunk ${chunkX}, ${chunkZ}`);
  const url = `/api/terrain/${encodeURIComponent(world)}/0/${chunkX}/${chunkZ}.glb`;
  const gltf = await loader.loadAsync(url);

  if (currentChunk) {
    scene.remove(currentChunk);
    currentChunk.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
  }

  currentChunk = gltf.scene;
  currentChunk.position.set(chunkX * 32, 0, chunkZ * 32);
  scene.add(currentChunk);

  const box = new THREE.Box3().setFromObject(currentChunk);
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  camera.position.set(center.x + 42, center.y + 72, center.z + 62);
  controls.update();

  setStatus(`Loaded ${world} chunk ${chunkX}, ${chunkZ}`);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
loadButton.addEventListener('click', () => {
  loadChunk().catch((error) => setStatus(error.message));
});

resize();
animate();
await loadWorlds();
if (worldSelect.value) {
  await loadChunk().catch((error) => setStatus(error.message));
}
