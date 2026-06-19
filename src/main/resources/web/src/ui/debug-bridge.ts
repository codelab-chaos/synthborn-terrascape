import {
  auditMapTiles,
  mapBackdropStats,
  mapTileMotionActive,
  mapTileSceneStats,
  probeMapTilePixel,
} from '../tile-map/map-backdrop.ts';
import { resolveMapBackdropY } from '../scene/water.ts';
import { renderPostProcessing } from '../scene/postprocessing.ts';
import { isVectorState, vectorState } from './view-state.ts';
import {
  camera,
  chunkLandMotion,
  chunkPlaceholderManager,
  controls,
  displayColor,
  fpsCounter,
  frameJank,
  lightingRig,
  loadedChunks,
  mobMarkers,
  npcCatalog,
  playerMarkers,
  playerTiles,
  postProcessing,
  renderer,
  runtime,
  scene,
  timeRibbon,
} from '../scene/scene-context.ts';
import {
  mobBlocksEnabled,
  readFloatControl,
  terrainLoadConcurrency,
  terrainPromotionBudgetMs,
  terrainPromotionsPerFrame,
  visualDetailMode,
  waterModeValue,
} from './control-readers.ts';
import { applyLighting, fogControlRange } from '../scene/lighting-controls.ts';
import {
  playerChunk,
  setPlayerEyeView,
} from '../camera/camera-director.ts';
import {
  applyFlyLookDelta,
  isFlyLookActive,
  syncFlyLookFromCamera,
  zoomFlyView,
} from '../camera/fly-camera.ts';
import {
  liveMobFeedEnabled,
  scheduleMobMarkerUpdate,
  updateMobs,
  updatePlayers,
} from '../entities/entity-feed.ts';
import {
  countOrphanChunkWrappers,
  loadGrid,
  pruneOrphanChunkWrappers,
} from '../terrain/terrain-loader.ts';
import {
  autoStreamInput,
  cosmeticBlocksModeInput,
  debugBoundsInput,
  fogEnabledInput,
  fogHorizonValueInput,
  fogStrengthValueInput,
  landMotionInput,
  mapTilesInput,
  mapTimeInput,
  showMobsInput,
  showPlayersInput,
  treeShadeInput,
} from './dom.ts';

function waterMaterialSummary() {
  const summaries = [];
  for (const entry of loadedChunks.values()) {
    entry.object.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.name !== 'terrascape-water' && material?.userData?.terrascapeWater !== true) continue;
        summaries.push({
          type: material.type,
          vertexColors: material.vertexColors === true,
          toneMapped: material.toneMapped === true,
          fog: material.fog === true,
          transparent: material.transparent === true,
          opacity: material.opacity,
          color: material.userData?.terrascapeWaterColor ? displayColor(material.userData.terrascapeWaterColor) : null,
          alpha: material.uniforms?.alpha?.value ?? null,
          time: material.uniforms?.time?.value ?? null,
          waveHeight: material.uniforms?.waveHeight?.value ?? null,
          waveFrequency: material.uniforms?.waveFrequency?.value ?? null,
          shaderMix: material.uniforms?.shaderMix?.value ?? null,
          distortionScale: material.uniforms?.distortionScale?.value ?? null,
          hasNormalSampler: Boolean(material.uniforms?.normalSampler?.value),
          hasReflectionSampler: Boolean(material.uniforms?.reflectionSampler?.value),
        });
      }
    });
  }
  return summaries;
}

