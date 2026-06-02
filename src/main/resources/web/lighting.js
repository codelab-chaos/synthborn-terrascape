import * as THREE from 'three';

const SUN_RAY_DIRECTION = new THREE.Vector3(0.55, -0.82, 0.22).normalize();
const SHADE_CLUSTER_SIZE = 7;
const MAX_SHADES_PER_CHUNK = 72;
const TREE_SHADE_KEY = 'worldviewTreeShade';
const DAY_SKY_TOP = new THREE.Color(0x3d86cf);
const DAY_SKY_HORIZON = new THREE.Color(0x88badd);
const NIGHT_SKY_TOP = new THREE.Color(0x07111f);
const NIGHT_SKY_HORIZON = new THREE.Color(0x151f34);
const DAWN_SKY_TOP = new THREE.Color(0x7d91c4);
const DAWN_SKY_HORIZON = new THREE.Color(0xe9a18a);
const DAWN_SUN_GLOW = new THREE.Color(0xffdf92);
const DAWN_HAZE = new THREE.Color(0xd9a4bd);
const FOG_DAY = new THREE.Color(0x547b93);
const FOG_NIGHT = new THREE.Color(0x071321);
const FOG_DAWN = new THREE.Color(0xc39698);
const NIGHT_TERRAIN_TINT = new THREE.Color(0x243225);
const DAY_TERRAIN_TINT = new THREE.Color(0xffffff);
let shadeTexture;

export function createLightingRig(scene, skyColor) {
  const ambient = new THREE.HemisphereLight(0xcde8ff, 0x26342e, 2.2);
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(80, 180, 40);
  const sky = createSkyDome();
  const stars = createStarField();
  const sunDisc = createSkyDisc(0xfff4cf, 58, 1);
  const moonDisc = createSkyDisc(0xd7e7ff, 28, 0.72);
  sky.renderOrder = -100;
  stars.renderOrder = -99;
  sunDisc.renderOrder = -98;
  moonDisc.renderOrder = -98;
  scene.add(sky);
  scene.add(stars);
  scene.add(sunDisc);
  scene.add(moonDisc);
  scene.add(ambient);
  scene.add(sun);
  return { ambient, sun, sky, stars, sunDisc, moonDisc, skyColor };
}

export function lightingOptionsFromInputs({ sunLightingInput, treeShadeInput, shadeSizeInput, shadeDarknessInput, time }) {
  return {
    sun: sunLightingInput.checked,
    shade: treeShadeInput.checked,
    shadeSize: readRange(shadeSizeInput, 1.85),
    shadeDarkness: readRange(shadeDarknessInput, 0.4),
    time,
  };
}

