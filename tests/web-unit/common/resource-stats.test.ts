import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectChunkResourceStats,
  disposeObjectTree,
} from '../../../web/src/common/resource-stats.ts';

test('collects and disposes object tree resources once', () => {
  const calls = { geometryA: 0, geometryB: 0, materialA: 0, materialB: 0, textureA: 0 };
  const textureA = { isTexture: true, dispose: () => calls.textureA++ };
  const geometryA = {
    index: { count: 6 },
    getAttribute: () => ({ count: 99 }),
    dispose: () => calls.geometryA++,
  };
  const geometryB = {
    getAttribute: () => ({ count: 12 }),
    dispose: () => calls.geometryB++,
  };
  const materialA = { map: textureA, dispose: () => calls.materialA++ };
  const materialB = { normalMap: textureA, dispose: () => calls.materialB++ };
  const tree = {
    traverse(visitor) {
      visitor({ isMesh: true, geometry: geometryA, material: materialA });
      visitor({ isMesh: true, geometry: geometryA, material: [materialA, materialB] });
      visitor({ isMesh: true, geometry: geometryB, material: null });
    },
  };

  assert.deepEqual(collectChunkResourceStats([{ object: tree }]), {
    meshes: 3,
    geometries: 2,
    materials: 2,
    textures: 1,
    triangles: 8,
  });
  assert.deepEqual(disposeObjectTree(tree), {
    geometries: 2,
    materials: 2,
    textures: 1,
  });
  assert.deepEqual(calls, {
    geometryA: 1,
    geometryB: 1,
    materialA: 1,
    materialB: 1,
    textureA: 1,
  });
});
