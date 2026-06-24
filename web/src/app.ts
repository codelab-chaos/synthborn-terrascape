import { bindAppEvents } from './ui/app-events.ts';
import { worldSelect } from './ui/dom.ts';
import {
  initialParams,
  npcCatalog,
  pressedKeys,
  renderer,
  runtime,
  setStatus,
  timeRibbon,
} from './scene/scene-context.ts';
import { onUnauthorized } from './platform/api-client.ts';
import { bindAccessOverlay, showAccessRequired } from './ui/access-overlay.ts';
import {
  radiusValue,
  setRadiusControlValue,
  syncMobBlocksInputs,
  tileLoadConcurrency,
  updateRadiusReadout,
} from './ui/control-readers.ts';
import { setTileLoadConcurrency } from './tile-map/map-backdrop.ts';
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
  setServerDetailsOpen,
  toggleRenderDetails,
  toggleServerDetails,
} from './ui/view-persistence.ts';
import { exposeDebugState } from './ui/debug-bridge.ts';
import { mountBuildBadge } from './ui/build-badge.ts';
import { loadWorlds } from './ui/world-selector.ts';
import { startServerDetailsFeed } from './ui/server-details.ts';
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

// Surface a clear prompt if the session is rejected (e.g. the access token's TTL lapsed) instead of
// letting the map silently stop loading.
bindAccessOverlay();
onUnauthorized(showAccessRequired);
// The one-time access key has done its job — the server set a session cookie from it — so keep it
// out of the address bar, browser history, and any outbound referrer.
if (initialParams.has('key')) {
  const url = new URL(window.location.href);
  url.searchParams.delete('key');
  window.history.replaceState(null, '', url);
}

setRenderDetailsOpen(!runtime.storedViewState || runtime.storedViewState.renderDetails !== false);
setServerDetailsOpen(runtime.storedViewState?.serverDetails === true);
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
  toggleServerDetails,
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
setTileLoadConcurrency(tileLoadConcurrency());
exposeDebugState();
mountBuildBadge();
resizeViewport();
timeRibbon.update(runtime.worldTime);
startServerDetailsFeed();
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
