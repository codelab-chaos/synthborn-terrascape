import * as THREE from 'three';
import { createMobBadge, updateMobBadge } from './mob-card.ts';
import { clamp } from '../common/utils.ts';

const PLAYER_HEAD_TOP_Y = 2.8;
const PLAYER_CARD_POINTER_MIN_LENGTH = 0.9;
const CARD_POINTER_CARD_OVERLAP = 0.08;
const MOB_POINTER_ANCHOR_Y = 0.65;
const MOB_HEADSHOT_BLOCK_HEIGHT = 2.3;
const MOB_HEADSHOT_BLOCK_MIN_SIZE = 0.2;
const MOB_HEADSHOT_BLOCK_MAX_SIZE = 3.3;
const MOB_HEADSHOT_BLOCK_PIXEL_PADDING = 1;
const MOB_HEADSHOT_IMAGE_TINT = 0xffffff;
const PLAYER_CARD_COLOR = new THREE.Color(0x5ef1b5);
const fallbackMobHeadshotGeometry = createMobHeadshotGeometry({ width: 1, height: 1 });
const mobHeadshotTextureLoader = new THREE.TextureLoader();
const mobHeadshotMaterials = new Map();

export function createPlayerMarker(player) {
  const group = new THREE.Group();
  group.name = `player:${player.uuid}`;

  const avatar = createPlayerAvatar();
  group.userData.avatar = avatar;
  group.add(avatar);

  const pointer = createPointer(PLAYER_CARD_COLOR, 'player-card-pointer', 36);
  group.userData.pointer = pointer;
  group.userData.cardPointer = pointer;
  group.userData.cardAnchorY = PLAYER_HEAD_TOP_Y;
  group.userData.minCardPointerLength = PLAYER_CARD_POINTER_MIN_LENGTH;
  group.userData.pointerConnectsToCardBottom = true;
  group.add(pointer);

  const card = createMobBadge(playerCardData(player), PLAYER_CARD_COLOR);
  card.name = 'player-card';
  card.renderOrder = 38;
  group.userData.badge = card;
  group.userData.card = card;
  group.add(card);
  updatePlayerMarkerCard(group, player);
  updatePlayerMarkerCardHeight(group, 4.35);

  return group;
}

export function updatePlayerMarkerCard(marker, player) {
  if (!marker?.userData?.badge) return;
  updateMobBadge(marker.userData.badge, playerCardData(player));
}

export function updatePlayerMarkerCardHeight(marker, cardHeight) {
  updateMarkerCardHeight(marker, cardHeight);
}

export function createMobMarker(mob) {
  const group = new THREE.Group();
  group.name = `mob:${mob.id}`;

  const color = new THREE.Color(mob.color || '#ff6f91');
  group.add(createGroundGlow(color));
  group.add(createGroundShadow());

  const stem = createPointer(color, 'mob-pointer', 32);
  group.userData.pointer = stem;
  group.add(stem);

  const badge = createMobBadge(mob, color);
  badge.name = 'mob-card';
  badge.renderOrder = 35;
  group.userData.badge = badge;
  group.add(badge);
  const headshotBlock = createMobHeadshotBlock(mob);
  group.userData.headshotBlock = headshotBlock;
  group.add(headshotBlock);
  updateMobMarkerHeight(group, 3.4);

  return group;
}

export function updateMobMarkerCard(marker, mob) {
  if (!marker?.userData?.badge) return;
  updateMobBadge(marker.userData.badge, mob);
  updateMobHeadshotBlock(marker, mob);
}

export function updateMobMarkerHeight(marker, cardHeight) {
  updateMarkerCardHeight(marker, cardHeight);
}

