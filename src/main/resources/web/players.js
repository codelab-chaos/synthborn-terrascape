import * as THREE from 'three';

export function createPlayerMarker(player) {
  const group = new THREE.Group();
  group.name = `player:${player.uuid}`;

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24),
    new THREE.MeshStandardMaterial({
      color: 0x5ef1b5,
      emissive: 0x174234,
      roughness: 0.45,
    }),
  );
  ring.position.y = -1.75;
  group.add(ring);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 1.15, 4, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfff1a8,
      emissive: 0x4c3714,
      roughness: 0.65,
    }),
  );
  body.position.y = -0.75;
  group.add(body);

  const heading = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.72, 16),
    new THREE.MeshStandardMaterial({
      color: 0x72c7ff,
      emissive: 0x153a5a,
      roughness: 0.5,
    }),
  );
  heading.position.set(0, -0.7, -0.82);
  heading.rotation.x = Math.PI * 0.5;
  group.add(heading);

  return group;
}

export function createMobMarker(mob) {
  const group = new THREE.Group();
  group.name = `mob:${mob.id}`;

  const color = new THREE.Color(mob.color || '#ff6f91');
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 22, 14),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.32),
      roughness: 0.55,
    }),
  );
  body.position.y = 1.15;
  body.renderOrder = 20;
  group.add(body);

  const label = createTextLabel(shortMobLabel(mob.label || mob.type || 'Mob'), color);
  label.position.y = 3.1;
  group.add(label);

  return group;
}

function shortMobLabel(text) {
  return String(text)
    .replace(/^NPC_/, '')
    .replace(/_Wander$/i, '')
    .replace(/_Fighter$/i, '')
    .replace(/_+/g, ' ')
    .trim()
    .slice(0, 18) || 'Mob';
}

function createTextLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '800 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const measured = ctx.measureText(text);
  const backgroundWidth = Math.min(canvas.width - 12, measured.width + 30);
  ctx.fillStyle = 'rgba(8, 12, 16, 0.72)';
  roundRect(ctx, (canvas.width - backgroundWidth) / 2, 10, backgroundWidth, 44, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(8, 12, 16, 0.95)';
  ctx.lineWidth = 5;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 3, 1);
  sprite.renderOrder = 30;
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose();
      }
    }
  });
}