export function exposeDebugState() {
  window.__terrascapeDebug = {
    fpsCounter,
    loadedChunks,
    playerMarkers,
    playerTiles,
    mobMarkers,
    entityStreamState: () => ({
      connected: runtime.entityStreamConnected,
      world: runtime.entityStreamWorld,
      players: runtime.entityStreamPlayers,
      mobs: runtime.entityStreamMobs,
      liveMobFeed: liveMobFeedEnabled(),
      available: 'EventSource' in window,
    }),
    npcDetailsState: () => npcCatalog.state(),
    loadGrid: (options = {}) => loadGrid(options),
    auditMapTiles: () => auditMapTiles(scene),
    mapBackdropY: () => resolveMapBackdropY(),
    mapBackdropStats,
    mapTileSceneStats,
    probeMapTilePixel: (chunkX, chunkZ) => probeMapTilePixel(
      scene,
      renderer,
      camera,
      () => renderPostProcessing(postProcessing, renderer, scene, camera, 0),
      chunkX,
      chunkZ,
    ),
    terrainFormatVersion: () => runtime.terrainFormatVersion,
    experimentalDetailsEnabled: () => runtime.experimentalDetailsEnabled,
    activeCenterId: () => runtime.activeCenterId,
    requestedCenterId: () => runtime.requestedCenterId,
    updatePlayersForTest: (players) => updatePlayers(players),
    setPlayerEyeViewForTest: (uuid) => setPlayerEyeView(uuid),
    updateMobsForTest: (mobs) => updateMobs(mobs),
    scheduleMobsForTest: (mobs) => scheduleMobMarkerUpdate(mobs),
    waterMaterialSummary: () => waterMaterialSummary(),
    cameraPose: () => ({
      camera: vectorState(camera.position),
      target: vectorState(controls.target),
      fov: camera.fov,
    }),
    streamAnchorChunk: () => playerChunk(),
    cameraChunk: () => ({
      chunkX: Math.floor(camera.position.x / 32),
      chunkZ: Math.floor(camera.position.z / 32),
    }),
    setAutoStream: (enabled) => {
      autoStreamInput.checked = enabled === true;
      autoStreamInput.dispatchEvent(new Event('change', { bubbles: true }));
    },
    lastPerfTimings: () => ({
      gridLoad: runtime.lastGridLoadTiming,
      terrainBatch: null,
      terrainStream: runtime.lastTerrainStreamTiming,
    }),
    terrainTuning: () => ({
      loadSlots: terrainLoadConcurrency(),
      spawnFrame: terrainPromotionsPerFrame(),
      spawnBudgetMs: terrainPromotionBudgetMs(),
    }),
    gridLoadCount: () => runtime.gridLoadCount,
    resetGridLoadCount: () => {
      runtime.gridLoadCount = 0;
    },
    jankStats: () => frameJank.stats(),
    resetJankStats: () => frameJank.reset(),
    chunkPlaceholderCount: () => chunkPlaceholderManager.count(),
    chunkPlaceholderWaiting: () => chunkPlaceholderManager.waitingCount(),
    landMotionActive: () => chunkLandMotion.activeCount(loadedChunks.values()),
    mapTileMotionActive,
    chunkWrapperCount: () => scene.children.filter((child) => child.name?.startsWith('chunk:')).length,
    orphanChunkWrappers: () => countOrphanChunkWrappers(),
    pruneOrphanChunkWrappers: () => pruneOrphanChunkWrappers(),
    viewState: () => ({
      mapTiles: mapTilesInput.checked,
      cosmeticsMode: cosmeticBlocksModeInput.value,
      visualDetailMode: visualDetailMode(),
      landMotion: landMotionInput.checked,
      terrainLoadSlots: terrainLoadConcurrency(),
      terrainSpawnFrame: terrainPromotionsPerFrame(),
      terrainSpawnMs: terrainPromotionBudgetMs(),
      shade: treeShadeInput.checked,
      mapTime: mapTimeInput.checked,
      water: waterModeValue(),
      fog: {
        enabled: fogEnabledInput.checked,
        near: fogControlRange().near,
        far: fogControlRange().far,
        strength: readFloatControl(fogStrengthValueInput, 0.9),
        horizon: readFloatControl(fogHorizonValueInput, 0.65),
      },
      players: showPlayersInput.checked,
      mobs: showMobsInput.checked,
      mobBlocks: mobBlocksEnabled(),
      auto: autoStreamInput.checked,
      bounds: debugBoundsInput.checked,
    }),
    skySummary: () => ({
      background: displayColor(scene.background),
      fogType: scene.fog?.isFogExp2 ? 'FogExp2' : (scene.fog?.isFog ? 'Fog' : null),
      fogNear: scene.fog?.near ?? null,
      fogFar: scene.fog?.far ?? null,
      fogDensity: scene.fog?.density ?? null,
      fogColor: displayColor(scene.fog?.color),
      postFogEnabled: postProcessing.enabled,
      postFogNear: postProcessing.fogPass.uniforms.fogNear.value,
      postFogFar: postProcessing.fogPass.uniforms.fogFar.value,
      postFogStrength: postProcessing.fogPass.uniforms.fogStrength.value,
      postFogHorizon: postProcessing.fogPass.uniforms.horizonStrength.value,
      postFogColor: displayColor(postProcessing.fogPass.uniforms.fogColor.value),
      starsVisible: lightingRig.stars.visible === true,
      skyVisible: lightingRig.sky.visible === true,
    }),
    lightingSummary: () => ({
      ambientIntensity: lightingRig.ambient.intensity,
      sunIntensity: lightingRig.sun.intensity,
      starsOpacity: lightingRig.stars.material.opacity,
    }),
    setWorldTimeForTest: (time) => {
      runtime.worldTime = time;
      mapTimeInput.checked = true;
      applyLighting();
      timeRibbon.update(runtime.worldTime);
    },
    flyLook: () => ({
      yaw: runtime.flyYaw,
      pitch: runtime.flyPitch,
      pointerLocked: isFlyLookActive(),
    }),
    applyFlyLookDelta: (movementX, movementY) => {
      applyFlyLookDelta(movementX, movementY);
    },
    zoomFlyView: (deltaY) => {
      zoomFlyView(Number(deltaY));
    },
    setCameraPose: ({ camera: cameraState, target: targetState, lookAt }) => {
      if (isVectorState(cameraState)) {
        camera.position.set(cameraState.x, cameraState.y, cameraState.z);
      }
      if (isVectorState(targetState)) {
        controls.target.set(targetState.x, targetState.y, targetState.z);
      }
      controls.update();
      if (isVectorState(lookAt)) {
        camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
      }
      syncFlyLookFromCamera();
    },
  };
}
