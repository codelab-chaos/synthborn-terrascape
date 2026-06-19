import {
  updateMobMarkers,
  updatePlayerCameraMode,
  updatePlayerMarkers,
} from '../camera/camera-director.ts';
import { handleKeyboardNavigation, updateFlyTarget } from '../camera/fly-camera.ts';
import { landMotionEnabled } from '../ui/control-readers.ts';
import { updateCoordinates } from '../ui/coordinate-readout.ts';
import { updateFpsCounter } from '../ui/fps-counter.ts';
import { maybeUpdateMetrics } from '../ui/metrics.ts';
import { maybeSaveViewState } from '../ui/view-persistence.ts';
import { updateChunkPlaceholders } from '../terrain/chunk-placeholder-sync.ts';
import { maybeAutoStream } from '../terrain/terrain-loader.ts';
import { tickMapTileMotion } from '../tile-map/map-backdrop.ts';
import { updateWaterMaterials } from './water.ts';
import { positionSkyObjects } from './lighting.ts';
import { updateMapDistanceFog } from './lighting-controls.ts';
import { renderPostProcessing } from './postprocessing.ts';
import { updateEmptyGrid } from './empty-grid.ts';
import {
  camera,
  chunkLandMotion,
  chunkPlaceholderManager,
  clock,
  controls,
  fpsCounter,
  frameJank,
  lightingRig,
  loadedChunks,
  postProcessing,
  renderer,
  runtime,
  scene,
} from './scene-context.ts';

export function startFrameLoop() {
  requestAnimationFrame(animate);
}

function animate() {
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  const elapsedSeconds = clock.elapsedTime;
  frameJank.recordFrame();
  chunkLandMotion.update(loadedChunks.values());
  tickMapTileMotion(landMotionEnabled());
  updatePlayerMarkers(deltaSeconds);
  updateMobMarkers(deltaSeconds);
  handleKeyboardNavigation(deltaSeconds);
  updatePlayerCameraMode(deltaSeconds);
  if (!runtime.viewPlayerUuid && !runtime.followPlayerUuid) {
    updateFlyTarget();
  }
  if (controls.enabled) {
    controls.update();
  }
  positionSkyObjects(lightingRig, camera.position);
  updateMapDistanceFog();
  updateEmptyGrid();
  updateChunkPlaceholders();
  chunkPlaceholderManager.update(deltaSeconds);
  updateFpsCounter(fpsCounter, deltaSeconds);
  maybeAutoStream();
  updateCoordinates();
  updateWaterMaterials(scene, renderer, elapsedSeconds, camera);
  renderPostProcessing(postProcessing, renderer, scene, camera, deltaSeconds);
  maybeUpdateMetrics();
  maybeSaveViewState();
  requestAnimationFrame(animate);
}
