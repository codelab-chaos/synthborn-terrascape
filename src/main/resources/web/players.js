import * as THREE from 'three';

export function createPlayerMarker(player) {
  const group = new THREE.Group();
  group.name = `player:${player.uuid}`;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24),
    new THREE.MeshStandardMaterial({
      color: 0x5ef1b5,
      emissive: 0x174234,
      roughness: 0.45,
    }),
  );
  base.name = 'player-base';
  base.position.y = 0.04;
  group.add(base);

  const avatar = new THREE.Group();
  avatar.name = 'player-facing-avatar';
  group.userData.avatar = avatar;
  group.add(avatar);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 1.28, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xf7d98c,
      emissive: 0x2e2410,
      roughness: 0.72,
    }),
  );
  legs.name = 'player-legs';
  legs.position.y = 0.68;
  avatar.add(legs);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 1.08, 0.52),
    new THREE.MeshStandardMaterial({
      color: 0xfff1a8,
      emissive: 0x3d2d12,
      roughness: 0.65,
    }),
  );
  body.name = 'player-body';
  body.position.y = 1.86;
  avatar.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff6c8,
      emissive: 0x4a3518,
      roughness: 0.58,
    }),
  );
  head.name = 'player-head';
  head.position.y = 2.64;
  avatar.add(head);

  const faceGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 24),
    new THREE.MeshBasicMaterial({
      color: 0x5bbdff,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  faceGlow.name = 'player-face-glow';
  faceGlow.position.set(0, 2.64, -0.365);
  avatar.add(faceGlow);

  const lookBeamGeometry = new THREE.CylinderGeometry(0.04, 2.25, 9.5, 32, 1, true);
  lookBeamGeometry.translate(0, -4.75, 0);
  lookBeamGeometry.rotateX(Math.PI / 2);
  const lookBeam = new THREE.Mesh(
    lookBeamGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x58cfff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  lookBeam.name = 'player-look-light-cone';
  lookBeam.position.set(0, 2.58, -0.38);
  lookBeam.renderOrder = 18;
  avatar.add(lookBeam);

  const lookLight = new THREE.SpotLight(0x66cfff, 4.8, 24, Math.PI * 0.18, 0.72, 1.2);
  lookLight.name = 'player-look-light';
  lookLight.position.set(0, 2.58, -0.38);
  lookLight.castShadow = false;
  avatar.add(lookLight);

  const lookTarget = new THREE.Object3D();
  lookTarget.name = 'player-look-light-target';
  lookTarget.position.set(0, 2.46, -8);
  avatar.add(lookTarget);
  lookLight.target = lookTarget;

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    new THREE.MeshStandardMaterial({
      color: 0x7df5cb,
      emissive: 0x1f7f6a,
      emissiveIntensity: 1.8,
      roughness: 0.35,
    }),
  );
  diamond.name = 'player-overhead-diamond';
  diamond.position.y = 3.52;
  diamond.rotation.y = Math.PI * 0.25;
  group.add(diamond);

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
