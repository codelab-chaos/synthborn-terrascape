import * as THREE from 'three';

const FALLBACK_MAP_WATER_COLOR = new THREE.Color(0x2a80b7);
const WATER_DEFAULTS = {
  waveHeight: 0.35,
  waveFrequency: 1.0,
  waveSpeed: 0.38,
  waterOpacity: 0.92,
};
const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();
const tempEye = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const tempLookAt = new THREE.Vector3();
const tempUp = new THREE.Vector3();
const textureMatrix = new THREE.Matrix4();
const reflectionCamera = new THREE.PerspectiveCamera();
const trackedWaterMaterials = new Set<THREE.ShaderMaterial>();
const trackedWaterMeshes = new Set<THREE.Mesh>();
const waterNormals = new THREE.TextureLoader().load('/textures/waternormals.jpg');
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
waterNormals.colorSpace = THREE.NoColorSpace;
let reflectionTarget = null;

const waterVertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  uniform float time;
  uniform float waveHeight;
  uniform float waveFrequency;

  varying vec4 mirrorCoord;
  varying vec3 vWorldPosition;

  float waterWave(vec2 p) {
    float waveA = sin((p.x * 0.018 + time * 0.65) * waveFrequency);
    float waveB = sin((p.y * 0.024 + p.x * 0.006 - time * 0.42) * waveFrequency);
    float waveC = sin((p.x * -0.012 + p.y * 0.019 + time * 0.31) * waveFrequency);
    return waveA * 0.55 + waveB * 0.32 + waveC * 0.18;
  }

  void main() {
    vec3 transformed = position;
    vec4 baseWorldPosition = modelMatrix * vec4(position, 1.0);
    transformed.y += waterWave(vec2(baseWorldPosition.x, -baseWorldPosition.z)) * waveHeight;
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    mirrorCoord = textureMatrix * worldPosition;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform sampler2D reflectionSampler;
  uniform sampler2D normalSampler;
  uniform float alpha;
  uniform float time;
  uniform float size;
  uniform float shaderMix;
  uniform float distortionScale;
  uniform vec3 eye;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform vec3 waterColor;

  varying vec4 mirrorCoord;
  varying vec3 vWorldPosition;

  vec4 flowNoise(vec2 uv) {
    vec2 uv0 = (uv / 103.0) + vec2(time / 17.0, time / 29.0);
    vec2 uv1 = uv / 107.0 - vec2(time / -19.0, time / 31.0);
    vec2 uv2 = uv / vec2(8907.0, 9803.0) + vec2(time / 101.0, time / 97.0);
    vec2 uv3 = uv / vec2(1091.0, 1027.0) - vec2(time / 109.0, time / -113.0);
    vec4 noise = texture2D(normalSampler, uv0)
      + texture2D(normalSampler, uv1)
      + texture2D(normalSampler, uv2)
      + texture2D(normalSampler, uv3);
    return noise * 0.5 - 1.0;
  }

  void sunLight(
    const vec3 surfaceNormal,
    const vec3 eyeDirection,
    float shiny,
    float spec,
    float diffuse,
    inout vec3 diffuseColor,
    inout vec3 specularColor
  ) {
    vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
    float direction = max(0.0, dot(eyeDirection, reflection));
    specularColor += pow(direction, shiny) * sunColor * spec;
    diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;
  }

  void main() {
    vec4 noise = flowNoise(vWorldPosition.xz * size);
    vec3 surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5));

    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);

    vec3 worldToEye = eye - vWorldPosition;
    vec3 eyeDirection = normalize(worldToEye);
    sunLight(surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);

    float eyeDist = length(worldToEye);
    vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / eyeDist) * distortionScale;
    vec3 reflectionSample = vec3(
      texture2D(reflectionSampler, mirrorCoord.xy / mirrorCoord.w + distortion)
    );

    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow(1.0 - theta, 5.0);
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
    vec3 albedo = mix(
      sunColor * diffuseLight * 0.3 + scatter,
      vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight,
      reflectance
    );
    gl_FragColor = vec4(mix(waterColor, albedo, shaderMix), alpha);
    #include <colorspace_fragment>
  }