function createPlayerAvatar() {
  const avatar = new THREE.Group();
  avatar.name = 'player-facing-avatar';

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 1.28, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x5f666b,
      emissive: 0x15181a,
      roughness: 0.72,
    }),
  );
  legs.name = 'player-legs';
  legs.position.y = 0.68;
  avatar.add(legs);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.78, 0.52),
    new THREE.MeshStandardMaterial({
      color: 0x9da5aa,
      emissive: 0x24282b,
      roughness: 0.65,
    }),
  );
  body.name = 'player-body';
  body.position.y = 1.68;
  avatar.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf5f7f7,
      emissive: 0x34393a,
      roughness: 0.58,
    }),
  );
  head.name = 'player-head';
  head.position.y = 2.43;
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
  faceGlow.position.set(0, 2.43, -0.365);
  avatar.add(faceGlow);

  const lookLight = new THREE.SpotLight(0x66cfff, 4.8, 24, Math.PI * 0.18, 0.72, 1.2);
  lookLight.name = 'player-look-light';
  lookLight.position.set(0, 2.39, -0.38);
  lookLight.castShadow = false;
  avatar.add(lookLight);

  const lookTarget = new THREE.Object3D();
  lookTarget.name = 'player-look-light-target';
  lookTarget.position.set(0, 2.31, -8);
  avatar.add(lookTarget);
  lookLight.target = lookTarget;

  return avatar;
}

function createGroundGlow(color) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.25, 36),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadow.name = 'mob-ground-glow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.renderOrder = 18;
  return shadow;
}

function createGroundShadow() {
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 28),
    new THREE.MeshBasicMaterial({
      color: 0x07100c,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  contact.name = 'mob-ground-shadow';
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.055;
  contact.renderOrder = 19;
  return contact;
}

function createMobHeadshotBlock(mob) {
  const entry = mobHeadshotResource(mob);
  const mesh = new THREE.Mesh(entry.geometry, entry.materials);
  mesh.name = 'mob-headshot-block';
  mesh.renderOrder = 20;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.terrascapeMobHeadshot = true;
  updateMobHeadshotBlockMesh(mesh, mob);
  return mesh;
}

function updateMobHeadshotBlock(marker, mob) {
  let block = marker.userData.headshotBlock;
  if (!block) {
    block = createMobHeadshotBlock(mob);
    marker.userData.headshotBlock = block;
    marker.add(block);
    return;
  }
  const materialKey = mobHeadshotMaterialKey(mob);
  if (block.userData.materialKey !== materialKey) {
    const entry = mobHeadshotResource(mob);
    block.geometry = entry.geometry;
    block.material = entry.materials;
  }
  updateMobHeadshotBlockMesh(block, mob);
}

function updateMobHeadshotBlockMesh(mesh, mob) {
  const materialKey = mobHeadshotMaterialKey(mob);
  if (mesh.userData.materialKey && mesh.userData.materialKey !== materialKey) {
    mobHeadshotMaterials.get(mesh.userData.materialKey)?.meshes.delete(mesh);
  }
  const entry = mobHeadshotMaterials.get(materialKey);
  mesh.userData.materialKey = materialKey;
  mesh.userData.mob = { ...mob };
  entry?.meshes.add(mesh);
  mesh.geometry = entry?.geometry ?? fallbackMobHeadshotGeometry;
  mesh.scale.set(1, 1, 1);
  positionMobHeadshotBlock(mesh);
}

function mobHeadshotMaterialKey(mob) {
  return typeof mob?.iconUrl === 'string' && mob.iconUrl ? mob.iconUrl : `color:${mob?.color ?? 'default'}`;
}

function mobHeadshotResource(mob) {
  const key = mobHeadshotMaterialKey(mob);
  const existing = mobHeadshotMaterials.get(key);
  if (existing) return existing;

  const fallbackMaterial = sharedMobHeadshotSideMaterial(mob?.color);
  const capMaterial = sharedMobHeadshotCapMaterial(mob?.color);
  const materials = mobHeadshotFaceMaterials(fallbackMaterial, capMaterial);
  const entry = {
    aspect: 1,
    geometry: fallbackMobHeadshotGeometry,
    materials,
    meshes: new Set(),
  };
  mobHeadshotMaterials.set(key, entry);

  const iconUrl = typeof mob?.iconUrl === 'string' ? mob.iconUrl : '';
  if (iconUrl) {
    mobHeadshotTextureLoader.load(
      iconUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.userData.terrascapeShared = true;
        const image = texture.image;
        const imageWidth = image?.width ?? 1;
        const imageHeight = image?.height ?? 1;
        const iconBounds = mobHeadshotIconBounds(image);
        const cropBounds = paddedMobHeadshotBounds(iconBounds, imageWidth, imageHeight);
        applyMobHeadshotTextureCrop(texture, cropBounds, imageWidth, imageHeight);
        const aspect = cropBounds.width && cropBounds.height ? cropBounds.width / cropBounds.height : 1;
        entry.aspect = aspect;
        entry.geometry = createMobHeadshotGeometry(cropBounds, imageWidth, imageHeight);
        const imageMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: MOB_HEADSHOT_IMAGE_TINT,
          transparent: true,
          opacity: 1,
          depthWrite: true,
        });
        imageMaterial.userData.terrascapeShared = true;
        entry.materials = mobHeadshotFaceMaterials(imageMaterial, capMaterial);
        for (const mesh of entry.meshes) {
          if (mesh.userData.materialKey !== key) continue;
          mesh.geometry = entry.geometry;
          mesh.material = entry.materials;
          positionMobHeadshotBlock(mesh);
        }
      },
      undefined,
      () => {
        entry.meshes.clear();
      },
    );
  }

  return entry;
}

