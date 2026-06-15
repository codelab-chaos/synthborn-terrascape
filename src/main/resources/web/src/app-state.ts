export class AppRuntimeState {
  loadGeneration = 0;
  lastGridLoadTiming = null;
  lastTerrainStreamTiming = null;
  hasFocusedInitialGrid = false;
  activeCenterId = null;
  requestedCenterId = null;
  scheduledCenterId = null;
  mapTileLayerKey = null;
  streamTimer = null;
  gridLoadCount = 0;
  controlLoadTimer = null;
  playerPollTimer = null;
  mobPollTimer = null;
  entityStream = null;
  entityStreamWorld = null;
  entityStreamPlayers = null;
  entityStreamMobs = null;
  entityStreamFallbackTimer = null;
  playerConnectMobSampleTimer = null;
  lastMetricsUpdate = 0;
  experimentalDetailsEnabled = false;
  terrainFormatVersion = 'unknown';
  storedViewState;
  hasRestoredCameraPose = false;
  hasStarted = false;
  lastViewStateSave = 0;
  flyYaw = 0;
  flyPitch = 0;
  worldTime = null;
  timePollTimer = null;
  viewPlayerUuid = null;
  followPlayerUuid = null;
  isRefreshingPlayers = false;
  lastPlayerCount = 0;
  lastPlayerPollFailed = false;
  isRefreshingMobs = false;
  lastMobCount = 0;
  lastMobPollFailed = false;
  entityStreamConnected = false;
  lastMobSourceStats = null;
  pendingMobMarkerUpdate = null;
  mobMarkerUpdateScheduled = false;
  mobMarkerUpdateGeneration = 0;
  hasMobBillboardQuaternion = false;

  constructor(storedViewState) {
    this.storedViewState = storedViewState;
  }
}
