import {
  configureMapBackdrop,
  loadMapTilesForKeys,
  mapBackdropStats,
  pruneMapTiles,
} from './map-backdrop.ts';
import {
  mapBackdropCenterFrom,
  mapBackdropRetainStats,
  mapTileLayerKey as buildMapTileLayerKey,
} from '../common/map-layer-policy.ts';
import { chunkKeysForWorld, sortChunkKeysByPlayerDistance } from '../common/chunk-planning.ts';
import { sampleMapBackdropColor } from './map-backdrop.ts';
import { tintWaterMaterialsFromMap } from '../scene/water.ts';
import { grid, loadedChunks, renderer, runtime, scene } from '../scene/scene-context.ts';
import { landMotionEnabled, mapTileRadius } from '../ui/control-readers.ts';
import { updateMetrics } from '../ui/metrics.ts';
import { playerChunk } from '../camera/camera-director.ts';
import {
  chunkXInput,
  chunkZInput,
  mapTilesInput,
  worldSelect,
} from '../ui/dom.ts';

export function applyMapWaterTint() {
  for (const entry of loadedChunks.values()) {
    tintWaterMaterialsFromMap(entry.object, sampleMapBackdropColor);
  }
}

export function mapBackdropCenter() {
  return mapBackdropCenterFrom(
    runtime.activeCenterId,
    Number.parseInt(chunkXInput.value, 10),
    Number.parseInt(chunkZInput.value, 10),
  );
}

type MapTileKey = { id: string; chunkX: number; chunkZ: number };

export function syncMapTileLayer(retainKeys: MapTileKey[] | null = null) {
  grid.visible = !mapTilesInput.checked;
  configureMapBackdrop(scene, renderer, {
    enabled: mapTilesInput.checked,
    formatVersion: runtime.terrainFormatVersion,
    motionEnabled: landMotionEnabled(),
  });
  if (!mapTilesInput.checked) {
    updateMetrics();
    return;
  }
  const world = worldSelect.value;
  const keys = retainKeys ?? chunkKeysForWorld(
    world,
    Number.parseInt(chunkXInput.value, 10),
    Number.parseInt(chunkZInput.value, 10),
    mapTileRadius(),
  );
  const retainIds = new Set<string>(keys.map((key) => key.id));
  pruneMapTiles(world, retainIds);
  const center = mapBackdropCenter();
  const mapRadius = mapTileRadius();
  const stats = mapBackdropStats();
  Object.assign(stats, mapBackdropRetainStats(center, mapRadius));
  updateMetrics();
}

export function updateMapTileLayer(options: { force?: boolean } = {}) {
  const center = mapBackdropCenter();
  const mapRadius = mapTileRadius();
  const world = worldSelect.value;
  const layerKey = buildMapTileLayerKey(world, center, mapRadius, mapTilesInput.checked);
  if (!options.force && layerKey === runtime.mapTileLayerKey) {
    return;
  }
  runtime.mapTileLayerKey = layerKey;
  const keys = chunkKeysForWorld(world, center.chunkX, center.chunkZ, mapRadius);
  syncMapTileLayer(keys);
  if (mapTilesInput.checked) {
    const anchor = playerChunk();
    void loadMapTilesForKeys(
      world,
      sortChunkKeysByPlayerDistance(keys, anchor.chunkX, anchor.chunkZ),
      { immediate: true, replace: true },
    );
  }
}
