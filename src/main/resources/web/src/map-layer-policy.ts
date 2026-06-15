export function mapBackdropCenterFrom(
  activeCenterId: string | null | undefined,
  gridChunkX: number,
  gridChunkZ: number,
  fallback = { chunkX: 0, chunkZ: 0 },
) {
  const activeCenter = parseCenterId(activeCenterId);
  if (activeCenter) {
    return activeCenter;
  }
  if (Number.isFinite(gridChunkX) && Number.isFinite(gridChunkZ)) {
    return { chunkX: gridChunkX, chunkZ: gridChunkZ };
  }
  return fallback;
}

export function parseCenterId(centerId: string | null | undefined) {
  if (!centerId) {
    return null;
  }
  const parts = centerId.split(':');
  const chunkX = Number.parseInt(parts[parts.length - 2] ?? '', 10);
  const chunkZ = Number.parseInt(parts[parts.length - 1] ?? '', 10);
  if (!Number.isFinite(chunkX) || !Number.isFinite(chunkZ)) {
    return null;
  }
  return { chunkX, chunkZ };
}

export function mapTileLayerKey(
  world: string,
  center: { chunkX: number; chunkZ: number },
  radius: number,
  enabled: boolean,
) {
  return `${world}:${center.chunkX}:${center.chunkZ}:${radius}:${enabled}`;
}

export function mapBackdropRetainStats(center: { chunkX: number; chunkZ: number }, radius: number) {
  return {
    centerX: center.chunkX,
    centerZ: center.chunkZ,
    radius,
    chunks: radius * 2 + 1,
    anchorX: center.chunkX,
    anchorZ: center.chunkZ,
  };
}

export function horizonMapKeys<T extends { chunkX: number; chunkZ: number }>(terrainKeys: T[], retainKeys: T[]) {
  const terrainIds = new Set(terrainKeys.map((key) => `${key.chunkX}:${key.chunkZ}`));
  return retainKeys.filter((key) => !terrainIds.has(`${key.chunkX}:${key.chunkZ}`));
}