`;

export function prepareWaterMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    let hasWaterMaterial = false;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => {
        const prepared = prepareWaterMaterial(material);
        hasWaterMaterial = hasWaterMaterial || isWaterMaterial(prepared);
        return prepared;
      });
    } else {
      object.material = prepareWaterMaterial(object.material);
      hasWaterMaterial = isWaterMaterial(object.material);
    }
    if (hasWaterMaterial) {
      trackWaterMesh(object);
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
      if (material.uniforms?.waterColor) {
        material.uniforms.waterColor.value.copy(tint);
      }
      material.userData.terrascapeWaterColor = tint.clone();
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
      material.transparent = true;
      material.opacity = mode === 'transparent' ? 0.48 : (mode === 'shader' ? WATER_DEFAULTS.waterOpacity : 1.0);
      setWaterAlpha(material, material.opacity);
      setWaterShaderActive(material, mode === 'shader');
      material.depthWrite = mode !== 'transparent';
      material.needsUpdate = true;
    }
    if (object.isMesh && hasWaterMaterial) {
      object.renderOrder = mode === 'transparent' ? 5 : 0;
    }
  });
}

export function updateWaterMaterials(scene, renderer, elapsedSeconds, camera) {
  tempEye.copy(camera.position);
  updateWaterReflection(scene, renderer, camera);
  for (const material of trackedWaterMaterials) {
    material.uniforms.time.value = elapsedSeconds * WATER_DEFAULTS.waveSpeed;
    material.uniforms.eye.value.copy(tempEye);
    material.uniforms.textureMatrix.value.copy(textureMatrix);
  }
}

function isWaterMaterial(material) {
  return material?.userData?.terrascapeWater === true || material?.name === 'terrascape-water';
}

function prepareWaterMaterial(material) {
  if (!isWaterMaterial(material)) return material;
  if (material.isShaderMaterial && material.userData?.terrascapeWater === true) {
    trackWaterMaterial(material);
    return material;
  }
  const waterColor = material.color?.clone?.() ?? FALLBACK_MAP_WATER_COLOR.clone();
  const waterMaterial = new THREE.ShaderMaterial({
    name: 'terrascape-water',
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
      alpha: { value: WATER_DEFAULTS.waterOpacity },
      time: { value: 0.0 },
      size: { value: 1.0 },
      shaderMix: { value: 0.0 },
      waveHeight: { value: WATER_DEFAULTS.waveHeight },
      waveFrequency: { value: WATER_DEFAULTS.waveFrequency },
      distortionScale: { value: 20.0 },
      textureMatrix: { value: textureMatrix.clone() },
      normalSampler: { value: waterNormals },
      reflectionSampler: { value: reflectionTexture() },
      eye: { value: new THREE.Vector3() },
      sunDirection: { value: new THREE.Vector3(0.42, 0.82, 0.38).normalize() },
      sunColor: { value: new THREE.Color(0xffffff) },
      waterColor: { value: waterColor.clone() },
    },
    side: material.side ?? THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    fog: false,
    toneMapped: false,
  });
  waterMaterial.name = 'terrascape-water';
  waterMaterial.userData.terrascapeWater = true;
  waterMaterial.userData.terrascapeOriginalVertexColors = material.vertexColors;
  waterMaterial.userData.terrascapeWaterColor = waterColor.clone();
  waterMaterial.transparent = true;
  waterMaterial.opacity = WATER_DEFAULTS.waterOpacity;
  waterMaterial.toneMapped = false;
  waterMaterial.fog = false;
  trackWaterMaterial(waterMaterial);
  return waterMaterial;
}

function trackWaterMaterial(material) {
  trackedWaterMaterials.add(material);
  if (material.userData.terrascapeWaterDisposeTracked === true) return;
  material.userData.terrascapeWaterDisposeTracked = true;
  material.addEventListener('dispose', () => trackedWaterMaterials.delete(material));
}

function trackWaterMesh(mesh) {
  trackedWaterMeshes.add(mesh);
}

function reflectionTexture() {
  return ensureReflectionTarget().texture;
}

function ensureReflectionTarget() {
  if (!reflectionTarget) {
    reflectionTarget = new THREE.WebGLRenderTarget(512, 512);
    reflectionTarget.texture.name = 'terrascape-water-reflection';
  }
  return reflectionTarget;
}

function updateWaterReflection(scene, renderer, camera) {
  if (!hasActiveShaderWater() || trackedWaterMeshes.size === 0) return;
  const target = ensureReflectionTarget();
  const waterY = estimateWaterY();
  reflectionCamera.near = camera.near;
  reflectionCamera.far = camera.far;
  reflectionCamera.aspect = camera.aspect;
  reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);
  reflectionCamera.position.copy(camera.position);
  reflectionCamera.position.y = waterY * 2 - camera.position.y;
  camera.getWorldDirection(tempDirection);
  tempDirection.y *= -1;
  tempLookAt.copy(reflectionCamera.position).add(tempDirection);
  tempUp.copy(camera.up);
  tempUp.y *= -1;
  reflectionCamera.up.copy(tempUp);
  reflectionCamera.lookAt(tempLookAt);
  reflectionCamera.updateMatrixWorld();

  textureMatrix.set(
    0.5, 0.0, 0.0, 0.5,
    0.0, 0.5, 0.0, 0.5,
    0.0, 0.0, 0.5, 0.5,
    0.0, 0.0, 0.0, 1.0);
  textureMatrix.multiply(reflectionCamera.projectionMatrix);
  textureMatrix.multiply(reflectionCamera.matrixWorldInverse);

  const visibleStates = [];
  for (const mesh of trackedWaterMeshes) {
    visibleStates.push([mesh, mesh.visible]);
    mesh.visible = false;
  }

  const currentTarget = renderer.getRenderTarget();
  const currentXrEnabled = renderer.xr.enabled;
  const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
  renderer.xr.enabled = false;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(target);
  renderer.state.buffers.depth.setMask(true);
  renderer.clear();
  renderer.render(scene, reflectionCamera);
  renderer.setRenderTarget(currentTarget);
  renderer.xr.enabled = currentXrEnabled;
  renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

  for (const [mesh, visible] of visibleStates) {
    mesh.visible = visible;
  }
}

/** Fixed Y where per-chunk map tiles meet the voxel water surface (pre-instancer value). */
export const MAP_BACKDROP_Y = 112;

export function resolveMapBackdropY() {
  return MAP_BACKDROP_Y;
}

function estimateWaterY() {
  let y = 0;
  let count = 0;
  for (const mesh of trackedWaterMeshes) {
    if (!mesh.parent) continue;
    tempBox.setFromObject(mesh);
    if (tempBox.isEmpty()) continue;
    y += tempBox.max.y;
    count++;
  }
  return count > 0 ? y / count : 112;
}

function setWaterAlpha(material, alpha) {
  if (material.uniforms?.alpha) {
    material.uniforms.alpha.value = alpha;
  }
}

function setWaterShaderActive(material, active) {
  material.userData.terrascapeWaterShaderActive = active;
  if (material.uniforms?.shaderMix) {
    material.uniforms.shaderMix.value = active ? 1.0 : 0.0;
  }
  if (material.uniforms?.waveHeight) {
    material.uniforms.waveHeight.value = active ? WATER_DEFAULTS.waveHeight : 0.0;
  }
  if (material.uniforms?.distortionScale) {
    material.uniforms.distortionScale.value = active ? 20.0 : 0.0;
  }
}

function hasActiveShaderWater() {
  for (const material of trackedWaterMaterials) {
    if (material.visible !== false && material.userData?.terrascapeWaterShaderActive === true) {
      return true;
    }
  }
  return false;
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