export function applyLightingEnvironment(scene, renderer, rig, options) {
  const time = normalizeTime(options.time);
  const sunPosition = visualSunPosition(time);
  const sunRayDirection = sunPosition.clone().negate();
  const daylight = visualDaylight(time.dayProgress);
  const night = 1 - daylight;
  const dawn = dawnAmount(time.dayProgress);
  const starOpacity = THREE.MathUtils.clamp((night - 0.52) / 0.34, 0, 1);
  const skyTop = colorForTime(NIGHT_SKY_TOP, DAY_SKY_TOP, DAWN_SKY_TOP, daylight, dawn);
  const skyHorizon = colorForTime(NIGHT_SKY_HORIZON, DAY_SKY_HORIZON, DAWN_SKY_HORIZON, daylight, dawn);
  const fogColor = FOG_NIGHT.clone()
    .lerp(FOG_DAY, daylight)
    .lerp(FOG_DAWN, dawn * (1 - daylight * 0.22));

  if (options.sun) {
    rig.ambient.intensity = THREE.MathUtils.lerp(0.24, 1.55, daylight) + dawn * 0.12;
    rig.ambient.color.copy(new THREE.Color(0x24364f).lerp(new THREE.Color(0xe7f4ff), daylight));
    rig.ambient.groundColor.copy(new THREE.Color(0x07110d).lerp(new THREE.Color(0x405638), daylight));
    rig.sun.intensity = THREE.MathUtils.lerp(0.0, 3.9, daylight);
    rig.sun.color.copy(new THREE.Color(0x8fb5ff).lerp(new THREE.Color(0xffddb0), Math.max(daylight, dawn)));
    rig.sun.position.copy(sunPosition).multiplyScalar(240);
  } else {
    rig.ambient.intensity = 2.2;
    rig.ambient.color.set(0xcde8ff);
    rig.ambient.groundColor.set(0x26342e);
    rig.sun.intensity = 2.8;
    rig.sun.color.set(0xffffff);
    rig.sun.position.set(80, 180, 40);
  }

  rig.sky.material.uniforms.topColor.value.copy(skyTop);
  rig.sky.material.uniforms.bottomColor.value.copy(skyHorizon);
  rig.sky.material.uniforms.sunDirection.value.copy(sunPosition);
  rig.sky.material.uniforms.sunGlowColor.value.copy(DAWN_SUN_GLOW);
  rig.sky.material.uniforms.dawnHazeColor.value.copy(DAWN_HAZE);
  rig.sky.material.uniforms.daylight.value = daylight;
  rig.sky.material.uniforms.dawnAmount.value = dawn;
  rig.sky.visible = true;
  rig.stars.visible = starOpacity > 0.01;
  rig.stars.material.opacity = starOpacity;
  rig.stars.material.needsUpdate = true;
  updateSkyDisc(rig.sunDisc, sunPosition, THREE.MathUtils.clamp(daylight + dawn * 0.26, 0, 1), 980);
  updateSkyDisc(rig.moonDisc, sunPosition.clone().negate(), night, 980);

  scene.background = skyHorizon.clone().lerp(skyTop, 0.38);
  scene.fog = new THREE.Fog(
    fogColor,
    THREE.MathUtils.lerp(1100, 1500, daylight),
    THREE.MathUtils.lerp(3600, 5200, daylight));
  renderer.setClearColor(scene.background, 1);
}

export function applyLightingToObject(object, options) {
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    if (node.userData?.[TREE_SHADE_KEY]) return;
    applyMaterialLightResponse(node, options);
  });
}

export function positionSkyObjects(rig, origin) {
  rig.sky.position.copy(origin);
  rig.stars.position.copy(origin);
  positionSkyDisc(rig.sunDisc, origin);
  positionSkyDisc(rig.moonDisc, origin);
}

export function createTreeShadeObject(chunkObject, options) {
  const clusters = collectTreeShadeClusters(chunkObject);
  if (clusters.length === 0) {
    return null;
  }

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: getShadeTexture(),
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    depthTest: true,
    color: 0x1f3325,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, clusters.length);
  mesh.name = 'worldview-tree-shade';
  mesh.userData[TREE_SHADE_KEY] = true;
  mesh.userData.clusters = clusters;
  mesh.renderOrder = -2;
  updateTreeShadeObject(mesh, options);
  return mesh;
}

