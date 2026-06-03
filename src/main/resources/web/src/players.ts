import * as THREE from 'three';
import { createMobBadge, updateMobBadge } from './mob-card.js';
import { clamp } from './utils.js';

const PLAYER_HEAD_TOP_Y = 2.8;
const PLAYER_CARD_POINTER_MIN_LENGTH = 0.9;
const CARD_POINTER_CARD_OVERLAP = 0.08;
const MOB_POINTER_ANCHOR_Y = 0.65;
const PLAYER_CARD_COLOR = new THREE.Color(0x5ef1b5);

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
  updateMobMarkerHeight(group, 3.4);

  return group;
}

export function updateMobMarkerCard(marker, mob) {
  if (!marker?.userData?.badge) return;
  updateMobBadge(marker.userData.badge, mob);
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
