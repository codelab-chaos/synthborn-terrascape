import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createPostProcessing,
  setFogOptions,
  resizePostProcessing,
  renderPostProcessing,
} from '../../../web/src/scene/postprocessing.ts';
import { renderer, scene, camera } from '../../../web/src/scene/scene-context.ts';

test('createPostProcessing wires composer, passes, and disables fog by default', () => {
  const post = createPostProcessing(renderer, scene, camera);
  assert.ok(post.composer);
  assert.ok(post.renderPass);
  assert.ok(post.fogPass);
  assert.equal(post.enabled, false);
  assert.equal(post.fogPass.enabled, false);
  // Depth texture uniform is wired.
  assert.ok('tDepth' in post.fogPass.uniforms);
  // Camera uniforms seeded from the camera.
  assert.equal(post.fogPass.uniforms.cameraNear.value, camera.near);
  assert.equal(post.fogPass.uniforms.cameraFar.value, camera.far);
});

test('setFogOptions enables fog and clamps far above near', () => {
  const post = createPostProcessing(renderer, scene, camera);
  setFogOptions(post, {
    enabled: true,
    near: 200,
    far: 100, // below near → clamped to near + 1
    strength: 1.2,
    horizonStrength: 0.5,
    color: new THREE.Color(0x112233),
  });
  assert.equal(post.enabled, true);
  assert.equal(post.fogPass.enabled, true);
  assert.equal(post.fogPass.uniforms.fogNear.value, 200);
  assert.equal(post.fogPass.uniforms.fogFar.value, 201);
  assert.equal(post.fogPass.uniforms.fogStrength.value, 1.2);
  assert.equal(post.fogPass.uniforms.horizonStrength.value, 0.5);
  assert.ok(post.fogPass.uniforms.fogColor.value.equals(new THREE.Color(0x112233)));
});

test('setFogOptions falls back to defaults for junk numbers and missing color', () => {
  const post = createPostProcessing(renderer, scene, camera);
  setFogOptions(post, { enabled: false, near: 'x', far: 'y', strength: NaN });
  assert.equal(post.enabled, false);
  assert.equal(post.fogPass.enabled, false);
  assert.equal(post.fogPass.uniforms.fogNear.value, 150);
  assert.equal(post.fogPass.uniforms.fogFar.value, 620);
  assert.equal(post.fogPass.uniforms.fogStrength.value, 0.9);
  assert.equal(post.fogPass.uniforms.horizonStrength.value, 0.65);
});

test('setFogOptions defaults enabled to true when option omitted', () => {
  const post = createPostProcessing(renderer, scene, camera);
  setFogOptions(post, {});
  assert.equal(post.enabled, true);
});

test('resizePostProcessing resizes composer and keeps depth textures', () => {
  const post = createPostProcessing(renderer, scene, camera);
  resizePostProcessing(post, 640, 480, 1);
  assert.ok(post.composer.renderTarget1.depthTexture);
  assert.ok(post.composer.renderTarget2.depthTexture);
  assert.equal(post.fogPass.uniforms.tDepth.value, post.composer.readBuffer.depthTexture);
});

test('renderPostProcessing with fog disabled delegates to renderer.render', () => {
  const post = createPostProcessing(renderer, scene, camera);
  post.enabled = false;
  let called = false;
  const fakeRenderer: any = { render() { called = true; } };
  renderPostProcessing(post, fakeRenderer, scene, camera, 0.016);
  assert.equal(called, true);
});

test('renderPostProcessing with fog enabled updates camera uniforms before compositing', () => {
  const post = createPostProcessing(renderer, scene, camera);
  post.enabled = true;
  let composed = false;
  // Swap the composer.render with a stub so no GPU pass runs.
  post.composer.render = () => { composed = true; };
  renderPostProcessing(post, renderer, scene, camera, 0.016);
  assert.equal(composed, true);
  assert.equal(post.fogPass.uniforms.cameraNear.value, camera.near);
  assert.equal(post.fogPass.uniforms.cameraFar.value, camera.far);
});