export function updateTreeShadeObject(mesh, options) {
  if (!mesh?.userData?.[TREE_SHADE_KEY]) return;
  mesh.visible = options.shade === true;
  const time = normalizeTime(options.time);
  const daylight = options.sun ? visualDaylight(time.dayProgress) : 0.78;
  const sunRayDirection = visualSunPosition(time).negate();
  const lowSun = 1 - THREE.MathUtils.clamp(Math.abs(sunRayDirection.y) / 0.72, 0, 1);
  mesh.material.opacity = options.shadeDarkness * THREE.MathUtils.clamp(daylight + 0.1, 0.12, 1) * (options.sun ? 1 : 0.75);
  mesh.material.needsUpdate = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const shadeAngle = Math.atan2(sunRayDirection.z, sunRayDirection.x);
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, shadeAngle));
  const offset = options.sun ? THREE.MathUtils.lerp(1.6, 7.8, lowSun) * daylight : 1.6;
  const offsetX = sunRayDirection.x * offset;
  const offsetZ = sunRayDirection.z * offset;
  const stretch = options.sun ? THREE.MathUtils.lerp(1, 1.72, lowSun) : 1;
  const sizeMultiplier = options.shadeSize;

  mesh.userData.clusters.forEach((cluster, index) => {
    const strength = THREE.MathUtils.clamp(cluster.count / 14, 0.55, 1.35);
    const radius = THREE.MathUtils.clamp(cluster.radius * (1.25 + strength * 0.28), 5.5, 15);
    position.set(cluster.x + offsetX, cluster.groundY + 0.075, cluster.z + offsetZ);
    const casterScale = cluster.shadeScale ?? 1;
    scale.set(
      radius * 1.42 * stretch * sizeMultiplier * casterScale,
      radius * 0.94 * sizeMultiplier * casterScale,
      1);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(1400, 32, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: DAY_SKY_TOP.clone() },
      bottomColor: { value: DAY_SKY_HORIZON.clone() },
      sunDirection: { value: new THREE.Vector3(0.55, 0.82, -0.22).normalize() },
      sunGlowColor: { value: DAWN_SUN_GLOW.clone() },
      dawnHazeColor: { value: DAWN_HAZE.clone() },
      daylight: { value: 1 },
      dawnAmount: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDirection;
      uniform vec3 sunGlowColor;
      uniform vec3 dawnHazeColor;
      uniform float daylight;
      uniform float dawnAmount;
      varying vec3 vWorldPosition;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += noise(p) * amplitude;
          p *= 2.03;
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec3 direction = normalize(vWorldPosition);
        float h = direction.y;
        float mixValue = smoothstep(-0.08, 0.78, h);
        vec3 color = mix(bottomColor, topColor, mixValue);

        float horizon = 1.0 - smoothstep(0.0, 0.54, h);
        float sunFacing = max(dot(direction, normalize(sunDirection)), 0.0);
        float broadSunGlow = pow(sunFacing, 2.1) * horizon;
        float sunCoreGlow = pow(sunFacing, 18.0) * smoothstep(-0.12, 0.2, h);
        float dawnStrength = dawnAmount * smoothstep(-0.08, 0.38, h);
        float dayWarmth = daylight * (1.0 - smoothstep(0.2, 0.9, h)) * pow(sunFacing, 5.0);

        color = mix(color, dawnHazeColor, dawnStrength * horizon * 0.42);
        color = mix(color, sunGlowColor, dawnStrength * broadSunGlow * 0.78);
        color = mix(color, sunGlowColor, dayWarmth * 0.22);
        color += sunGlowColor * sunCoreGlow * dawnStrength * 0.2;

        vec2 skyUv = direction.xz / max(direction.y + 0.72, 0.18);
        float clouds = smoothstep(0.56, 0.82, fbm(skyUv * 2.25 + vec2(4.2, -1.7)));
        float cloudBand = smoothstep(0.08, 0.48, h) * (1.0 - smoothstep(0.84, 1.0, h));
        color = mix(color, vec3(0.78, 0.9, 1.0), clouds * cloudBand * daylight * 0.28);

        float nebula = smoothstep(0.64, 0.9, fbm(skyUv * 1.45 + vec2(-7.0, 3.5)));
        float nightSky = 1.0 - daylight;
        color = mix(color, vec3(0.5, 0.24, 0.34), nebula * nightSky * smoothstep(0.16, 0.86, h) * 0.16);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  return new THREE.Mesh(geometry, material);
}

function createStarField() {
  const count = 2600;
  const positions = new Float32Array(count * 3);
  let seed = 0x5eed1234;
  for (let i = 0; i < count; i++) {
    const theta = random01() * Math.PI * 2;
    const y = THREE.MathUtils.lerp(0.08, 0.98, random01());
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = 1160;
    positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xd8ecff,
    size: 1.55,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  return new THREE.Points(geometry, material);

  function random01() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  }
}

function createSkyDisc(color, size, opacity) {
  const texture = createDiscTexture(color, opacity);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}

function updateSkyDisc(sprite, direction, opacity, radius) {
  sprite.visible = opacity > 0.03;
  sprite.material.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
  sprite.material.needsUpdate = true;
  sprite.userData.skyDirection = direction.clone().normalize();
  sprite.userData.skyRadius = radius;
  positionSkyDisc(sprite, new THREE.Vector3());
}

function positionSkyDisc(sprite, origin) {
  const direction = sprite.userData.skyDirection;
  const radius = sprite.userData.skyRadius;
  if (!direction || !radius) {
    sprite.position.copy(origin);
    return;
  }
  sprite.position.copy(origin).add(direction.clone().multiplyScalar(radius));
}

function createDiscTexture(color, opacity) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const colorValue = new THREE.Color(color);
  const r = Math.round(colorValue.r * 255);
  const g = Math.round(colorValue.g * 255);
  const b = Math.round(colorValue.b * 255);
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 60);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
  gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${opacity * 0.58})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function normalizeTime(time) {
  if (!time) {
    return {
      dayProgress: 0.5,
      sunlightFactor: 1,
      sunDirection: { x: SUN_RAY_DIRECTION.x, y: SUN_RAY_DIRECTION.y, z: SUN_RAY_DIRECTION.z },
    };
  }
  return {
    dayProgress: THREE.MathUtils.clamp(Number(time.dayProgress ?? time.day_progress ?? 0.5), 0, 1),
    sunlightFactor: THREE.MathUtils.clamp(Number(time.sunlightFactor ?? time.sunlight_factor ?? 1), 0, 1),
    sunDirection: time.sunDirection ?? time.sun_direction ?? { x: SUN_RAY_DIRECTION.x, y: SUN_RAY_DIRECTION.y, z: SUN_RAY_DIRECTION.z },
  };
}

