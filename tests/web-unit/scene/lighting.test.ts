import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createLightingRig,
  lightingOptionsFromInputs,
  applyLightingEnvironment,
  applyLightingToObject,
  positionSkyObjects,
  createTreeShadeObject,
  updateTreeShadeObject,
} from '../../../web/src/scene/lighting.ts';

const SKY_COLOR = 0x173454;

function makeRig() {
  const scene = new THREE.Scene();
  const rig = createLightingRig(scene, SKY_COLOR);
  return { scene, rig };
}

// Stand-in renderer: applyLightingEnvironment only calls renderer.setClearColor.
const fakeRenderer = () => {
  let clear: any = null;
  return { setClearColor(c: any) { clear = c; }, get clear() { return clear; } };
};

test('createLightingRig builds the full sky rig and adds it to the scene', () => {
  const { scene, rig } = makeRig();
  assert.ok(rig.ambient.isHemisphereLight);
  assert.ok(rig.sun.isDirectionalLight);
  assert.ok(rig.sky.isMesh);
  assert.ok(rig.stars.isPoints);
  assert.ok(rig.sunDisc.isSprite);
  assert.ok(rig.moonDisc.isSprite);
  assert.equal(rig.skyColor, SKY_COLOR);
  // sky, stars, sunDisc, moonDisc, ambient, sun all added.
  for (const obj of [rig.sky, rig.stars, rig.sunDisc, rig.moonDisc, rig.ambient, rig.sun]) {
    assert.ok(scene.children.includes(obj));
  }
});

test('lightingOptionsFromInputs reads inputs with fallbacks', () => {
  const opts = lightingOptionsFromInputs({
    treeShadeInput: { checked: true },
    shadeSizeInput: { value: '2.5' },
    shadeDarknessInput: { value: 'junk' },
    time: { dayProgress: 0.5 },
    fogRange: { near: 100, far: 500 },
  });
  assert.equal(opts.sun, true);
  assert.equal(opts.shade, true);
  assert.equal(opts.shadeSize, 2.5);
  assert.equal(opts.shadeDarkness, 0.4); // fallback for non-finite
  assert.deepEqual(opts.fogRange, { near: 100, far: 500 });
});

test('applyLightingEnvironment with sun=true at noon brightens the rig', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    time: { dayProgress: 0.5, sunlightFactor: 1 },
    fogRange: { near: 1200, far: 4000 },
  });
  // Noon → high daylight → high sun intensity.
  assert.ok(rig.sun.intensity > 2);
  assert.ok(rig.ambient.intensity > 1);
  assert.ok(rig.sky.visible);
  assert.ok(scene.userData.terrascapeFog);
  assert.equal(scene.userData.terrascapeFog.near, 1200);
  assert.equal(scene.userData.terrascapeFog.far, 4000);
  assert.equal(scene.fog, null);
  assert.ok(renderer.clear); // setClearColor called
  // Sky uniforms updated.
  assert.equal(rig.sky.material.uniforms.daylight.value > 0.5, true);
});

test('applyLightingEnvironment at night raises star opacity', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    time: { dayProgress: 0.0, sunlightFactor: 0 },
    fogRange: { near: 1200, far: 4000 },
  });
  // Deep night → low sun intensity, stars visible with opacity.
  assert.ok(rig.sun.intensity < 1);
  assert.ok(rig.stars.material.opacity > 0);
  assert.ok(rig.stars.visible);
});

test('applyLightingEnvironment with sun=false uses static fallback lighting', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: false,
    time: { dayProgress: 0.5 },
    fogRange: null,
  });
  assert.equal(rig.ambient.intensity, 2.2);
  assert.equal(rig.sun.intensity, 2.8);
  assert.deepEqual(
    [Math.round(rig.sun.position.x), Math.round(rig.sun.position.y), Math.round(rig.sun.position.z)],
    [80, 180, 40],
  );
  // Null fogRange → fallback near/far derived from daylight.
  assert.ok(scene.userData.terrascapeFog.near > 0);
  assert.ok(scene.userData.terrascapeFog.far > scene.userData.terrascapeFog.near);
});

test('applyLightingEnvironment rejects an invalid fog range', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    time: { dayProgress: 0.5 },
    fogRange: { near: 500, far: 400 }, // far <= near + 1 → fallback
  });
  assert.ok(scene.userData.terrascapeFog.far > scene.userData.terrascapeFog.near);
});

test('applyLightingEnvironment tolerates null time (normalizeTime fallback)', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    time: null, // → normalizeTime default branch
    fogRange: { near: 1200, far: 4000 },
  });
  assert.ok(scene.userData.terrascapeFog);
});

test('applyLightingEnvironment handles an invalid/zero sun direction', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    // sunDirection with a near-zero length and non-finite components → sunRayVector fallback.
    time: { dayProgress: 0.5, sunDirection: { x: 0, y: 0, z: 0 } },
    fogRange: { near: 1200, far: 4000 },
  });
  assert.ok(rig.sky.material.uniforms.sunDirection.value.lengthSq() > 0);
});

