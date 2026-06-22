import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chunkDistanceSq,
  chunkKeysForWorld,
  sortChunkKeysByPlayerDistance,
} from '../../../web/src/common/chunk-planning.ts';

test('plans chunk keys and player-distance ordering', () => {
  const keys = chunkKeysForWorld('default', 10, -4, 1);
  assert.equal(keys.length, 9);
  assert.deepEqual(keys[0], { chunkX: 9, chunkZ: -5, id: 'default:9:-5' });
  assert.deepEqual(keys[8], { chunkX: 11, chunkZ: -3, id: 'default:11:-3' });
  assert.equal(chunkDistanceSq(13, -2, 10, -4), 13);

  const sorted = sortChunkKeysByPlayerDistance([
    { chunkX: 2, chunkZ: 1 },
    { chunkX: 0, chunkZ: 1 },
    { chunkX: 1, chunkZ: 0 },
    { chunkX: 1, chunkZ: 2 },
  ], 1, 1);
  assert.deepEqual(sorted, [
    { chunkX: 1, chunkZ: 0 },
    { chunkX: 0, chunkZ: 1 },
    { chunkX: 2, chunkZ: 1 },
    { chunkX: 1, chunkZ: 2 },
  ]);
});