function createMobHeadshotGeometry(bounds, imageWidth = bounds?.width, imageHeight = bounds?.height) {
  const safeWidth = Math.max(1, Number(bounds?.width) || 1);
  const safeHeight = Math.max(1, Number(bounds?.height) || 1);
  const sourceHeight = Math.max(1, Number(imageHeight) || safeHeight);
  const pixelWorldSize = MOB_HEADSHOT_BLOCK_HEIGHT / sourceHeight;
  const width = clamp(safeWidth * pixelWorldSize, MOB_HEADSHOT_BLOCK_MIN_SIZE, MOB_HEADSHOT_BLOCK_MAX_SIZE);
  const height = clamp(safeHeight * pixelWorldSize, MOB_HEADSHOT_BLOCK_MIN_SIZE, MOB_HEADSHOT_BLOCK_HEIGHT);
  const depth = width;
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.userData.terrascapeShared = true;
  geometry.userData.mobHeadshotSize = {
    imageWidth: Math.max(1, Number(imageWidth) || safeWidth),
    imageHeight: sourceHeight,
    cropX: Math.max(0, Number(bounds?.x) || 0),
    cropY: Math.max(0, Number(bounds?.y) || 0),
    cropWidth: safeWidth,
    cropHeight: safeHeight,
    width,
    height,
    depth,
  };
  return geometry;
}

function positionMobHeadshotBlock(mesh) {
  const height = Number(mesh.geometry?.userData?.mobHeadshotSize?.height) || MOB_HEADSHOT_BLOCK_HEIGHT;
  mesh.position.set(0, 0.12 + height / 2, 0);
}

function mobHeadshotIconBounds(image) {
  const width = Math.max(1, Number(image?.width) || 1);
  const height = Math.max(1, Number(image?.height) || 1);
  const fallback = { x: 0, y: 0, width, height };
  if (!image || typeof document === 'undefined') return fallback;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return fallback;
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  } catch {
    return fallback;
  }
}

