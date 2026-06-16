import { logClientTiming } from '../platform/client-log.ts';

export async function loadMapTilePng(world, chunkX, chunkZ) {
  const url = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.map.png`;
  const started = performance.now();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map tile request failed: ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  const source = response.headers.get('X-Terrascape-Cache') ?? 'other';
  logClientTiming('map_tile_single_load', started, { world, chunkX, chunkZ, bytes: bytes.byteLength, source });
  return { bytes, source };
}

