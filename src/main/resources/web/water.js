import * as THREE from 'three';

const FALLBACK_MAP_WATER_COLOR = new THREE.Color(0x2a80b7);
const DEEP_WATER_BIAS = new THREE.Color(0x0f6fa9);
const WATER_DARKEN = 0.72;
const WATER_DEEP_BIAS = 0.32;
const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();

export function prepareWaterMaterials(root) {
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!isWaterMaterial(material)) continue;
      material.name = 'worldview-water';
      material.userData.worldviewWater = true;
      material.userData.worldviewOriginalVertexColors = material.vertexColors;
      material.transparent = true;
      material.opacity = 0.72;
      material.depthWrite = false;
    }
  });
}

export function tintWaterMaterialsFromMap(root, sampleMapColor) {
  root.updateWorldMatrix?.(true, true);
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const waterMaterials = materials.filter(isWaterMaterial);
    if (waterMaterials.length === 0) return;

    const tint = sampleWaterTint(object, sampleMapColor);
    for (const material of waterMaterials) {
      material.vertexColors = false;
      material.color.copy(tint);
      material.needsUpdate = true;
    }
  });
}

export function applyWaterModeToObject(root, mode) {
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    let hasWaterMaterial = false;
    for (const material of materials) {
      if (!isWaterMaterial(material)) continue;
      hasWaterMaterial = true;
      material.visible = mode !== 'hidden';
      material.transparent = mode === 'transparent';
      material.opacity = mode === 'transparent' ? 0.48 : 1.0;
      material.depthWrite = mode !== 'transparent';
      material.needsUpdate = true;
    }
    if (object.isMesh && hasWaterMaterial) {
      object.renderOrder = mode === 'transparent' ? 5 : 0;
    }
  });
}

function isWaterMaterial(material) {
  return material?.userData?.worldviewWater === true || material?.name === 'worldview-water';
}

function sampleWaterTint(mesh, sampleMapColor) {
  const sampled = averageWaterSamples(mesh, sampleMapColor) ?? FALLBACK_MAP_WATER_COLOR;
  return sampled.clone()
    .lerp(DEEP_WATER_BIAS, WATER_DEEP_BIAS)
    .multiplyScalar(WATER_DARKEN);
}

function averageWaterSamples(mesh, sampleMapColor) {
  if (typeof sampleMapColor !== 'function') return null;
  tempBox.setFromObject(mesh);
  if (tempBox.isEmpty()) return null;
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
    if (!sample || !isLikelyWater(sample)) continue;
    r += sample.r;
    g += sample.g;
    b += sample.b;
    count++;
  }
  if (count === 0) return null;
  return new THREE.Color(r / count / 255, g / count / 255, b / count / 255);
}

function isLikelyWater(sample) {
  return sample.b > sample.r + 24
    && sample.g > sample.r + 10
    && sample.b > 90
    && sample.g > 80;
}