test('applyLightingEnvironment accepts an upward sun direction (negated)', () => {
  const { scene, rig } = makeRig();
  const renderer = fakeRenderer();
  applyLightingEnvironment(scene, renderer, rig, {
    sun: true,
    // y > 0 forces the negate() branch in sunRayVector.
    time: { dayProgress: 0.5, sunDirection: { x: 0.1, y: 0.9, z: 0.1 } },
    fogRange: { near: 1200, far: 4000 },
  });
  assert.ok(scene.userData.terrascapeFog);
});

test('positionSkyObjects copies origin to sky members', () => {
  const { rig } = makeRig();
  const origin = new THREE.Vector3(10, 20, 30);
  positionSkyObjects(rig, origin);
  assert.ok(rig.sky.position.equals(origin));
  assert.ok(rig.stars.position.equals(origin));
});

test('applyLightingToObject tints terrain meshes and skips shade/water', () => {
  const root = new THREE.Object3D();
  const terrain = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  root.add(terrain);

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2266ff });
  waterMat.userData.terrascapeWater = true;
  const water = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), waterMat);
  root.add(water);

  applyLightingToObject(root, { sun: true, time: { dayProgress: 0.0 } });
  // Terrain roughness gets driven to 0.88, water stays at 0.38.
  assert.equal(terrain.material.roughness, 0.88);
  assert.equal(waterMat.roughness, 0.38);
  assert.equal(terrain.material.metalness, 0);
});

// Builds a chunk that looks like detail (tree) meshes so cluster collection yields shades.
function makeTreeChunk() {
  const chunk = new THREE.Object3D();
  const count = 64;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (i % 8) * 0.5;
    positions[i * 3 + 1] = 10 + (i % 4);
    positions[i * 3 + 2] = Math.floor(i / 8) * 0.5;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.MeshBasicMaterial();
  mat.name = 'terrascape-detail';
  const mesh = new THREE.Mesh(geom, mat);
  chunk.add(mesh);

  // Add a ground/terrain mesh so terrain-height sampling has data.
  const groundCount = 100;
  const gpos = new Float32Array(groundCount * 3);
  const gnorm = new Float32Array(groundCount * 3);
  for (let i = 0; i < groundCount; i++) {
    gpos[i * 3] = (i % 10);
    gpos[i * 3 + 1] = 5;
    gpos[i * 3 + 2] = Math.floor(i / 10);
    gnorm[i * 3 + 1] = 1; // pointing up
  }
  const ggeom = new THREE.BufferGeometry();
  ggeom.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  ggeom.setAttribute('normal', new THREE.BufferAttribute(gnorm, 3));
  const ground = new THREE.Mesh(ggeom, new THREE.MeshBasicMaterial());
  chunk.add(ground);
  return chunk;
}

test('createTreeShadeObject builds an instanced shade mesh', () => {
  const chunk = makeTreeChunk();
  const mesh = createTreeShadeObject(chunk, {
    sun: true,
    shade: true,
    shadeSize: 1.85,
    shadeDarkness: 0.4,
    time: { dayProgress: 0.5 },
  });
  assert.ok(mesh, 'expected a shade mesh');
  assert.ok(mesh.isInstancedMesh);
  assert.equal(mesh.name, 'terrascape-tree-shade');
  assert.equal(mesh.userData.terrascapeTreeShade, true);
  assert.ok(Array.isArray(mesh.userData.clusters));
  assert.ok(mesh.userData.clusters.length > 0);
});

test('createTreeShadeObject returns null when no tree clusters exist', () => {
  const empty = new THREE.Object3D();
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  empty.add(ground);
  assert.equal(createTreeShadeObject(empty, { shade: true, shadeSize: 1, shadeDarkness: 0.4 }), null);
});

test('updateTreeShadeObject toggles visibility and writes matrices', () => {
  const chunk = makeTreeChunk();
  const mesh = createTreeShadeObject(chunk, {
    sun: true, shade: true, shadeSize: 1.85, shadeDarkness: 0.4, time: { dayProgress: 0.5 },
  });
  assert.ok(mesh);
  // BufferAttribute.needsUpdate is a write-only setter (reads return undefined), so we
  // observe the bumped version counter instead.
  const versionBefore = mesh.instanceMatrix.version;
  updateTreeShadeObject(mesh, {
    sun: true, shade: false, shadeSize: 2, shadeDarkness: 0.6, time: { dayProgress: 0.5 },
  });
  assert.equal(mesh.visible, false);
  assert.ok(mesh.instanceMatrix.version > versionBefore);

  // sun=false branch.
  updateTreeShadeObject(mesh, {
    sun: false, shade: true, shadeSize: 1, shadeDarkness: 0.5, time: { dayProgress: 0.5 },
  });
  assert.equal(mesh.visible, true);
});

test('updateTreeShadeObject ignores non-shade meshes', () => {
  const plain = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  // Should not throw.
  updateTreeShadeObject(plain, { shade: true, shadeSize: 1, shadeDarkness: 0.4, time: null });
  updateTreeShadeObject(undefined, { shade: true });
  assert.ok(true);
});
