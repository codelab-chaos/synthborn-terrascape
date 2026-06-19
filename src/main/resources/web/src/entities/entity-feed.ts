import * as THREE from 'three';
import { logClientEvent } from '../platform/client-log.ts';
import {
  createMobMarker,
  createPlayerMarker,
  disposeObject,
  updateMobMarkerCard,
  updatePlayerMarkerCard,
  updatePlayerMarkerCardHeight,
} from './players.ts';
import { createPlayerTile, updatePlayerTile } from './player-tiles.ts';
import {
  compactMobSourceStats,
  compactObject,
  nearestMobsForSample,
  roundCoord,
  summarizeItems,
} from '../common/entity-summary.ts';
import {
  liveMobFeedEnabled as computeLiveMobFeedEnabled,
  mobPollDelayMs as computeMobPollDelayMs,
  playerPollDelayMs as computePlayerPollDelayMs,
  positiveIntegerMs,
  wantsEntityStream as computeWantsEntityStream,
} from '../common/entity-feed-policy.ts';
import {
  mobMarkers,
  npcCatalog,
  playerMarkers,
  playerTiles,
  runtime,
  scene,
} from '../scene/scene-context.ts';
import { mobBlocksEnabled } from '../ui/control-readers.ts';
import { restartWorldTimePolling } from './world-time-feed.ts';
import {
  focusPlayer,
  playerCameraYawRad,
  popCameraMode,
  setPlayerEyeView,
  setPlayerFollow,
} from '../camera/camera-director.ts';
import {
  playersEl,
  playerUpdateRateInput,
  mobUpdateRateInput,
  showMobsInput,
  showPlayersInput,
  worldSelect,
} from '../ui/dom.ts';

const DEFAULT_PLAYER_UPDATE_RATE_MS = 1000;
const FOCUSED_PLAYER_POLL_MIN_MS = 1000;
const EMPTY_PLAYER_POLL_MS = 15000;
const HIDDEN_PLAYER_POLL_MS = 30000;
const PLAYER_POLL_ERROR_MS = 10000;
const MOB_POLL_MS = 5000;
const EMPTY_MOB_POLL_MS = 30000;
const MOB_POLL_ERROR_MS = 15000;
const MOB_MARKER_FRAME_BUDGET_MS = 3;
const MOB_MARKER_UPSERTS_PER_FRAME = 4;
const MOB_MARKER_REMOVALS_PER_FRAME = 96;
const ENTITY_STREAM_FALLBACK_DELAY_MS = 4000;
const PLAYER_CONNECT_MOB_SAMPLE_DELAY_MS = 1500;

export async function refreshPlayers() {
  if (!worldSelect.value || runtime.isRefreshingPlayers) {
    return;
  }
  runtime.isRefreshingPlayers = true;
  try {
    const response = await fetch(`/api/players/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Player request failed: ${response.status}`);
    }
    const data = await response.json();
    runtime.lastPlayerPollFailed = false;
    updatePlayers(data.players ?? []);
  } catch (error) {
    runtime.lastPlayerPollFailed = true;
    console.warn('Player refresh failed', error);
    logClientEvent('player_refresh_failed', { error: error?.message ?? error });
  } finally {
    runtime.isRefreshingPlayers = false;
  }
}

function playerUpdateRateMs() {
  return positiveIntegerMs(playerUpdateRateInput.value, DEFAULT_PLAYER_UPDATE_RATE_MS);
}

function playerPollDelayMs() {
  return computePlayerPollDelayMs({
    lastPollFailed: runtime.lastPlayerPollFailed,
    showPlayers: showPlayersInput.checked,
    lastPlayerCount: runtime.lastPlayerCount,
    requestedRateMs: playerUpdateRateMs(),
    focused: Boolean(runtime.viewPlayerUuid || runtime.followPlayerUuid),
    errorMs: PLAYER_POLL_ERROR_MS,
    hiddenMs: HIDDEN_PLAYER_POLL_MS,
    emptyMs: EMPTY_PLAYER_POLL_MS,
    focusedMinMs: FOCUSED_PLAYER_POLL_MIN_MS,
  });
}

