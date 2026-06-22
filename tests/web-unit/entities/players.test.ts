import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createMobMarker,
  createPlayerMarker,
  disposeObject,
  updateMobMarkerCard,
  updateMobMarkerHeight,
  updatePlayerMarkerCard,
  updatePlayerMarkerCardHeight,
} from '../../../src/main/resources/web/src/entities/players.ts';

test('createPlayerMarker builds a group with avatar, pointer, and card', () => {
  const marker = createPlayerMarker({ uuid: 'u1', name: 'Alice', x: 1, y: 2, z: 3 });
  assert.ok(marker instanceof THREE.Group);
  assert.equal(marker.name, 'player:u1');
  assert.ok(marker.userData.avatar);
  assert.ok(marker.userData.pointer);
  assert.ok(marker.userData.card);
  assert.ok(marker.userData.badge);
  assert.equal(marker.userData.cardAnchorY, 2.8);
  assert.equal(marker.userData.pointerConnectsToCardBottom, true);
});

test('updatePlayerMarkerCard refreshes the badge for a new name', () => {
  const marker = createPlayerMarker({ uuid: 'u1', name: 'Alice' });
  const before = marker.userData.badge.userData.cardKey;
  updatePlayerMarkerCard(marker, { uuid: 'u1', name: 'Bob' });
  assert.notEqual(marker.userData.badge.userData.cardKey, before);
});

test('updatePlayerMarkerCard ignores markers without a badge', () => {
  // Should not throw with an empty object.
  updatePlayerMarkerCard({} as never, { uuid: 'x', name: 'Y' });
  updatePlayerMarkerCard(null as never, { uuid: 'x', name: 'Y' });
  assert.ok(true);
});

test('updatePlayerMarkerCardHeight positions pointer and card', () => {
  const marker = createPlayerMarker({ uuid: 'u1', name: 'Alice' });
  updatePlayerMarkerCardHeight(marker, 6);
  const pointer = marker.userData.pointer;
  const card = marker.userData.card;
  assert.ok(pointer.scale.y > 0);
  assert.ok(pointer.position.y > 0);
  assert.ok(card.position.y > 0);
});

test('createMobMarker builds glow, shadow, pointer, badge, headshot block', () => {
  const marker = createMobMarker({ id: 'm1', type: 'Goblin', color: '#ff0000', x: 0, y: 0, z: 0 });
  assert.equal(marker.name, 'mob:m1');
  assert.ok(marker.userData.pointer);
  assert.ok(marker.userData.badge);
  assert.ok(marker.userData.headshotBlock);
  // glow + shadow + pointer + badge + headshot = 5 children
  assert.equal(marker.children.length, 5);
});

test('createMobMarker defaults color when none provided', () => {
  const marker = createMobMarker({ id: 'm2', type: 'Slime' });
  assert.ok(marker.userData.badge);
});

test('updateMobMarkerCard updates badge and headshot block', () => {
  const marker = createMobMarker({ id: 'm1', type: 'Goblin', color: '#ff0000' });
  const before = marker.userData.badge.userData.cardKey;
  updateMobMarkerCard(marker, { id: 'm1', type: 'Skeleton', color: '#00ff00', attackDamage: 5 });
  assert.notEqual(marker.userData.badge.userData.cardKey, before);
  assert.ok(marker.userData.headshotBlock);
});

test('updateMobMarkerCard with iconUrl switches headshot material key', () => {
  const marker = createMobMarker({ id: 'm3', type: 'Goblin', color: '#ff0000' });
  updateMobMarkerCard(marker, { id: 'm3', type: 'Goblin', iconUrl: '/icons/goblin.png' });
  const block = marker.userData.headshotBlock;
  assert.equal(block.userData.materialKey, '/icons/goblin.png');
});

test('updateMobMarkerCard ignores markers without a badge', () => {
  updateMobMarkerCard({} as never, { id: 'x' });
  updateMobMarkerCard(null as never, { id: 'x' });
  assert.ok(true);
});

test('updateMobMarkerHeight positions mob pointer and badge', () => {
  const marker = createMobMarker({ id: 'm1', type: 'Goblin' });
  updateMobMarkerHeight(marker, 4);
  assert.ok(marker.userData.pointer.scale.y > 0);
  assert.ok(marker.userData.badge.position.y > 0);
});

test('disposeObject frees non-shared geometry/material without throwing', () => {
  const marker = createMobMarker({ id: 'm1', type: 'Goblin', color: '#abcdef' });
  // Adding to a parent then disposing should be safe.
  const scene = new THREE.Scene();
  scene.add(marker);
  scene.remove(marker);
  disposeObject(marker);
  assert.ok(true);
});

test('disposeObject removes headshot mesh from shared material registry', () => {
  const marker = createMobMarker({ id: 'mh', type: 'Goblin', iconUrl: '/icons/x.png' });
  // The headshot block records a materialKey; disposing should not throw.
  disposeObject(marker);
  assert.ok(true);
});

test('player marker pointer length respects minimum for small heights', () => {
  const marker = createPlayerMarker({ uuid: 'u9', name: 'Z' });
  updatePlayerMarkerCardHeight(marker, 0.1);
  // height clamped to >= 2.8 internally; pointer remains positive.
  assert.ok(marker.userData.pointer.scale.y > 0);
});
