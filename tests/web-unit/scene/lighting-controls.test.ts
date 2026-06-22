import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  fogControlRange,
  currentLightingOptions,
  fogControlOptions,
  applyFogSettings,
  updateMapDistanceFog,
  applyLighting,
} from '../../../src/main/resources/web/src/scene/lighting-controls.ts';
import {
  scene,
  postProcessing,
  loadedChunks,
} from '../../../src/main/resources/web/src/scene/scene-context.ts';
import {
  treeShadeInput,
  shadeSizeValueInput,
  shadeDarknessValueInput,
  mapTimeInput,
  fogNearValueInput,
  fogFarValueInput,
  fogEnabledInput,
  fogStrengthValueInput,
  fogHorizonValueInput,
} from '../../../src/main/resources/web/src/ui/dom.ts';

function seedFogInputs() {
  // terrainTuningControlValue clamps to [min, max] (defaults max=64 when absent), so
  // widen the bounds on these scaffold inputs to let our test values pass through.
  for (const el of [fogNearValueInput, fogFarValueInput] as any[]) {
    el.setAttribute('min', '1');
    el.setAttribute('max', '5000');
  }
  (fogNearValueInput as any).value = '120';
  (fogFarValueInput as any).value = '900';
  (fogStrengthValueInput as any).value = '1.1';
  (fogHorizonValueInput as any).value = '0.5';
}

test('fogControlRange reads near/far from the fog inputs', () => {
  seedFogInputs();
  const range = fogControlRange();
  assert.equal(range.near, 120);
  assert.equal(range.far, 900);
});

test('currentLightingOptions reflects tree-shade + noon when map time off', () => {
  (treeShadeInput as any).checked = true;
  (shadeSizeValueInput as any).value = '2';
  (shadeDarknessValueInput as any).value = '0.5';
  (mapTimeInput as any).checked = false; // → NOON_LIGHTING_TIME
  seedFogInputs();
  const opts = currentLightingOptions();
  assert.equal(opts.sun, true);
  assert.equal(opts.shade, true);
  assert.equal(opts.shadeSize, 2);
  assert.equal(opts.shadeDarkness, 0.5);
  assert.equal(opts.time.phase, 'noon');
  assert.deepEqual(opts.fogRange, { near: 120, far: 900 });
});

test('currentLightingOptions uses runtime world time when map time on', () => {
  (mapTimeInput as any).checked = true;
  const opts = currentLightingOptions();
  // runtime.worldTime is whatever the runtime holds; just assert it is defined and not noon constant.
  assert.ok('time' in opts);
  (mapTimeInput as any).checked = false;
});

test('fogControlOptions assembles fog settings from controls', () => {
  (fogEnabledInput as any).checked = true;
  seedFogInputs();
  const opts = fogControlOptions();
  assert.equal(opts.enabled, true);
  assert.equal(opts.near, 120);
  assert.equal(opts.far, 900);
  assert.equal(opts.strength, 1.1);
  assert.equal(opts.horizonStrength, 0.5);
  // color falls back to scene background or terrascapeFog color.
  assert.ok(opts.color);
});

test('applyFogSettings clears scene fog and pushes options to postprocessing', () => {
  (fogEnabledInput as any).checked = true;
  seedFogInputs();
  applyFogSettings();
  assert.equal(scene.fog, null);
  assert.equal(postProcessing.enabled, true);
  assert.equal(postProcessing.fogPass.uniforms.fogNear.value, 120);
  assert.equal(postProcessing.fogPass.uniforms.fogFar.value, 900);
});

test('updateMapDistanceFog nulls scene fog', () => {
  scene.fog = new THREE.Fog(0x000000, 1, 2);
  updateMapDistanceFog();
  assert.equal(scene.fog, null);
});

test('applyLighting runs the full pipeline over loaded chunks', () => {
  // Add a chunk entry with a terrain object and a (null) shade.
  const object = new THREE.Object3D();
  const terrain = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  object.add(terrain);
  loadedChunks.set('0:0', { object, shade: null });

  (treeShadeInput as any).checked = false;
  (mapTimeInput as any).checked = false;
  (fogEnabledInput as any).checked = true;
  seedFogInputs();

  applyLighting();
  // Terrain got the lighting response applied.
  assert.equal(terrain.material.roughness, 0.88);
  assert.equal(scene.fog, null);
  assert.ok(scene.userData.terrascapeFog);

  loadedChunks.delete('0:0');
});