export function restartPlayerPolling(delayMs = playerPollDelayMs()) {
  clearTimeout(runtime.playerPollTimer);
  if (runtime.entityStreamConnected) return;
  runtime.playerPollTimer = setTimeout(async () => {
    await refreshPlayers();
    restartPlayerPolling();
  }, delayMs);
}

export async function refreshMobs() {
  if (!worldSelect.value || !liveMobFeedEnabled() || runtime.isRefreshingMobs) {
    return;
  }
  runtime.isRefreshingMobs = true;
  try {
    const response = await fetch(`/api/mobs/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Mob request failed: ${response.status}`);
    }
    const data = await response.json();
    runtime.lastMobPollFailed = false;
    runtime.lastMobSourceStats = data.sourceStats ?? null;
    scheduleMobMarkerUpdate(data.mobs ?? []);
  } catch (error) {
    runtime.lastMobPollFailed = true;
    console.warn('Mob refresh failed', error);
    logClientEvent('mob_refresh_failed', { error: error?.message ?? error });
  } finally {
    runtime.isRefreshingMobs = false;
  }
}

function mobUpdateRateMs() {
  return positiveIntegerMs(mobUpdateRateInput.value, MOB_POLL_MS);
}

function mobPollDelayMs() {
  return computeMobPollDelayMs({
    showMobs: showMobsInput.checked,
    liveMobFeed: liveMobFeedEnabled(),
    lastPollFailed: runtime.lastMobPollFailed,
    lastMobCount: runtime.lastMobCount,
    activeMs: mobUpdateRateMs(),
    emptyMs: EMPTY_MOB_POLL_MS,
    errorMs: MOB_POLL_ERROR_MS,
  });
}

export function restartMobPolling(delayMs = mobPollDelayMs()) {
  clearTimeout(runtime.mobPollTimer);
  runtime.mobPollTimer = null;
  if (delayMs === null || runtime.entityStreamConnected) return;
  runtime.mobPollTimer = setTimeout(async () => {
    await refreshMobs();
    restartMobPolling();
  }, delayMs);
}

export function liveMobFeedEnabled() {
  return computeLiveMobFeedEnabled(showMobsInput.checked, runtime.lastPlayerCount);
}

function wantsEntityStream() {
  return computeWantsEntityStream({
    world: worldSelect.value,
    showPlayers: showPlayersInput.checked,
    liveMobFeed: liveMobFeedEnabled(),
  });
}

export function restartEntityStream() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  if (!('EventSource' in window) || !wantsEntityStream()) {
    closeEntityStream();
    restartPlayerPolling();
    restartMobPolling();
    return;
  }

  const includePlayers = showPlayersInput.checked;
  const includeMobs = liveMobFeedEnabled();
  if (runtime.entityStream
      && runtime.entityStreamWorld === worldSelect.value
      && runtime.entityStreamPlayers === includePlayers
      && runtime.entityStreamMobs === includeMobs) {
    return;
  }

  closeEntityStream();
  runtime.entityStreamWorld = worldSelect.value;
  runtime.entityStreamPlayers = includePlayers;
  runtime.entityStreamMobs = includeMobs;
  const params = new URLSearchParams({
    players: includePlayers ? '1' : '0',
    mobs: includeMobs ? '1' : '0',
  });
  runtime.entityStream = new EventSource(`/api/entities/stream/${encodeURIComponent(worldSelect.value)}?${params}`);
  runtime.entityStream.addEventListener('open', () => {
    runtime.entityStreamConnected = true;
    clearTimeout(runtime.playerPollTimer);
    clearTimeout(runtime.mobPollTimer);
    clearTimeout(runtime.entityStreamFallbackTimer);
  });
  runtime.entityStream.addEventListener('entities', (event) => {
    runtime.entityStreamConnected = true;
    clearTimeout(runtime.playerPollTimer);
    clearTimeout(runtime.mobPollTimer);
    try {
      applyEntitySnapshot(JSON.parse(event.data));
    } catch (error) {
      console.warn('Entity stream parse failed', error);
      logClientEvent('entity_stream_parse_failed', { error: error?.message ?? error });
    }
  });
  runtime.entityStream.addEventListener('error', () => {
    runtime.entityStreamConnected = false;
    scheduleEntityFallbackPolling();
  });
}

