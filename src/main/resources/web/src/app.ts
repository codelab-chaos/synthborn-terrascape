import { bindAppEvents } from './ui/app-events.ts';
import { worldSelect } from './ui/dom.ts';
import {
  npcCatalog,
  pressedKeys,
  renderer,
  runtime,
  setStatus,
  timeRibbon,
} from './scene/scene-context.ts';
import {
  radiusValue,
  setRadiusControlValue,
  syncMobBlocksInputs,
  updateRadiusReadout,
} from './ui/control-readers.ts';
import {
  applyFogSettings,
  applyLighting,
} from './scene/lighting-controls.ts';
import { applyMapWaterTint, updateMapTileLayer } from './tile-map/map-tile-layer.ts';
import {
  applyWaterMode,
  handleClearMeshCache,
  loadGrid,
  reloadTerrainForVisualOptions,
  scheduleControlGridLoad,
  updateDebugBounds,
} from './terrain/terrain-loader.ts';
import {
  clearMobs,
  closeEntityStream,
  restartEntityStream,
  restartMobPolling,
  restartPlayerPolling,
  updateEntityVisibility,
  updatePlayers,
} from './entities/entity-feed.ts';
import {
  refreshWorldTime,
  restartWorldTimePolling,
} from './entities/world-time-feed.ts';
import {
  applyFlyLookDelta,
  shouldStartFlyLook,
  zoomFlyView,
} from './camera/fly-camera.ts';
import {
  applyInitialParams,
  restoreCameraPose,
  saveViewState,
  setRenderDetailsOpen,
  toggleRenderDetails,
} from './ui/view-persistence.ts';
import { exposeDebugState } from './ui/debug-bridge.ts';
import { mountBuildBadge } from './ui/build-badge.ts';
import { loadWorlds } from './ui/world-selector.ts';
import { resizeViewport } from './scene/viewport.ts';
import { startFrameLoop } from './scene/frame-loop.ts';

// Preserved public barrel (webpack module-library exports).
export { createMobMarker, createPlayerMarker, disposeObject, updateMobMarkerHeight } from './entities/players.ts';
export * from './library/control-values.ts';
export * from './common/entity-summary.ts';
export * from './common/entity-feed-policy.ts';
export * from './common/chunk-planning.ts';
export * from './common/map-layer-policy.ts';
export * from './common/resource-stats.ts';
export * from './common/terrain-requests.ts';
export * from './common/terrain-stream.ts';
export * from './common/view-preferences.ts';

setRenderDetailsOpen(!runtime.storedViewState || runtime.storedViewState.renderDetails !== false);
bindAppEvents({
  renderer,
  pressedKeys,
  getViewPlayerUuid: () => runtime.viewPlayerUuid,
  getFollowPlayerUuid: () => runtime.followPlayerUuid,
  applyFlyLookDelta,
  applyFogSettings,
  applyLighting,
  applyMapWaterTint,
  applyWaterMode,
  clearMobs,
  closeEntityStream,
  handleClearMeshCache,
  refreshWorldTime,
  restartEntityStream,
  restartMobPolling,
  restartPlayerPolling,
  restartWorldTimePolling,
  saveViewState,
  scheduleControlGridLoad,
  setRadiusControlValue,
  shouldStartFlyLook,
  syncMobBlocksInputs,
  toggleRenderDetails,
  updateDebugBounds,
  updateEntityVisibility,
  updateMapTileLayer,
  updatePlayers,
  updateRadiusReadout,
  zoomFlyView,
  reloadTerrainForVisualOptions,
  resize: resizeViewport,
});
applyInitialParams();
setRadiusControlValue(radiusValue());
exposeDebugState();
mountBuildBadge();
resizeViewport();
timeRibbon.update(runtime.worldTime);
startFrameLoop();
await loadWorlds();
await npcCatalog.load();
if (worldSelect.value) {
  runtime.hasStarted = true;
  const restoredCameraPose = restoreCameraPose();
  await refreshWorldTime();
  await loadGrid({ focus: !restoredCameraPose }).catch((error) => setStatus(error.message));
  restartEntityStream();
  restartPlayerPolling();
  restartMobPolling();
  restartWorldTimePolling();
  saveViewState();
}
