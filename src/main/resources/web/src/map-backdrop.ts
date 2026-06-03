import * as THREE from 'three';
import { logClientEvent } from './client-log.js';

const CHUNK_SIZE = 32;
const MAP_REGION_BONUS_RADIUS = 18;
const MAP_REGION_MAX_RADIUS = 34;
const MAP_BACKDROP_Y = 112.0;

let activeBackdrop = null;
let activeKey = null;
let pendingKey = null;
let activeGeometryKey = null;
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
  const { enabled, world, centerX, centerZ, meshRadius, coveredChunks } = options;
  if (!enabled || !world || !Number.isFinite(centerX) || !Number.isFinite(centerZ)) {
    clearMapBackdrop(scene);
    return;
  }

  const innerRadius = Math.max(0, Math.floor(meshRadius));
  const radius = Math.min(MAP_REGION_MAX_RADIUS, Math.max(innerRadius + MAP_REGION_BONUS_RADIUS, innerRadius + 1));
  const key = `${world}:${centerX}:${centerZ}:${innerRadius}:${radius}`;
  const geometryKey = `${key}:${coveredChunkKey(coveredChunks)}`;
  if (key === activeKey) {
    updateBackdropGeometry(geometryKey, centerX, centerZ, radius, innerRadius, coveredChunks);
    return;
  }
  if (key === pendingKey) {
    return;
  }
  pendingKey = key;
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

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
      texture.needsUpdate = true;

      const chunkCount = radius * 2 + 1;
      const size = chunkCount * CHUNK_SIZE;
      const minX = (centerX - radius) * CHUNK_SIZE;
      const minZ = (centerZ - radius) * CHUNK_SIZE;
      const geometry = createBackdropCoverageGeometry(minX, minZ, size, centerX, centerZ, radius, innerRadius, coveredChunks);
      applyBackdropMesh(scene, geometry, texture, chunkCount, radius);
      activeKey = key;
      pendingKey = null;
      activeGeometryKey = geometryKey;
      activeSampler = createBackdropSampler(texture.image, minX, minZ, size);
      activeStats = {
        loaded: 1,
        radius,
        chunks: chunkCount,
        bytes,
        loadMs,
        textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : '',
      };
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
        pendingKey = null;
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
  pendingKey = null;
  activeGeometryKey = null;
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

function applyBackdropMesh(scene, geometry, texture, chunkCount, radius) {
  if (!activeBackdrop) {
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
    activeBackdrop = new THREE.Mesh(geometry, material);
    activeBackdrop.name = 'worldview-map-backdrop';
    activeBackdrop.renderOrder = -30;
    activeBackdrop.frustumCulled = false;
    scene.add(activeBackdrop);
  } else {
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

function updateBackdropGeometry(geometryKey, centerX, centerZ, radius, innerRadius, coveredChunks) {
  if (!activeBackdrop || geometryKey === activeGeometryKey) return;
  const chunkCount = radius * 2 + 1;
  const size = chunkCount * CHUNK_SIZE;
  const minX = (centerX - radius) * CHUNK_SIZE;
  const minZ = (centerZ - radius) * CHUNK_SIZE;
  const previous = activeBackdrop.geometry;
  activeBackdrop.geometry = createBackdropCoverageGeometry(minX, minZ, size, centerX, centerZ, radius, innerRadius, coveredChunks);
  previous?.dispose();
  activeGeometryKey = geometryKey;
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

function coveredChunkKey(coveredChunks) {
  if (!(coveredChunks instanceof Set) || coveredChunks.size === 0) return '';
  return Array.from(coveredChunks).sort().join('|');
}

function createBackdropCoverageGeometry(minX, minZ, size, centerX, centerZ, radius, innerRadius, coveredChunks) {
  const maxX = minX + size;
  const maxZ = minZ + size;
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