export function closeEntityStream() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  if (runtime.entityStream) {
    runtime.entityStream.close();
  }
  runtime.entityStream = null;
  runtime.entityStreamWorld = null;
  runtime.entityStreamPlayers = null;
  runtime.entityStreamMobs = null;
  runtime.entityStreamConnected = false;
}

function scheduleEntityFallbackPolling() {
  clearTimeout(runtime.entityStreamFallbackTimer);
  runtime.entityStreamFallbackTimer = setTimeout(() => {
    if (runtime.entityStreamConnected) return;
    restartPlayerPolling(0);
    restartMobPolling(0);
  }, ENTITY_STREAM_FALLBACK_DELAY_MS);
}

function applyEntitySnapshot(snapshot) {
  if (!snapshot?.ok) return;
  if (snapshot.world && snapshot.world !== worldSelect.value) return;
  if (showPlayersInput.checked) {
    updatePlayers(snapshot.players ?? []);
  }
  if (liveMobFeedEnabled()) {
    runtime.lastMobSourceStats = snapshot.mobSourceStats ?? null;
    scheduleMobMarkerUpdate(snapshot.mobs ?? []);
  }
}

export function updatePlayers(players) {
  const previousPlayerCount = runtime.lastPlayerCount;
  runtime.lastPlayerCount = players.length;
  if (previousPlayerCount !== runtime.lastPlayerCount) {
    logClientEvent('player_count_changed', {
      players: runtime.lastPlayerCount,
      nextPollMs: playerPollDelayMs(),
    });
    restartWorldTimePolling();
    if (runtime.lastPlayerCount > previousPlayerCount) {
      schedulePlayerConnectMobSample(players);
    }
    if (showMobsInput.checked) {
      if (runtime.lastPlayerCount <= 0) {
        clearMobs();
      }
      restartEntityStream();
      restartMobPolling(runtime.lastPlayerCount > 0 ? 0 : mobPollDelayMs());
    }
  }
  const seen = new Set();

  if (!showPlayersInput.checked) {
    playersEl.replaceChildren();
    playersEl.textContent = 'Players hidden';
  } else if (players.length === 0) {
    playersEl.replaceChildren();
    playersEl.textContent = 'No players';
  } else if (playersEl.childNodes.length === 1 && playersEl.firstChild.nodeType === Node.TEXT_NODE) {
    playersEl.replaceChildren();
  }

  let tileIndex = 0;
  for (const player of players) {
    seen.add(player.uuid);
    const existingMarker = playerMarkers.get(player.uuid);
    const markerIsLegacy = existingMarker && !existingMarker.userData.card;
    if (markerIsLegacy) {
      scene.remove(existingMarker);
      disposeObject(existingMarker);
      playerMarkers.delete(player.uuid);
    }
    const marker = playerMarkers.get(player.uuid) ?? createPlayerMarker(player);
    if (!existingMarker || markerIsLegacy) {
      marker.position.set(player.x, player.y, player.z);
      marker.rotation.y = playerCameraYawRad(player.yaw ?? 0);
    }
    marker.userData.targetPosition ??= new THREE.Vector3();
    marker.userData.targetPosition.set(player.x, player.y, player.z);
    marker.userData.targetYaw = playerCameraYawRad(player.yaw ?? marker.userData.targetYawDeg ?? 0);
    marker.userData.targetYawDeg = player.yaw ?? marker.userData.targetYawDeg ?? 0;
    marker.userData.targetPitch = player.pitch ?? marker.userData.targetPitch ?? 0;
    marker.visible = showPlayersInput.checked;
    marker.userData.player = player;
    updatePlayerMarkerCard(marker, player);
    updatePlayerMarkerCardHeight(marker, 4.35);
    playerMarkers.set(player.uuid, marker);
    if (!marker.parent) {
      scene.add(marker);
    }

    if (!showPlayersInput.checked) {
      continue;
    }

    const tile = playerTiles.get(player.uuid) ?? createPlayerTile(player, playerTileContext());
    if (!playerTiles.has(player.uuid)) {
      playerTiles.set(player.uuid, tile);
    }
    updatePlayerTile(tile, player, playerTileContext());
    ensurePlayerTileOrder(tile.element, tileIndex++);
  }

  for (const [uuid, marker] of playerMarkers) {
    if (!seen.has(uuid)) {
      scene.remove(marker);
      disposeObject(marker);
      playerMarkers.delete(uuid);
      playerTiles.get(uuid)?.element.remove();
      playerTiles.delete(uuid);
      if (runtime.viewPlayerUuid === uuid) {
        popCameraMode();
      }
      if (runtime.followPlayerUuid === uuid) {
        popCameraMode();
      }
    }
  }

  updateEntityVisibility();
}

