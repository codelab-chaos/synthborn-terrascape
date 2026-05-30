import * as THREE from 'three';

export function createChunkDebug(chunkX, chunkZ, chunkObject) {
  const bounds = new THREE.Box3().setFromObject(chunkObject);
  const minY = Number.isFinite(bounds.min.y) ? bounds.min.y : 100;
  const maxY = Number.isFinite(bounds.max.y) ? bounds.max.y : 132;
  const highY = maxY + 0.35;
  const lowY = Math.min(minY, maxY - 1);

  const corners = [
    [0, lowY, 0], [32, lowY, 0], [32, lowY, 32], [0, lowY, 32],
    [0, highY, 0], [32, highY, 0], [32, highY, 32], [0, highY, 32],
  ];
  const edgeIndices = [
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7,
  ];
  const positions = [];
  for (const index of edgeIndices) {
    positions.push(...corners[index]);
  }

  const group = new THREE.Group();
  group.name = `debug:${chunkX}:${chunkZ}`;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x84f5c3,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 20;
  group.add(lines);

  const label = makeChunkLabel(`${chunkX}, ${chunkZ}`);
  label.position.set(16, highY + 4, 16);
  group.add(label);

  return group;
}

function makeChunkLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 40;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(10, 16, 18, 0.78)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(132, 245, 195, 0.85)';
  context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  context.fillStyle = '#d9fff0';
  context.font = '700 18px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(24, 7.5, 1);
  sprite.renderOrder = 21;
  return sprite;
}
