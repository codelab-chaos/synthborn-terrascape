import * as THREE from 'three';

const CHUNK_SIZE = 32;
const MAP_REGION_BONUS_RADIUS = 6;
const MAP_REGION_MAX_RADIUS = 16;
const MAP_BACKDROP_Y = 62;

let activeBackdrop = null;
let activeKey = null;
let requestSerial = 0;

export function updateMapBackdrop(scene, world, centerX, centerZ, meshRadius) {
  if (!world || !Number.isFinite(centerX) || !Number.isFinite(centerZ)) {
    clearMapBackdrop(scene);
    return;
  }

  const radius = Math.min(MAP_REGION_MAX_RADIUS, Math.max(meshRadius + MAP_REGION_BONUS_RADIUS, meshRadius));
  const key = `${world}:${centerX}:${centerZ}:${radius}`;
  if (key === activeKey) {
    return;
  }
  activeKey = key;

  const serial = ++requestSerial;
  const textureLoader = new THREE.TextureLoader();
  const url = `/api/mapregion/${encodeURIComponent(world)}/${centerX}/${centerZ}/${radius}.png`;
  textureLoader.load(url, (texture) => {
    if (serial !== requestSerial) {
      texture.dispose();
      return;
    }

    clearMapBackdrop(scene);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;

    const chunkCount = radius * 2 + 1;
    const size = chunkCount * CHUNK_SIZE;
    const minX = (centerX - radius) * CHUNK_SIZE;
    const minZ = (centerZ - radius) * CHUNK_SIZE;
    const geometry = createAlignedPlaneGeometry(minX, minZ, size);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'worldview-map-backdrop';
    mesh.renderOrder = -20;
    activeBackdrop = mesh;
    scene.add(mesh);
  }, undefined, (error) => {
    if (serial === requestSerial) {
      console.warn('Map backdrop load failed', error);
      clearMapBackdrop(scene);
    }
  });
}

export function clearMapBackdrop(scene) {
  if (!activeBackdrop) return;
  scene.remove(activeBackdrop);
  activeBackdrop.geometry?.dispose();
  if (activeBackdrop.material?.map) {
    activeBackdrop.material.map.dispose();
  }
  activeBackdrop.material?.dispose();
  activeBackdrop = null;
}

function createAlignedPlaneGeometry(minX, minZ, size) {
  const maxX = minX + size;
  const maxZ = minZ + size;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    minX, MAP_BACKDROP_Y, minZ,
    maxX, MAP_BACKDROP_Y, minZ,
    maxX, MAP_BACKDROP_Y, maxZ,
    minX, MAP_BACKDROP_Y, maxZ,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
  ], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}