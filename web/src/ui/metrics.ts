import { collectChunkResourceStats } from '../common/resource-stats.ts';
import { mapTileSceneStats } from '../tile-map/map-backdrop.ts';
import { formatBytes } from '../common/utils.ts';
import {
  disposalStats,
  loadedChunks,
  mobMarkers,
  renderer,
  runtime,
} from '../scene/scene-context.ts';
import {
  mapTilesInput,
  metricCenterEl,
  metricDisposedEl,
  metricGpuEl,
  metricLoadedEl,
  metricMeshesEl,
  metricMobsEl,
  metricResourcesEl,
  showMobsInput,
} from './dom.ts';

const METRICS_UPDATE_INTERVAL_MS = 250;

export function collectResourceStats() {
  return collectChunkResourceStats(loadedChunks.values());
}

function summarizeMobTypes() {
  const counts = new Map();
  for (const marker of mobMarkers.values()) {
    const type = marker.userData.mob?.type ?? marker.userData.mob?.category ?? 'Mob';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([type, count]) => `${type} ${count}`)
    .join(' · ');
}

function mobMetricText() {
  if (!showMobsInput.checked) {
    return 'hidden';
  }
  const summary = summarizeMobTypes();
  const source = runtime.lastMobSourceStats?.source ? ` · ${runtime.lastMobSourceStats.source}` : '';
  return summary ? `${mobMarkers.size} · ${summary}${source}` : `${mobMarkers.size}${source}`;
}

export function updateMetrics() {
  runtime.lastMetricsUpdate = performance.now();
  const loaded = loadedChunks.size;
  const center = runtime.activeCenterId ? runtime.activeCenterId.split(':').slice(1).join(', ') : 'pending';
  const resources = collectResourceStats();
  const rendererMemory = renderer.info.memory;
  const mapTiles = mapTileSceneStats();
  metricLoadedEl.textContent = `${loaded} chunk${loaded === 1 ? '' : 's'}`
    + (mapTilesInput.checked && mapTiles.meshCount > 0
      ? ` · map ${mapTiles.visibleCount}/${mapTiles.meshCount}`
        + (mapTiles.bytes > 0 ? ` ${formatBytes(mapTiles.bytes)}` : '')
      : '');
  metricMeshesEl.textContent = `${resources.meshes}`;
  metricResourcesEl.textContent = `${resources.geometries} geo · ${resources.materials} mat · ${resources.textures} tex`;
  metricGpuEl.textContent = `${rendererMemory.geometries} geo · ${rendererMemory.textures} tex`;
  metricDisposedEl.textContent = `${disposalStats.chunks}c · ${disposalStats.geometries}g · ${disposalStats.materials}m · ${disposalStats.textures}t`;
  metricMobsEl.textContent = mobMetricText();
  metricCenterEl.textContent = center;
}

export function maybeUpdateMetrics(force = false) {
  const now = performance.now();
  if (!force && now - runtime.lastMetricsUpdate < METRICS_UPDATE_INTERVAL_MS) {
    return;
  }
  updateMetrics();
}