function sunRayVector(time) {
  const source = time.sunDirection ?? {};
  const vector = new THREE.Vector3(Number(source.x), Number(source.y), Number(source.z));
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z) || vector.lengthSq() < 0.001) {
    return SUN_RAY_DIRECTION.clone();
  }
  if (vector.y > 0) {
    vector.negate();
  }
  return vector.normalize();
}

function visualSunPosition(time) {
  const ray = sunRayVector(time);
  const horizontal = new THREE.Vector3(-ray.x, 0, -ray.z);
  if (horizontal.lengthSq() < 0.001) {
    horizontal.set(SUN_RAY_DIRECTION.x, 0, SUN_RAY_DIRECTION.z).negate();
  }
  horizontal.normalize();

  const rawElevation = Math.sin(time.dayProgress * Math.PI * 2 - Math.PI / 2);
  const daylight = visualDaylight(time.dayProgress);
  const elevation = daylight > 0.02
    ? Math.max(0.075, rawElevation)
    : Math.min(-0.075, rawElevation);
  const horizontalScale = Math.sqrt(Math.max(0, 1 - elevation * elevation));
  return horizontal.multiplyScalar(horizontalScale).setY(elevation).normalize();
}

function dawnAmount(progress) {
  const sunrise = pulse(progress, 0.25, 0.11);
  const sunset = pulse(progress, 0.75, 0.12);
  return Math.max(sunrise, sunset);
}

