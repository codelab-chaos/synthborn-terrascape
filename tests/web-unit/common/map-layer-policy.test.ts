import assert from 'node:assert/strict';
import test from 'node:test';

import {
  horizonMapKeys,
  mapBackdropCenterFrom,
  mapBackdropRetainStats,
  mapTileLayerKey,
  parseCenterId,
} from '../../../src/main/resources/web/src/common/map-layer-policy.ts';

test('computes map layer policy', () => {
  assert.deepEqual(parseCenterId('default:12:-4'), { chunkX: 12, chunkZ: -4 });
  assert.deepEqual(parseCenterId('world:with:colon:-2:9'), { chunkX: -2, chunkZ: 9 });
  assert.equal(parseCenterId('invalid'), null);
  assert.deepEqual(mapBackdropCenterFrom('default:7:8', 1, 2), { chunkX: 7, chunkZ: 8 });
  assert.deepEqual(mapBackdropCenterFrom(null, -3, 4), { chunkX: -3, chunkZ: 4 });
  assert.deepEqual(mapBackdropCenterFrom(null, Number.NaN, 4), { chunkX: 0, chunkZ: 0 });
  assert.equal(mapTileLayerKey('default', { chunkX: 7, chunkZ: 8 }, 10, true), 'default:7:8:10:true');
  assert.deepEqual(mapBackdropRetainStats({ chunkX: 7, chunkZ: 8 }, 10), {
    centerX: 7,
    centerZ: 8,
    radius: 10,
    chunks: 21,
    anchorX: 7,
    anchorZ: 8,
  });
  assert.deepEqual(horizonMapKeys(
    [{ chunkX: 0, chunkZ: 0 }, { chunkX: 1, chunkZ: 0 }],
    [{ chunkX: 0, chunkZ: 0 }, { chunkX: 1, chunkZ: 0 }, { chunkX: 2, chunkZ: 0 }],
  ), [{ chunkX: 2, chunkZ: 0 }]);
});
