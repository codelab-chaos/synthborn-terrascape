import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compactMobSourceStats,
  compactObject,
  nearestMobsForSample,
  summarizeItems,
} from '../../../src/main/resources/web/src/common/entity-summary.ts';

test('summarizes entity samples for telemetry', () => {
  const mobs = [
    { type: 'Wolf', label: 'Wolf', category: 'passive', source: 'A', x: 10.04, y: 64, z: 10 },
    { type: 'Wolf', label: 'Wolf', category: 'passive', source: 'A', x: 30, y: 64, z: 10 },
    { type: 'Skeleton', label: 'Skeleton', category: 'hostile', source: 'B', x: 11, y: 64, z: 13 },
  ];
  assert.equal(summarizeItems(mobs, (mob) => mob.type), 'Wolf=2|Skeleton=1');
  assert.deepEqual(compactObject({ a: 1, b: '', c: null, d: undefined, e: 'ok' }), { a: 1, e: 'ok' });
  assert.deepEqual(compactMobSourceStats({
    source: 'EntityViewerVisible=4',
    chunks: 3,
    accepted: 2,
    nonMob: 1,
    skippedTypes: { Projectile: 4, BlockEntity: 2, Empty: 0 },
  }), {
    source: 'EntityViewerVisible=4',
    chunks: 3,
    accepted: 2,
    nonMob: 1,
    skippedTypes: 'Projectile=4|BlockEntity=2',
  });
  assert.deepEqual(nearestMobsForSample(mobs, { x: 10, y: 64, z: 10 }, 2), [
    {
      type: 'Wolf',
      label: 'Wolf',
      category: 'passive',
      source: 'A',
      x: 10,
      y: 64,
      z: 10,
      d: 0,
    },
    {
      type: 'Skeleton',
      label: 'Skeleton',
      category: 'hostile',
      source: 'B',
      x: 11,
      y: 64,
      z: 13,
      d: 3,
    },
  ]);
});
