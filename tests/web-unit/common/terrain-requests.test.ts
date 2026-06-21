import assert from 'node:assert/strict';
import test from 'node:test';

import {
  terrainCacheKeyFor,
  terrainCosmeticOverlayCacheKeyFor,
  terrainCosmeticOverlayUrlFor,
  terrainUrlFor,
} from '../../../src/main/resources/web/src/common/terrain-requests.ts';

test('builds terrain request URLs and cache keys', () => {
  const bakedOptions = {
    terrainFormatVersion: 'v99',
    experimentalDetailsEnabled: true,
    cosmeticsMode: 'baked',
    visualDetailMode: 'all',
  };
  assert.equal(
    terrainUrlFor('default world', -2, 7, bakedOptions),
    '/api/terrain/default%20world/-2/7.glb?cosmetics=1&visualDetail=all',
  );
  assert.equal(
    terrainUrlFor('default world', -2, 7, { ...bakedOptions, cosmeticsMode: 'off' }),
    '/api/terrain/default%20world/-2/7.glb',
  );
  assert.equal(
    terrainCacheKeyFor('default', -2, 7, bakedOptions),
    'v99:details:baked:all:default:-2:7',
  );
  assert.equal(
    terrainCacheKeyFor('default', -2, 7, { ...bakedOptions, cosmeticsMode: 'off' }),
    'v99:details:plain:basic:default:-2:7',
  );
  assert.equal(
    terrainCosmeticOverlayUrlFor('default world', -2, 7, 'structures'),
    '/api/terrain/default%20world/-2/7.glb?cosmetics=only&visualDetail=structures',
  );
  assert.equal(
    terrainCosmeticOverlayCacheKeyFor('default', -2, 7, bakedOptions),
    'v99:details:split-overlay:all:default:-2:7',
  );
});
