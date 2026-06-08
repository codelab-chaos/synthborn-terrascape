import * as THREE from 'three';

const CHUNK_SIZE = 32;

export type MapTileLayer = {
  mesh: THREE.InstancedMesh;
  chunkToIndex: Map<string, number>;
  cells: { chunkX: number; chunkZ: number }[];
  visibleCount: number;
};

type CreateMapTileLayerOptions = {
  texture: THREE.Texture;
  textureMinX: number;
  textureMinZ: number;
  textureWorldSize: number;
  centerX: number;
  centerZ: number;
  displayRadius: number;
  coveredChunks: Set<string>;
  backdropY: number;
  maxAnisotropy: number;
};

const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
const visibleMatrix = new THREE.Matrix4();
const visiblePosition = new THREE.Vector3();
const visibleQuaternion = new THREE.Quaternion();
const visibleScale = new THREE.Vector3(1, 1, 1);

function createMapTileMaterial(
  texture: THREE.Texture,
  textureMinX: number,
  textureMinZ: number,
  textureWorldSize: number,
  maxAnisotropy: number,
) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.needsUpdate = true;

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      textureMinX: { value: textureMinX },
      textureMinZ: { value: textureMinZ },
      textureWorldSize: { value: textureWorldSize },
      opacity: { value: 0.98 },
    },
    vertexShader: `
      varying vec2 vMapUv;
      uniform float textureMinX;
      uniform float textureMinZ;
      uniform float textureWorldSize;
      void main() {
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vMapUv = vec2(
          (worldPos.x - textureMinX) / textureWorldSize,
          1.0 - (worldPos.z - textureMinZ) / textureWorldSize
        );
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      varying vec2 vMapUv;
      void main() {
        if (vMapUv.x < 0.0 || vMapUv.x > 1.0 || vMapUv.y < 0.0 || vMapUv.y > 1.0) {
          discard;
        }
        vec4 color = texture2D(map, vMapUv);
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
}

function chunkKey(chunkX: number, chunkZ: number) {
  return `${chunkX}:${chunkZ}`;
}

export function setMapTileMatrix(
  layer: MapTileLayer,
  index: number,
  chunkX: number,
  chunkZ: number,
  y: number,
) {
  visiblePosition.set(
    chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
    y,
    chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
  );
  visibleMatrix.compose(visiblePosition, visibleQuaternion, visibleScale);
  layer.mesh.setMatrixAt(index, visibleMatrix);
}

export function hideMapTile(layer: MapTileLayer, index: number) {
  layer.mesh.setMatrixAt(index, hiddenMatrix);
}

function setVisibleMatrix(chunkX: number, chunkZ: number, backdropY: number) {
  visiblePosition.set(
    chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
    backdropY,
    chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2,
  );
  visibleMatrix.compose(visiblePosition, visibleQuaternion, visibleScale);
  return visibleMatrix;
}

export function createMapTileLayer(options: CreateMapTileLayerOptions): MapTileLayer {
  const {
    texture,
    textureMinX,
    textureMinZ,
    textureWorldSize,
    centerX,
    centerZ,
    displayRadius,
    coveredChunks,
    backdropY,
    maxAnisotropy,
  } = options;

  const cells: { chunkX: number; chunkZ: number }[] = [];
  const chunkToIndex = new Map<string, number>();
  for (let chunkZ = centerZ - displayRadius; chunkZ <= centerZ + displayRadius; chunkZ += 1) {
    for (let chunkX = centerX - displayRadius; chunkX <= centerX + displayRadius; chunkX += 1) {
      const index = cells.length;
      cells.push({ chunkX, chunkZ });
      chunkToIndex.set(chunkKey(chunkX, chunkZ), index);
    }
  }

  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  geometry.rotateX(-Math.PI / 2);
  const material = createMapTileMaterial(
    texture,
    textureMinX,
    textureMinZ,
    textureWorldSize,
    maxAnisotropy,
  );
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  mesh.name = 'terrascape-map-backdrop';
  // Neutral order: terrain depth buffer occludes distant map cells behind hills.
  mesh.renderOrder = 0;
  mesh.frustumCulled = false;

  cells.forEach((cell, index) => {
    mesh.setMatrixAt(index, hiddenMatrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  const visibleCount = 0;

  return {
    mesh,
    chunkToIndex,
    cells,
    visibleCount,
  };
}

export function syncMapTileCoverage(
  layer: MapTileLayer,
  coveredChunks: Set<string>,
  backdropY: number,
  skipIndices?: Set<number>,
) {
  let visibleCount = 0;
  layer.cells.forEach((cell, index) => {
    if (coveredChunks.has(chunkKey(cell.chunkX, cell.chunkZ))) {
      layer.mesh.setMatrixAt(index, hiddenMatrix);
      return;
    }
    if (skipIndices?.has(index)) {
      visibleCount += 1;
      return;
    }
    layer.mesh.setMatrixAt(index, setVisibleMatrix(cell.chunkX, cell.chunkZ, backdropY));
    visibleCount += 1;
  });
  layer.mesh.instanceMatrix.needsUpdate = true;
  layer.visibleCount = visibleCount;
  return visibleCount;
}

export function disposeMapTileLayer(layer: MapTileLayer | null) {
  if (!layer) return;
  layer.mesh.geometry?.dispose();
  const material = layer.mesh.material as THREE.ShaderMaterial;
  material.uniforms.map?.value?.dispose?.();
  material.dispose();
  layer.mesh.dispose();
}
