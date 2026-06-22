import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createMobBadge,
  updateMobBadge,
} from '../../../web/src/entities/mob-card.ts';

const color = new THREE.Color('#ff6f91');

test('createMobBadge returns a sprite with canvas/ctx/texture userData', () => {
  const sprite = createMobBadge({ label: 'Goblin', type: 'Goblin' }, color);
  assert.ok(sprite instanceof THREE.Sprite);
  assert.ok(sprite.userData.canvas);
  assert.ok(sprite.userData.ctx);
  assert.ok(sprite.userData.texture);
  assert.equal(sprite.userData.colorHex, `#${color.getHexString()}`);
  // mob (non-player) badge scale
  assert.equal(sprite.scale.x, 3.6);
  assert.equal(sprite.scale.y, 4.8);
  assert.ok(sprite.userData.cardKey);
});

test('updateMobBadge with same data is a no-op (cardKey unchanged)', () => {
  const sprite = createMobBadge({ label: 'Goblin', count: 1 }, color);
  const key = sprite.userData.cardKey;
  updateMobBadge(sprite, { label: 'Goblin', count: 1 });
  assert.equal(sprite.userData.cardKey, key);
});

test('updateMobBadge updates the card when data changes', () => {
  const sprite = createMobBadge({ label: 'Goblin', count: 1 }, color);
  const key = sprite.userData.cardKey;
  updateMobBadge(sprite, {
    label: 'Skeleton',
    count: 4,
    attackDamage: 8,
    hp: 20,
  });
  assert.notEqual(sprite.userData.cardKey, key);
  assert.equal(sprite.userData.iconUrl, '');
});

test('playerCard scale uses player badge dimensions', () => {
  const sprite = createMobBadge({ label: 'Alice', playerCard: true }, color);
  assert.equal(sprite.scale.x, 4.8);
  assert.equal(sprite.scale.y, 6.4);
});

test('hideStats suppresses stat pills without throwing', () => {
  const sprite = createMobBadge(
    { label: 'Alice', playerCard: true, hideStats: true, attackDamage: 5, hp: 30, count: 3 },
    color,
  );
  assert.ok(sprite.userData.cardKey.includes('true'));
});

test('updateMobBadge with iconUrl registers an async image load', () => {
  const sprite = createMobBadge({ label: 'Goblin' }, color);
  updateMobBadge(sprite, { label: 'Goblin', iconUrl: '/icons/goblin.png' });
  assert.equal(sprite.userData.iconUrl, '/icons/goblin.png');
  // image not yet loaded
  assert.equal(sprite.userData.iconImage, null);
});

test('second sprite reuses pending icon cache entry', () => {
  const a = createMobBadge({ label: 'A' }, color);
  const b = createMobBadge({ label: 'B' }, color);
  const url = '/icons/shared-pending.png';
  updateMobBadge(a, { label: 'A', iconUrl: url });
  updateMobBadge(b, { label: 'B', iconUrl: url });
  assert.equal(a.userData.iconUrl, url);
  assert.equal(b.userData.iconUrl, url);
});

test('mob badge draws long labels and count badge without throwing', () => {
  const sprite = createMobBadge(
    {
      label: 'NPC_Very_Long_Creature_Name_Wander',
      type: 'NPC_Very_Long_Creature_Name_Wander',
      count: 12,
      attackDamage: 14,
      hp: 99,
    },
    color,
  );
  assert.ok(sprite.userData.texture.needsUpdate === true || sprite.userData.cardKey);
});

test('mob badge handles missing label/type falling back to "Mob"', () => {
  const sprite = createMobBadge({}, color);
  assert.ok(sprite.userData.cardKey);
  assert.ok(sprite instanceof THREE.Sprite);
});

test('mob badge handles string (non-numeric) stat values', () => {
  const sprite = createMobBadge(
    { label: 'Boss', attackDamage: 'heavy', hp: 'full', count: 2 },
    color,
  );
  // changing stats forces a redraw; assert key reflects values
  assert.ok(sprite.userData.cardKey.includes('heavy'));
});