function paddedMobHeadshotBounds(bounds, imageWidth, imageHeight) {
  const width = Math.max(1, Number(imageWidth) || 1);
  const height = Math.max(1, Number(imageHeight) || 1);
  const x = Math.max(0, Math.floor(bounds.x) - MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
  const y = Math.max(0, Math.floor(bounds.y) - MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
  const right = Math.min(width, Math.ceil(bounds.x + bounds.width) + MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
  const bottom = Math.min(height, Math.ceil(bounds.y + bounds.height) + MOB_HEADSHOT_BLOCK_PIXEL_PADDING);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function applyMobHeadshotTextureCrop(texture, bounds, imageWidth, imageHeight) {
  const width = Math.max(1, Number(imageWidth) || 1);
  const height = Math.max(1, Number(imageHeight) || 1);
  texture.offset.set(bounds.x / width, 1 - ((bounds.y + bounds.height) / height));
  texture.repeat.set(bounds.width / width, bounds.height / height);
  texture.needsUpdate = true;
}

function sharedMobHeadshotSideMaterial(color) {
  const baseColor = new THREE.Color(color || '#1a2325');
  const material = new THREE.MeshBasicMaterial({
    color: baseColor.multiplyScalar(0.32),
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  material.userData.terrascapeShared = true;
  return material;
}

function sharedMobHeadshotCapMaterial(color) {
  const baseColor = new THREE.Color(color || '#1a2325');
  const material = new THREE.MeshBasicMaterial({
    color: baseColor.multiplyScalar(0.18),
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  material.userData.terrascapeShared = true;
  return material;
}

function mobHeadshotFaceMaterials(sideMaterial, capMaterial) {
  // BoxGeometry material order: +x, -x, +y, -y, +z, -z.
  // The four vertical sides carry the mob image; top and bottom stay dark glass.
  return [sideMaterial, sideMaterial, capMaterial, capMaterial, sideMaterial, sideMaterial];
}

function createPointer(color, name, renderOrder) {
  const pointer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.09, 1, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    }),
  );
  pointer.name = name;
  pointer.renderOrder = renderOrder;
  return pointer;
}

function playerCardData(player) {
  return {
    id: player?.uuid ?? 'player',
    type: 'Player',
    label: player?.name ?? 'Player',
    iconUrl: typeof player?.avatarUrl === 'string' ? player.avatarUrl : '',
    color: `#${PLAYER_CARD_COLOR.getHexString()}`,
    playerCard: true,
    hideStats: true,
  };
}

function updateMarkerCardHeight(marker, cardHeight) {
  const pointer = marker?.userData?.pointer;
  const card = marker?.userData?.badge;
  if (!pointer || !card) return;
  const cardHalfHeight = Math.max(0, card.scale?.y ?? 0) / 2;
  const anchorY = Number.isFinite(marker.userData.cardAnchorY)
    ? marker.userData.cardAnchorY
    : MOB_POINTER_ANCHOR_Y;
  const minPointerLength = Number.isFinite(marker.userData.minCardPointerLength)
    ? marker.userData.minCardPointerLength
    : 0.8;
  const connectsToCardBottom = marker.userData.pointerConnectsToCardBottom === true;
  const minimumHeight = connectsToCardBottom
    ? anchorY + minPointerLength + cardHalfHeight
    : anchorY + minPointerLength;
  const height = clamp(Math.max(cardHeight, minimumHeight), 2.8, 24);
  const pointerTopY = connectsToCardBottom
    ? height - cardHalfHeight + CARD_POINTER_CARD_OVERLAP
    : height;
  const pointerLength = Math.max(minPointerLength, pointerTopY - anchorY);
  pointer.scale.y = pointerLength;
  pointer.position.y = anchorY + pointerLength / 2;
  card.position.y = height;
}

export function disposeObject(root) {
  root.traverse((object) => {
    if (object.userData?.terrascapeMobHeadshot && object.userData.materialKey) {
      mobHeadshotMaterials.get(object.userData.materialKey)?.meshes.delete(object);
    }
    if (object.geometry && object.geometry.userData?.terrascapeShared !== true) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.userData?.terrascapeShared === true) continue;
        for (const value of Object.values(material)) {
          if (value?.isTexture && value.userData?.terrascapeShared !== true) value.dispose();
        }
        material.dispose();
      }
    }
  });
}
