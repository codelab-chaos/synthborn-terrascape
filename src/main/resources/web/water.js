export function prepareWaterMaterials(root) {
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!isWaterMaterial(material)) continue;
      material.name = 'worldview-water';
      material.userData.worldviewWater = true;
      material.transparent = true;
      material.opacity = 0.72;
      material.depthWrite = false;
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
