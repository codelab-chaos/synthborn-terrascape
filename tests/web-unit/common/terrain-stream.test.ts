import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTerrainStreamStats,
  terrainStreamSnapshot,
} from '../../../src/main/resources/web/src/common/terrain-stream.ts';

test('builds terrain stream telemetry snapshots', () => {
  const stats = createTerrainStreamStats('default', 10, -4, 2, 25, 3, 22, 1000);
  stats.requested = 6;
  stats.dataReady = 4;
  stats.promoted = 8;
  stats.failed = 1;
  stats.cacheHits = 2;
  stats.cacheMisses = 4;
  stats.networkChunks = 4;
  stats.maxQueue = 5;
  stats.maxReadyWaitMs = 24.6;
  stats.totalReadyWaitMs = 42;

  assert.deepEqual(terrainStreamSnapshot(stats, 2, 3, {
    final: true,
    now: 2500,
    loadSlots: 4,
    spawnFrame: 2,
    spawnBudgetMs: 5,
  }), {
    world: 'default',
    centerX: 10,
    centerZ: -4,
    radius: 2,
    needed: 25,
    alreadyLoaded: 3,
    missing: 22,
    requested: 6,
    dataReady: 4,
    promoted: 8,
    spawnedMissing: 5,
    failed: 1,
    queued: 2,
    inFlight: 3,
    cacheHits: 2,
    cacheMisses: 4,
    networkChunks: 4,
    maxQueue: 5,
    maxReadyWaitMs: 25,
    avgReadyWaitMs: 8,
    requestedPerSec: 4,
    readyPerSec: 2.7,
    spawnPerSec: 3.3,
    loadSlots: 4,
    spawnFrame: 2,
    spawnBudgetMs: 5,
    elapsedMs: 1500,
    final: true,
  });
});