function visualDaylight(progress) {
  return Math.min(
    smoothstep(0.21, 0.31, progress),
    1 - smoothstep(0.72, 0.82, progress));
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function pulse(value, center, width) {
  const distance = Math.min(Math.abs(value - center), 1 - Math.abs(value - center));
  return THREE.MathUtils.clamp(1 - distance / width, 0, 1);
}

function colorForTime(nightColor, dayColor, dawnColor, daylight, dawn) {
  const base = nightColor.clone().lerp(dayColor, daylight);
  return base.lerp(dawnColor, dawn * (1 - daylight * 0.45));
}

function readRange(input, fallback) {
  const value = Number.parseFloat(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function applyMaterialLightResponse(mesh, options) {
  const time = normalizeTime(options.time);
  const daylight = visualDaylight(time.dayProgress);
  const nightGrade = THREE.MathUtils.clamp((0.72 - daylight) / 0.72, 0, 1);
  const terrainTint = DAY_TERRAIN_TINT.clone().lerp(NIGHT_TERRAIN_TINT, nightGrade * 0.72);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;
    if (material.color && material.userData?.worldviewWater !== true) {
      material.color.copy(terrainTint);
    }
    material.roughness = material.userData?.worldviewWater ? 0.38 : 0.88;
    material.metalness = 0;
    material.needsUpdate = true;
  }
}

function collectTreeShadeClusters(chunkObject) {
  chunkObject.updateMatrixWorld(true);
  const terrainHeights = collectTerrainHeights(chunkObject);
  const clusters = new Map();
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();

  chunkObject.traverse((node) => {
    if (!node.isMesh || !node.geometry || !isDetailMesh(node)) return;
    const position = node.geometry.getAttribute('position');
    if (!position) return;
    for (let i = 0; i < position.count; i += 4) {
      worldPoint.fromBufferAttribute(position, i);
      node.localToWorld(worldPoint);
      localPoint.copy(worldPoint);
      chunkObject.worldToLocal(localPoint);
      const keyX = Math.floor(localPoint.x / SHADE_CLUSTER_SIZE);
      const keyZ = Math.floor(localPoint.z / SHADE_CLUSTER_SIZE);
      const key = `${keyX}:${keyZ}`;
      const cluster = clusters.get(key) ?? {
        x: 0,
        z: 0,
        count: 0,
        minX: localPoint.x,
        maxX: localPoint.x,
        minY: localPoint.y,
        maxY: localPoint.y,
        minZ: localPoint.z,
        maxZ: localPoint.z,
      };
      cluster.x += localPoint.x;
      cluster.z += localPoint.z;
      cluster.count++;
      cluster.minX = Math.min(cluster.minX, localPoint.x);
      cluster.maxX = Math.max(cluster.maxX, localPoint.x);
      cluster.minY = Math.min(cluster.minY, localPoint.y);
      cluster.maxY = Math.max(cluster.maxY, localPoint.y);
      cluster.minZ = Math.min(cluster.minZ, localPoint.z);
      cluster.maxZ = Math.max(cluster.maxZ, localPoint.z);
      clusters.set(key, cluster);
    }
  });

  return Array.from(clusters.values())
    .filter((cluster) => cluster.count >= 4)
    .map((cluster) => {
      const x = cluster.x / cluster.count;
      const z = cluster.z / cluster.count;
      const radius = Math.max(
        cluster.maxX - cluster.minX + 3,
        cluster.maxZ - cluster.minZ + 3,
        Math.sqrt(cluster.count) * 2.2);
      const groundY = sampleGroundY(terrainHeights, x, z);
      const canopyHeight = cluster.maxY - groundY;
      const verticalSpan = cluster.maxY - cluster.minY;
      const shrubLikely = canopyHeight < 5.5 || (canopyHeight < 8 && verticalSpan < 4);
      const shadeScale = shrubLikely
        ? THREE.MathUtils.clamp((canopyHeight - 2) / 7, 0.16, 0.42)
        : 1;
      return {
        x,
        z,
        count: cluster.count,
        radius,
        groundY,
        shadeScale,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SHADES_PER_CHUNK);
}

function collectTerrainHeights(chunkObject) {
  const heights = new Map();
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  chunkObject.traverse((node) => {
    if (!node.isMesh || !node.geometry || isDetailMesh(node) || isWaterMesh(node)) return;
    const position = node.geometry.getAttribute('position');
    const normal = node.geometry.getAttribute('normal');
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      if (normal && normal.getY(i) < 0.55) continue;
      worldPoint.fromBufferAttribute(position, i);
      node.localToWorld(worldPoint);
      localPoint.copy(worldPoint);
      chunkObject.worldToLocal(localPoint);
      const key = `${Math.round(localPoint.x)}:${Math.round(localPoint.z)}`;
      heights.set(key, Math.max(heights.get(key) ?? -Infinity, localPoint.y));
    }
  });
  return heights;
}

function sampleGroundY(heights, x, z) {
  let bestY = -Infinity;
  let bestDistance = Infinity;
  const cx = Math.round(x);
  const cz = Math.round(z);
  for (let dz = -4; dz <= 4; dz++) {
    for (let dx = -4; dx <= 4; dx++) {
      const y = heights.get(`${cx + dx}:${cz + dz}`);
      if (!Number.isFinite(y)) continue;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance || (distance === bestDistance && y > bestY)) {
        bestY = y;
        bestDistance = distance;
      }
    }
  }
  return Number.isFinite(bestY) ? bestY : 100;
}

function isDetailMesh(mesh) {
  return materialsFor(mesh).some((material) => material?.name === 'worldview-detail');
}

function isWaterMesh(mesh) {
  return materialsFor(mesh).some((material) => material?.name === 'worldview-water' || material?.userData?.worldviewWater === true);
}

function materialsFor(mesh) {
  if (!mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getShadeTexture() {
  if (shadeTexture) return shadeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  gradient.addColorStop(0.46, 'rgba(0, 0, 0, 0.26)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  shadeTexture = new THREE.CanvasTexture(canvas);
  shadeTexture.name = 'worldview-tree-shade-gradient';
  return shadeTexture;
}
