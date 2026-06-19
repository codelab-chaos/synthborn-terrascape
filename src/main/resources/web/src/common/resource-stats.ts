type Disposable = { dispose: () => void };
type TextureLike = Disposable & { isTexture?: boolean };
type MaterialLike = Disposable & Record<string, unknown>;

export function disposeObjectTree(object) {
  const geometries = new Set<Disposable>();
  const materials = new Set<MaterialLike>();
  const textures = new Set<TextureLike>();
  object.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) {
      const objectMaterials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of objectMaterials) {
        materials.add(material);
        for (const value of Object.values(material) as TextureLike[]) {
          if (value?.isTexture) textures.add(value);
        }
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  return {
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
  };
}

export function collectChunkResourceStats(entries) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let meshes = 0;
  let triangles = 0;

  for (const entry of entries) {
    entry.object.traverse((object) => {
      if (object.isMesh) meshes++;
      if (object.geometry) {
        geometries.add(object.geometry);
        const position = object.geometry.getAttribute('position');
        const triangleCount = object.geometry.index
          ? object.geometry.index.count / 3
          : (position?.count ?? 0) / 3;
        triangles += Math.floor(triangleCount);
      }
      if (object.material) {
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of objectMaterials) {
          materials.add(material);
          for (const value of Object.values(material) as TextureLike[]) {
            if (value?.isTexture) textures.add(value);
          }
        }
      }
    });
  }

  return {
    meshes,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
    triangles,
  };
}
