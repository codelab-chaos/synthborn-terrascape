import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const DEFAULT_FOG_COLOR = new THREE.Color(0xd9f3f2);

const DEPTH_FOG_SHADER = {
  name: 'TerrascapeDepthFog',
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 6000 },
    fogNear: { value: 150 },
    fogFar: { value: 620 },
    fogColor: { value: DEFAULT_FOG_COLOR.clone() },
    fogStrength: { value: 0.9 },
    horizonStrength: { value: 0.65 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #include <packing>

    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float fogNear;
    uniform float fogFar;
    uniform vec3 fogColor;
    uniform float fogStrength;
    uniform float horizonStrength;
    varying vec2 vUv;

    float readViewZ(sampler2D depthSampler, vec2 coord) {
      float fragCoordZ = texture2D(depthSampler, coord).x;
      float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      return -viewZ;
    }

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      float rawDepth = texture2D(tDepth, vUv).x;
      float viewDistance = readViewZ(tDepth, vUv);
      float range = max(1.0, fogFar - fogNear);
      float distanceFog = smoothstep(fogNear, fogNear + range, viewDistance);
      float skyPixel = step(0.9999, rawDepth);
      float skyHaze = skyPixel * smoothstep(0.72, 0.34, vUv.y) * horizonStrength;
      float terrainHaze = (1.0 - skyPixel) * distanceFog * smoothstep(0.62, 0.24, vUv.y) * horizonStrength * 0.3;
      float fogAmount = clamp(max(distanceFog, skyHaze) * fogStrength + terrainHaze, 0.0, 1.0);
      vec3 hazeColor = max(fogColor, source.rgb);
      vec3 color = mix(source.rgb, hazeColor, fogAmount);
      gl_FragColor = vec4(color, source.a);
    }
  `,
};

export function createPostProcessing(renderer, scene, camera) {
  const renderTarget = createDepthRenderTarget(renderer);
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  const fogPass = new ShaderPass(DEPTH_FOG_SHADER);
  composer.addPass(renderPass);
  composer.addPass(fogPass);
  fogPass.enabled = false;
  setDepthTextureUniform(composer, fogPass);
  updateCameraUniforms(fogPass, camera);
  return { composer, fogPass, renderPass, enabled: false };
}

type FogOptions = {
  enabled?: boolean;
  near?: number;
  far?: number;
  strength?: number;
  horizonStrength?: number;
  color?: THREE.Color;
};

export function setFogOptions(post, options: FogOptions = {}) {
  post.enabled = options.enabled !== false;
  post.fogPass.enabled = post.enabled;
  post.fogPass.uniforms.fogNear.value = finiteNumber(options.near, 150);
  post.fogPass.uniforms.fogFar.value = Math.max(
    post.fogPass.uniforms.fogNear.value + 1,
    finiteNumber(options.far, 620),
  );
  post.fogPass.uniforms.fogStrength.value = finiteNumber(options.strength, 0.9);
  post.fogPass.uniforms.horizonStrength.value = finiteNumber(options.horizonStrength, 0.65);
  if (options.color?.isColor) {
    post.fogPass.uniforms.fogColor.value.copy(options.color);
  }
}

export function resizePostProcessing(post, width, height, pixelRatio) {
  post.composer.setPixelRatio(pixelRatio);
  post.composer.setSize(width, height);
  ensureDepthTexture(post.composer.renderTarget1);
  ensureDepthTexture(post.composer.renderTarget2);
  setDepthTextureUniform(post.composer, post.fogPass);
}

export function renderPostProcessing(post, renderer, scene, camera, deltaSeconds) {
  if (!post.enabled) {
    renderer.render(scene, camera);
    return;
  }
  updateCameraUniforms(post.fogPass, camera);
  setDepthTextureUniform(post.composer, post.fogPass);
  post.composer.render(deltaSeconds);
}

function createDepthRenderTarget(renderer) {
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();
  const renderTarget = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(size.x * pixelRatio)),
    Math.max(1, Math.floor(size.y * pixelRatio)),
    {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: true,
    },
  );
  ensureDepthTexture(renderTarget);
  return renderTarget;
}

function ensureDepthTexture(target) {
  if (!target) return;
  if (target.depthTexture) return;
  target.depthBuffer = true;
  target.depthTexture = new THREE.DepthTexture(target.width, target.height);
  target.depthTexture.format = THREE.DepthFormat;
  target.depthTexture.type = THREE.UnsignedShortType;
  target.depthTexture.name = 'terrascape-postprocess-depth';
}

function setDepthTextureUniform(composer, fogPass) {
  ensureDepthTexture(composer.readBuffer);
  fogPass.uniforms.tDepth.value = composer.readBuffer.depthTexture;
}

function updateCameraUniforms(fogPass, camera) {
  fogPass.uniforms.cameraNear.value = camera.near;
  fogPass.uniforms.cameraFar.value = camera.far;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
