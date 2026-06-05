import * as THREE from 'three';
import { logClientEvent } from './client-log.js';

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

export function updateMapBackdrop(scene, renderer, options) {
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
  const textureLoader = new THREE.TextureLoader();
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

      texture.colorSpace = THREE.SRGBColorSpace;
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
      logClientEvent('map_backdrop_load', {
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
        logClientEvent('map_backdrop_failed', {
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

export function clearMapBackdrop(scene) {
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
  if (!activeBackdrop || !textureAnchor?.textureKey) return false;
  if (textureAnchor.world !== world) return false;
  if (textureAnchor.innerRadius !== innerRadius) return false;
  if (textureAnchor.fetchRadius !== fetchRadius) return false;
  return viewFitsAnchor(viewCenterX, viewCenterZ, displayRadius, textureAnchor);
}

function viewFitsAnchor(viewCenterX, viewCenterZ, displayRadius, anchor) {
  return viewCenterX - displayRadius >= anchor.centerX - anchor.fetchRadius
    && viewCenterX + displayRadius <= anchor.centerX + anchor.fetchRadius
    && viewCenterZ - displayRadius >= anchor.centerZ - anchor.fetchRadius
    && viewCenterZ + displayRadius <= anchor.centerZ + anchor.fetchRadius;
}

function applyLoadedBackdrop(scene, options) {
  const {
    viewCenterX,
    viewCenterZ,
    innerRadius,
    displayRadius,
    coveredChunks,
    geometryKey,
    texture = null,
    bytes = activeStats.bytes,
    loadMs = 0,
    reused = false,
  } = options;

  const anchor = textureAnchor;
  if (!anchor) return;

  const textureMinX = (anchor.centerX - anchor.fetchRadius) * CHUNK_SIZE;
  const textureMinZ = (anchor.centerZ - anchor.fetchRadius) * CHUNK_SIZE;
  const textureSize = anchor.fetchRadius * 2 + 1;
  const textureWorldSize = textureSize * CHUNK_SIZE;
  const geometry = createBackdropCoverageGeometry(
    textureMinX,
    textureMinZ,
    textureWorldSize,
    viewCenterX,
    viewCenterZ,
    displayRadius,
    innerRadius,
    coveredChunks,
  );

  if (texture) {
    applyBackdropMesh(scene, geometry, texture, textureSize, anchor.fetchRadius);
  } else if (activeBackdrop) {
    const previousGeometry = activeBackdrop.geometry;
    activeBackdrop.geometry = geometry;
    previousGeometry?.dispose();
    if (!activeBackdrop.parent) {
      scene.add(activeBackdrop);
    }
  }

  activeGeometryKey = geometryKey;
  activeSampler = createBackdropSampler(
    activeBackdrop?.material?.map?.image,
    textureMinX,
    textureMinZ,
    textureWorldSize,
  );

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
    logClientEvent('map_backdrop_reuse', {
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

export function mapBackdropStats() {
  return activeStats;
}

export function sampleMapBackdropColor(worldX, worldZ) {
  if (!activeSampler || !Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    return null;
  }
  const pixels = activeSampler.getPixels();
  if (!pixels) return null;
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
  if (!image?.width || !image?.height) return null;
  return {
    minX,
    minZ,
    size,
    width: image.width,
    height: image.height,
    image,
    pixels: null as Uint8ClampedArray | null,
    getPixels() {
      if (this.pixels) return this.pixels;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;
      context.drawImage(image, 0, 0);
      this.pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return this.pixels;
    },
  };
}

function coveredChunkKey(coveredChunks) {
  if (!(coveredChunks instanceof Set) || coveredChunks.size === 0) return '';
  return Array.from(coveredChunks).sort().join('|');
}

function createBackdropCoverageGeometry(minX, minZ, size, centerX, centerZ, radius, innerRadius, coveredChunks) {
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