function playerTileContext() {
  return {
    activeViewUuid: runtime.viewPlayerUuid,
    activeFollowUuid: runtime.followPlayerUuid,
    onFocus: focusPlayer,
    onToggleEyeView: (uuid) => setPlayerEyeView(runtime.viewPlayerUuid === uuid ? null : uuid),
    onToggleFollow: (uuid) => setPlayerFollow(runtime.followPlayerUuid === uuid ? null : uuid),
  };
}

function ensurePlayerTileOrder(tileElement, index) {
  const current = playersEl.children[index] ?? null;
  if (current === tileElement) {
    return;
  }
  if (tileElement.parentElement !== playersEl) {
    playersEl.insertBefore(tileElement, current);
    return;
  }
  playersEl.insertBefore(tileElement, current);
}

function schedulePlayerConnectMobSample(players) {
  if (!worldSelect.value || !showMobsInput.checked) return;
  clearTimeout(runtime.playerConnectMobSampleTimer);
  const sampledPlayers = players.map((player) => compactObject({
    uuid: player.uuid,
    name: player.name,
    x: roundCoord(player.x),
    y: roundCoord(player.y),
    z: roundCoord(player.z),
  }));
  runtime.playerConnectMobSampleTimer = setTimeout(() => {
    sampleMobFeedOnPlayerConnect(sampledPlayers);
  }, PLAYER_CONNECT_MOB_SAMPLE_DELAY_MS);
}

async function sampleMobFeedOnPlayerConnect(players) {
  const world = worldSelect.value;
  if (!world || !showMobsInput.checked) return;
  try {
    const response = await fetch(`/api/mobs/${encodeURIComponent(world)}`);
    if (!response.ok) {
      throw new Error(`Mob sample request failed: ${response.status}`);
    }
    const data = await response.json();
    const mobs = Array.isArray(data.mobs) ? data.mobs : [];
    logClientEvent('mob_connect_sample', {
      world,
      players: players.length,
      player: players[0] ?? null,
      mobs: mobs.length,
      types: summarizeItems(mobs, (mob) => mob.type ?? mob.label ?? 'Mob'),
      categories: summarizeItems(mobs, (mob) => mob.category ?? 'unknown'),
      sources: summarizeItems(mobs, (mob) => mob.source ?? 'unknown'),
      sourceStats: compactMobSourceStats(data.sourceStats),
      nearest: nearestMobsForSample(mobs, players[0], 12),
    });
  } catch (error) {
    logClientEvent('mob_connect_sample_failed', { error: error?.message ?? error });
  }
}

export function updateMobs(mobs) {
  cancelPendingMobMarkerUpdate();
  if (!showMobsInput.checked && mobs.length > 0) {
    return;
  }
  setMobCount(mobs.length);

  const seen = new Set();
  for (const mob of mobs) {
    seen.add(upsertMobMarker(mob));
  }

  for (const [id, marker] of mobMarkers) {
    if (!seen.has(id)) {
      scene.remove(marker);
      disposeObject(marker);
      mobMarkers.delete(id);
    }
  }

  updateEntityVisibility();
}

export function scheduleMobMarkerUpdate(mobs) {
  if (!showMobsInput.checked && mobs.length > 0) {
    return;
  }
  const generation = ++runtime.mobMarkerUpdateGeneration;
  runtime.pendingMobMarkerUpdate = {
    generation,
    mobs,
    index: 0,
    seen: new Set(),
    removals: null,
    removalIndex: 0,
  };
  setMobCount(mobs.length);
  if (!runtime.mobMarkerUpdateScheduled) {
    runtime.mobMarkerUpdateScheduled = true;
    requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
  }
}

