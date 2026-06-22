export function createTerrainStreamStats(
  world: string,
  centerX: number,
  centerZ: number,
  radius: number,
  needed: number,
  alreadyLoaded: number,
  missing: number,
  startedAt: number,
) {
  return {
    world,
    centerX,
    centerZ,
    radius,
    needed,
    alreadyLoaded,
    missing,
    startedAt,
    lastProgressLogAt: startedAt,
    requested: 0,
    dataReady: 0,
    promoted: alreadyLoaded,
    failed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkChunks: 0,
    maxQueue: 0,
    maxReadyWaitMs: 0,
    totalReadyWaitMs: 0,
  };
}

export function terrainStreamSnapshot(
  stats,
  queueLength: number,
  inFlightCount: number,
  options: {
    final?: boolean;
    now?: number;
    loadSlots?: number;
    spawnFrame?: number;
    spawnBudgetMs?: number;
  } = {},
) {
  const elapsedMs = Math.max(1, (options.now ?? performance.now()) - stats.startedAt);
  const spawnedMissing = Math.max(0, stats.promoted - stats.alreadyLoaded);
  const avgReadyWaitMs = spawnedMissing > 0 ? stats.totalReadyWaitMs / spawnedMissing : 0;
  return {
    world: stats.world,
    centerX: stats.centerX,
    centerZ: stats.centerZ,
    radius: stats.radius,
    needed: stats.needed,
    alreadyLoaded: stats.alreadyLoaded,
    missing: stats.missing,
    requested: stats.requested,
    dataReady: stats.dataReady,
    promoted: stats.promoted,
    spawnedMissing,
    failed: stats.failed,
    queued: queueLength,
    inFlight: inFlightCount,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    networkChunks: stats.networkChunks,
    maxQueue: stats.maxQueue,
    maxReadyWaitMs: Math.round(stats.maxReadyWaitMs),
    avgReadyWaitMs: Math.round(avgReadyWaitMs),
    requestedPerSec: Math.round((stats.requested * 1000 / elapsedMs) * 10) / 10,
    readyPerSec: Math.round((stats.dataReady * 1000 / elapsedMs) * 10) / 10,
    spawnPerSec: Math.round((spawnedMissing * 1000 / elapsedMs) * 10) / 10,
    loadSlots: options.loadSlots,
    spawnFrame: options.spawnFrame,
    spawnBudgetMs: options.spawnBudgetMs,
    elapsedMs: Math.round(elapsedMs),
    final: options.final === true,
  };
}
