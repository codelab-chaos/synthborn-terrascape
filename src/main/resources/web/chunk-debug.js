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
    color: 0x26383b,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 20;
  group.add(lines);

  const label = makeCornerLabel(`${chunkX}, ${chunkZ}`);
  label.position.set(23.3, highY + 0.04, 28.1);
  group.add(label);

  return group;
}

function makeCornerLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(38, 48, 52, 0.82)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(238, 243, 245, 0.52)';
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  context.fillStyle = '#f4f7f8';
  context.font = '800 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 4.8), material);
  label.name = 'debug-corner-label';
  label.rotation.x = -Math.PI / 2;
  label.renderOrder = 21;
  return label;
}
