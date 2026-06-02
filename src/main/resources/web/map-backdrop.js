import * as THREE from 'three';
import { logClientEvent } from './client-log.js';

const CHUNK_SIZE = 32;
const MAP_REGION_BONUS_RADIUS = 18;
const MAP_REGION_MAX_RADIUS = 34;
const MAP_BACKDROP_Y = 112.0;
const MAP_BACKDROP_EDGE_OVERLAP_CHUNKS = 0.65;

let activeBackdrop = null;
let activeKey = null;
let activeSampler = null;
let requestSerial = 0;
let activeStats = {
  loaded: 0,
  radius: 0,
  chunks: 0,
  bytes: 0,
  loadMs: 0,
  textureSize: '',
};

export function updateMapBackdrop(scene, renderer, options) {
  const { enabled, world, centerX, centerZ, meshRadius } = options;
  if (!enabled || !world || !Number.isFinite(centerX) || !Number.isFinite(centerZ)) {
    clearMapBackdrop(scene);
    return;
  }

  const innerRadius = Math.max(0, Math.floor(meshRadius));
  const radius = Math.min(MAP_REGION_MAX_RADIUS, Math.max(innerRadius + MAP_REGION_BONUS_RADIUS, innerRadius + 1));
  const key = `${world}:${centerX}:${centerZ}:${innerRadius}:${radius}`;
  if (key === activeKey) {
    return;
  }
  activeKey = key;
  activeStats = {
    loaded: 0,
    radius,
    chunks: radius * 2 + 1,
    bytes: 0,
    loadMs: 0,
    textureSize: '',
  };

  const serial = ++requestSerial;
  const textureLoader = new THREE.TextureLoader();
  const url = `/api/mapregion/${encodeURIComponent(world)}/${centerX}/${centerZ}/${radius}.png`;
  const started = performance.now();
  fetch(url, { cache: 'no-store' })
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

      disposeActiveBackdrop(scene);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
      texture.needsUpdate = true;

      const chunkCount = radius * 2 + 1;
      const size = chunkCount * CHUNK_SIZE;
      const minX = (centerX - radius) * CHUNK_SIZE;
      const minZ = (centerZ - radius) * CHUNK_SIZE;
      const geometry = createBackdropRingGeometry(minX, minZ, size, centerX, centerZ, innerRadius);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.98,
        depthTest: true,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'worldview-map-backdrop';
      mesh.renderOrder = -30;
      mesh.frustumCulled = false;
      mesh.userData.chunkCount = chunkCount;
      mesh.userData.radius = radius;
      activeBackdrop = mesh;
      activeSampler = createBackdropSampler(texture.image, minX, minZ, size);
      activeStats = {
        loaded: 1,
        radius,
        chunks: chunkCount,
        bytes,
        loadMs,
        textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : '',
      };
      scene.add(mesh);
      logClientEvent('map_backdrop_load', {
        world,
        centerX,
        centerZ,
        radius,
        chunks: chunkCount,
        bytes,
        ms: Math.round(loadMs),
        textureSize: activeStats.textureSize,
      });
      window.dispatchEvent(new CustomEvent('worldview:map-backdrop-loaded'));
    })
    .catch((error) => {
      if (serial === requestSerial) {
        console.warn('Map backdrop load failed', error);
        logClientEvent('map_backdrop_failed', {
          world,
          centerX,
          centerZ,
          radius,
          error: error?.message ?? error,
        });
        clearMapBackdrop(scene);
      }
    });
}

export function clearMapBackdrop(scene) {
  activeKey = null;
  requestSerial++;
  activeStats = {
    loaded: 0,
    radius: 0,
    chunks: 0,
    bytes: 0,
    loadMs: 0,
    textureSize: '',
  };
  activeSampler = null;
  disposeActiveBackdrop(scene);
}

function disposeActiveBackdrop(scene) {
  if (!activeBackdrop) return;
  scene.remove(activeBackdrop);
  activeBackdrop.geometry?.dispose();
  if (activeBackdrop.material?.map) {
    activeBackdrop.material.map.dispose();
  }
  activeBackdrop.material?.dispose();
  activeBackdrop = null;
}

export function mapBackdropStats() {
  return activeStats;
}

export function sampleMapBackdropColor(worldX, worldZ) {
  if (!activeSampler || !Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    return null;
  }
  const u = (worldX - activeSampler.minX) / activeSampler.size;
  const v = (worldZ - activeSampler.minZ) / activeSampler.size;
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return null;
  }
  const x = Math.max(0, Math.min(activeSampler.width - 1, Math.floor(u * activeSampler.width)));
  const y = Math.max(0, Math.min(activeSampler.height - 1, Math.floor(v * activeSampler.height)));
  const offset = (y * activeSampler.width + x) * 4;
  return {
    r: activeSampler.data[offset],
    g: activeSampler.data[offset + 1],
    b: activeSampler.data[offset + 2],
  };
}

function createBackdropSampler(image, minX, minZ, size) {
  if (!image?.width || !image?.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  return {
    minX,
    minZ,
    size,
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

function createBackdropRingGeometry(minX, minZ, size, centerX, centerZ, innerRadius) {
  const maxX = minX + size;
  const maxZ = minZ + size;
  const terrainMinX = (centerX - innerRadius) * CHUNK_SIZE;
  const terrainMinZ = (centerZ - innerRadius) * CHUNK_SIZE;
  const terrainMaxX = (centerX + innerRadius + 1) * CHUNK_SIZE;
  const terrainMaxZ = (centerZ + innerRadius + 1) * CHUNK_SIZE;
  const overlap = MAP_BACKDROP_EDGE_OVERLAP_CHUNKS * CHUNK_SIZE;
  const innerMinX = THREE.MathUtils.clamp(terrainMinX + overlap, minX, maxX);
  const innerMinZ = THREE.MathUtils.clamp(terrainMinZ + overlap, minZ, maxZ);
  const innerMaxX = THREE.MathUtils.clamp(terrainMaxX - overlap, minX, maxX);
  const innerMaxZ = THREE.MathUtils.clamp(terrainMaxZ - overlap, minZ, maxZ);
  const positions = [];
  const uvs = [];
  const indices = [];
  const addRect = (x0, z0, x1, z1) => {
    if (x1 <= x0 || z1 <= z0) return;
    const index = positions.length / 3;
    positions.push(
      x0, MAP_BACKDROP_Y, z0,
      x1, MAP_BACKDROP_Y, z0,
      x1, MAP_BACKDROP_Y, z1,
      x0, MAP_BACKDROP_Y, z1);
    uvs.push(
      uvX(x0), uvZ(z0),
      uvX(x1), uvZ(z0),
      uvX(x1), uvZ(z1),
      uvX(x0), uvZ(z1));
    indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  };

  if (innerMaxX <= innerMinX || innerMaxZ <= innerMinZ) {
    addRect(minX, minZ, maxX, maxZ);
  } else {
    addRect(minX, minZ, maxX, innerMinZ);
    addRect(minX, innerMaxZ, maxX, maxZ);
    addRect(minX, innerMinZ, innerMinX, innerMaxZ);
    addRect(innerMaxX, innerMinZ, maxX, innerMaxZ);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
