import * as THREE from 'three';

const FALLBACK_MAP_WATER_COLOR = new THREE.Color(0x2a80b7);
const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();

export function prepareWaterMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => prepareWaterMaterial(material));
    } else {
      object.material = prepareWaterMaterial(object.material);
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

function prepareWaterMaterial(material) {
  if (!isWaterMaterial(material)) return material;
  const waterMaterial = material.isMeshBasicMaterial
    ? material
    : new THREE.MeshBasicMaterial({
      color: material.color?.clone?.() ?? FALLBACK_MAP_WATER_COLOR,
      side: material.side ?? THREE.DoubleSide,
      vertexColors: material.vertexColors === true,
    });
  waterMaterial.name = 'worldview-water';
  waterMaterial.userData.worldviewWater = true;
  waterMaterial.userData.worldviewOriginalVertexColors = material.vertexColors;
  waterMaterial.transparent = true;
  waterMaterial.opacity = 0.72;
  waterMaterial.depthWrite = false;
  waterMaterial.toneMapped = false;
  waterMaterial.fog = false;
  return waterMaterial;
}

function sampleWaterTint(mesh, sampleMapColor) {
  return averageWaterSamples(mesh, sampleMapColor) ?? FALLBACK_MAP_WATER_COLOR.clone();
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
  return new THREE.Color().setRGB(
    r / count / 255,
    g / count / 255,
    b / count / 255,
    THREE.SRGBColorSpace);
}

function isLikelyWater(sample) {
  return sample.b > sample.r + 24
    && sample.g > sample.r + 10
    && sample.b > 90
    && sample.g > 80;
}
