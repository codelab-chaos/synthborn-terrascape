import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  prepareWaterMaterials,
  tintWaterMaterialsFromMap,
  applyWaterModeToObject,
  updateWaterMaterials,
  resolveMapBackdropY,
  MAP_BACKDROP_Y,
} from '../../../web/src/scene/water.ts';

function waterMesh(name = 'terrascape-water') {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2266aa });
  mat.name = name;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 10), mat);
  return mesh;
}

test('MAP_BACKDROP_Y constant and resolver agree', () => {
  assert.equal(MAP_BACKDROP_Y, 112);
  assert.equal(resolveMapBackdropY(), 112);
});

test('prepareWaterMaterials converts named water material into a shader material', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);
  assert.ok(mesh.material.isShaderMaterial);
  assert.equal(mesh.material.name, 'terrascape-water');
  assert.equal(mesh.material.userData.terrascapeWater, true);
  assert.ok(mesh.material.uniforms.waterColor);
});

test('prepareWaterMaterials leaves non-water materials untouched', () => {
  const root = new THREE.Object3D();
  const mat = new THREE.MeshStandardMaterial({ color: 0x884422 });
  mat.name = 'terrascape-rock';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  root.add(mesh);
  prepareWaterMaterials(root);
  assert.equal(mesh.material, mat);
  assert.ok(!mesh.material.isShaderMaterial);
});

test('prepareWaterMaterials handles material arrays', () => {
  const root = new THREE.Object3D();
  const water = new THREE.MeshStandardMaterial({ color: 0x2266aa });
  water.name = 'terrascape-water';
  const rock = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [water, rock]);
  root.add(mesh);
  prepareWaterMaterials(root);
  assert.ok(Array.isArray(mesh.material));
  assert.ok(mesh.material[0].isShaderMaterial);
  assert.equal(mesh.material[1], rock);
});

test('prepareWaterMaterials is idempotent for already-shader water', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);
  const first = mesh.material;
  prepareWaterMaterials(root);
  assert.equal(mesh.material, first);
});

test('applyWaterModeToObject sets opacity/visibility per mode', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);

  applyWaterModeToObject(root, 'hidden');
  assert.equal(mesh.material.visible, false);

  applyWaterModeToObject(root, 'transparent');
  assert.equal(mesh.material.visible, true);
  assert.equal(mesh.material.opacity, 0.48);
  assert.equal(mesh.material.depthWrite, false);
  assert.equal(mesh.renderOrder, 5);

  applyWaterModeToObject(root, 'shader');
  assert.ok(mesh.material.opacity > 0.9);
  assert.equal(mesh.material.uniforms.shaderMix.value, 1.0);
  assert.equal(mesh.material.userData.terrascapeWaterShaderActive, true);
  assert.equal(mesh.renderOrder, 0);

  applyWaterModeToObject(root, 'opaque');
  assert.equal(mesh.material.opacity, 1.0);
  assert.equal(mesh.material.uniforms.shaderMix.value, 0.0);
});

test('tintWaterMaterialsFromMap averages map samples into water color', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);

  const sample = () => ({ r: 40, g: 120, b: 200 }); // looks like water
  tintWaterMaterialsFromMap(root, sample);
  const color = mesh.material.uniforms.waterColor.value;
  assert.ok(color.isColor);
  assert.ok(color.b > color.r);
  assert.ok(mesh.material.userData.terrascapeWaterColor.isColor);
});

test('tintWaterMaterialsFromMap falls back when samples are not water', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);
  // Non-water sample (mostly red) → averageWaterSamples returns null → fallback color.
  tintWaterMaterialsFromMap(root, () => ({ r: 200, g: 30, b: 20 }));
  const color = mesh.material.uniforms.waterColor.value;
  assert.ok(color.isColor);
});

test('tintWaterMaterialsFromMap ignores objects without water', () => {
  const root = new THREE.Object3D();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  root.add(mesh);
  // sampleMapColor not a function path also covered via undefined.
  tintWaterMaterialsFromMap(root, undefined);
  assert.ok(true);
});

test('updateWaterMaterials advances time and eye uniforms', () => {
  const root = new THREE.Object3D();
  const mesh = waterMesh();
  root.add(mesh);
  prepareWaterMaterials(root);
  // Keep shader inactive so updateWaterReflection short-circuits (no real render).
  applyWaterModeToObject(root, 'transparent');

  const scene = new THREE.Scene();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 6000);
  camera.position.set(5, 50, 5);

  // Renderer stand-in: only reached if hasActiveShaderWater() && meshes tracked.
  // With transparent mode the reflection update returns early, so render is never called.
  const renderer: any = {
    getRenderTarget() { return null; },
    setRenderTarget() {},
    getSize(v: THREE.Vector2) { return v.set(800, 600); },
    getPixelRatio() { return 1; },
    xr: { enabled: false },
    shadowMap: { autoUpdate: true },
    state: { buffers: { depth: { setMask() {} } } },
    clear() {},
    render() { throw new Error('should not render in transparent mode'); },
  };

  updateWaterMaterials(scene, renderer, 2.5, camera);
  assert.ok(mesh.material.uniforms.time.value > 0);
  assert.ok(mesh.material.uniforms.eye.value.equals(camera.position));
});
