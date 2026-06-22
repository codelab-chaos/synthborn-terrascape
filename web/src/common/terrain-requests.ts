export function terrainCacheKeyFor(world, chunkX, chunkZ, options) {
  const baked = options.cosmeticsMode === 'baked';
  return makeTerrainCacheKey({
    world,
    chunkX,
    chunkZ,
    formatVersion: options.terrainFormatVersion,
    detailsEnabled: options.experimentalDetailsEnabled,
    cosmeticsMode: baked ? 'baked' : 'plain',
    visualDetailMode: baked ? options.visualDetailMode : 'basic',
  });
}

export function terrainUrlFor(world, chunkX, chunkZ, options) {
  const base = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb`;
  if (options.cosmeticsMode !== 'baked') {
    return base;
  }
  return `${base}?cosmetics=1&visualDetail=${encodeURIComponent(options.visualDetailMode)}`;
}

export function terrainCosmeticOverlayCacheKeyFor(world, chunkX, chunkZ, options) {
  return makeTerrainCacheKey({
    world,
    chunkX,
    chunkZ,
    formatVersion: options.terrainFormatVersion,
    detailsEnabled: options.experimentalDetailsEnabled,
    cosmeticsMode: 'split-overlay',
    visualDetailMode: options.visualDetailMode,
  });
}

export function terrainCosmeticOverlayUrlFor(world, chunkX, chunkZ, visualDetailMode) {
  return `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb?cosmetics=only&visualDetail=${encodeURIComponent(visualDetailMode)}`;
}

function makeTerrainCacheKey({ world, chunkX, chunkZ, formatVersion, detailsEnabled, cosmeticsMode, visualDetailMode }) {
  const details = detailsEnabled ? 'details' : 'surface';
  const cosmetics = cosmeticsMode || 'plain';
  const visualDetail = visualDetailMode || 'basic';
  return `${formatVersion}:${details}:${cosmetics}:${visualDetail}:${world}:${chunkX}:${chunkZ}`;
}