function cancelPendingMobMarkerUpdate() {
  runtime.mobMarkerUpdateGeneration++;
  runtime.pendingMobMarkerUpdate = null;
  runtime.mobMarkerUpdateScheduled = false;
}

function processPendingMobMarkerUpdate(generation) {
  runtime.mobMarkerUpdateScheduled = false;
  const update = runtime.pendingMobMarkerUpdate;
  if (!update) return;
  if (update.generation !== generation) {
    schedulePendingMobMarkerUpdate(update.generation);
    return;
  }

  const start = performance.now();
  let processed = 0;
  while (update.index < update.mobs.length) {
    const id = upsertMobMarker(update.mobs[update.index]);
    update.seen.add(id);
    update.index += 1;
    processed += 1;
    if (processed >= MOB_MARKER_UPSERTS_PER_FRAME
        || performance.now() - start >= MOB_MARKER_FRAME_BUDGET_MS) {
      schedulePendingMobMarkerUpdate(generation);
      return;
    }
  }

  if (!update.removals) {
    update.removals = Array.from(mobMarkers.keys()).filter((id) => !update.seen.has(id));
  }
  processed = 0;
  while (update.removalIndex < update.removals.length) {
    const id = update.removals[update.removalIndex];
    const marker = mobMarkers.get(id);
    if (marker) {
      scene.remove(marker);
      disposeObject(marker);
      mobMarkers.delete(id);
    }
    update.removalIndex += 1;
    processed += 1;
    if (processed >= MOB_MARKER_REMOVALS_PER_FRAME
        || performance.now() - start >= MOB_MARKER_FRAME_BUDGET_MS) {
      schedulePendingMobMarkerUpdate(generation);
      return;
    }
  }

  runtime.pendingMobMarkerUpdate = null;
  updateEntityVisibility();
}

function schedulePendingMobMarkerUpdate(generation) {
  runtime.mobMarkerUpdateScheduled = true;
  requestAnimationFrame(() => processPendingMobMarkerUpdate(generation));
}

function setMobCount(count) {
  const previousMobCount = runtime.lastMobCount;
  runtime.lastMobCount = count;
  if (previousMobCount !== runtime.lastMobCount) {
    logClientEvent('mob_count_changed', {
      mobs: runtime.lastMobCount,
      nextPollMs: mobPollDelayMs(),
    });
  }
}

function upsertMobMarker(mob) {
  const id = String(mob.id ?? `${mob.type}:${mob.x}:${mob.y}:${mob.z}`);
  const enrichedMob = npcCatalog.enrich(mob, id);
  const existingMarker = mobMarkers.get(id);
  const marker = existingMarker ?? createMobMarker(enrichedMob);
  if (!existingMarker) {
    marker.position.set(mob.x, mob.y, mob.z);
  }
  marker.userData.targetPosition ??= new THREE.Vector3();
  marker.userData.targetPosition.set(mob.x, mob.y, mob.z);
  marker.userData.mob = enrichedMob;
  updateMobMarkerCard(marker, enrichedMob);
  marker.visible = showMobsInput.checked;
  const headshotBlock = marker.userData.headshotBlock;
  if (headshotBlock) {
    headshotBlock.visible = mobBlocksEnabled();
  }
  mobMarkers.set(id, marker);
  if (!marker.parent) {
    scene.add(marker);
  }
  return id;
}

export function clearMobs() {
  updateMobs([]);
  runtime.lastMobPollFailed = false;
  runtime.lastMobSourceStats = null;
}

export function updateEntityVisibility() {
  for (const marker of playerMarkers.values()) {
    marker.visible = showPlayersInput.checked;
  }
  for (const marker of mobMarkers.values()) {
    marker.visible = showMobsInput.checked;
    if (marker.userData.headshotBlock) {
      marker.userData.headshotBlock.visible = mobBlocksEnabled();
    }
  }
  if (!showPlayersInput.checked) {
    playersEl.textContent = 'Players hidden';
  }
}
