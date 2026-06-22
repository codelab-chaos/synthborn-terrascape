import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  focusPlayer,
  setPlayerEyeView,
  setPlayerFollow,
  popCameraMode,
  currentPlayersFromMarkers,
  focusGrid,
  playerChunk,
  updatePlayerMarkers,
  updateMobMarkers,
  updatePlayerCameraMode,
  playerCameraYawRad,
} from '../../../src/main/resources/web/src/camera/camera-director.ts';
import {
  camera,
  controls,
  runtime,
  cameraModeStack,
  playerEyeState,
  playerMarkers,
  mobMarkers,
} from '../../../src/main/resources/web/src/scene/scene-context.ts';
import { flushClientLogs } from '../../../src/main/resources/web/src/platform/client-log.ts';

// Guard against any background polling fetch hitting the network and hanging the run.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({}) })) as any;

// updatePlayers() emits client-log telemetry, whose flush prefers navigator.sendBeacon
// and otherwise falls back to a real fetch to http://localhost (ECONNREFUSED -> rejection
// that trips the process exit code). Force sendBeacon to succeed so flush never fetches.
const originalSendBeacon = (navigator as any).sendBeacon;
(navigator as any).sendBeacon = () => true;

// Director mode changes can kick off background poll/telemetry promises whose
// rejections the production app intentionally ignores. Swallow them here too so a
// stray async rejection from a fire-and-forget poll never fails the suite.
const swallowRejection = () => {};
process.on('unhandledRejection', swallowRejection);

// Some director helpers indirectly start recurring poll timers / streams (via
// entity-feed.updatePlayers). Tear every one of them down so the process exits cleanly.
function clearBackgroundHandles() {
  for (const key of [
    'playerPollTimer', 'mobPollTimer', 'timePollTimer',
    'entityStreamFallbackTimer', 'playerConnectMobSampleTimer', 'controlLoadTimer',
    'streamTimer',
  ] as const) {
    clearTimeout((runtime as any)[key]);
    clearInterval((runtime as any)[key]);
    (runtime as any)[key] = null;
  }
  if (runtime.entityStream && typeof (runtime.entityStream as any).close === 'function') {
    (runtime.entityStream as any).close();
  }
  runtime.entityStream = null;
  // updatePlayers() logs telemetry which arms client-log's internal 2s flush timer;
  // drain it so no background timer survives the test and trips the process exit code.
  try { flushClientLogs(); } catch { /* sendBeacon/fetch unavailable headless */ }
}

test.afterEach(clearBackgroundHandles);

test.after(() => {
  clearBackgroundHandles();
  globalThis.fetch = originalFetch;
  (navigator as any).sendBeacon = originalSendBeacon;
  process.off('unhandledRejection', swallowRejection);
});

function makePlayerMarker(uuid: string, x = 10, y = 60, z = 10) {
  const marker = new THREE.Object3D();
  marker.position.set(x, y, z);
  const card = new THREE.Object3D();
  marker.add(card);
  marker.userData = {
    player: { uuid, name: `player-${uuid}` },
    targetPosition: new THREE.Vector3(x, y, z),
    targetYaw: 0.3,
    targetPitch: 12,
    card,
  };
  marker.updateMatrixWorld(true);
  return marker;
}

function makeMobMarker(x = 30, y = 40, z = 30) {
  const marker = new THREE.Object3D();
  marker.position.set(x, y, z);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 }),
  );
  badge.scale.set(1, 2, 1);
  marker.add(badge);

  const pointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1, 0.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 }),
  );
  marker.add(pointer);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 }),
  );
  glow.name = 'mob-ground-glow';
  marker.add(glow);

  marker.userData = {
    targetPosition: new THREE.Vector3(x, y, z),
    badge,
    pointer,
    cardAnchorY: 0.5,
  };
  marker.updateMatrixWorld(true);
  return marker;
}

// camera-director's mode helpers call restartPlayerPolling(), which schedules a
// recurring setTimeout that fires apiFetch() against http://localhost (no server),
// hanging the process. Flagging the entity stream as connected makes
// restartPlayerPolling() early-return, so no timer/fetch is ever scheduled.
function fullReset() {
  clearBackgroundHandles();
  runtime.entityStreamConnected = true;
  playerMarkers.clear();
  mobMarkers.clear();
  cameraModeStack.length = 0;
  runtime.viewPlayerUuid = null;
  runtime.followPlayerUuid = null;
  runtime.hasMobBillboardQuaternion = false;
  playerEyeState.uuid = null;
  playerEyeState.yawRad = 0;
  playerEyeState.pitchRad = 0;
  camera.position.set(0, 100, 0);
  camera.quaternion.identity();
  camera.updateMatrixWorld(true);
  controls.target.set(0, 0, 0);
}

test('playerCameraYawRad converts degrees to radians', () => {
  assert.ok(Math.abs(playerCameraYawRad(180) - Math.PI) < 1e-9);
  assert.equal(playerCameraYawRad(undefined as any), 0);
});

test('focusPlayer positions the camera relative to a known marker', () => {
  fullReset();
  const marker = makePlayerMarker('p1', 20, 50, 20);
  playerMarkers.set('p1', marker);
  focusPlayer('p1');
  // Target should be marker position + (0,1.5,0).
  assert.ok(Math.abs(controls.target.y - (50 + 1.5)) < 1e-6);
  // Camera offset is (34,28,34) above the target.
  assert.ok(camera.position.x > controls.target.x);
  // Mode stack reset.
  assert.equal(cameraModeStack.length, 0);
});

test('focusPlayer is a no-op for unknown players', () => {
  fullReset();
  const before = camera.position.clone();
  focusPlayer('missing');
  assert.ok(camera.position.equals(before));
});

test('currentPlayersFromMarkers extracts player payloads', () => {
  fullReset();
  playerMarkers.set('a', makePlayerMarker('a'));
  playerMarkers.set('b', makePlayerMarker('b'));
  const players = currentPlayersFromMarkers();
  assert.equal(players.length, 2);
  assert.ok(players.every((p: any) => typeof p.uuid === 'string'));
});

test('setPlayerEyeView enters eye mode and pushes a mode-stack frame', () => {
  fullReset();
  const marker = makePlayerMarker('eye1', 5, 70, 5);
  playerMarkers.set('eye1', marker);
  setPlayerEyeView('eye1');
  assert.equal(runtime.viewPlayerUuid, 'eye1');
  assert.equal(playerEyeState.uuid, 'eye1');
  assert.equal(cameraModeStack.length, 1);
  // The eye camera should have repositioned to near the marker eye height.
  assert.ok(camera.position.distanceTo(marker.position) < 6);
});

test('setPlayerEyeView toggles off when called again with the same uuid', () => {
  fullReset();
  playerMarkers.set('eye2', makePlayerMarker('eye2'));
  setPlayerEyeView('eye2');
  assert.equal(runtime.viewPlayerUuid, 'eye2');
  setPlayerEyeView('eye2'); // same uuid -> pop
  assert.equal(runtime.viewPlayerUuid, null);
});

test('setPlayerEyeView(null) pops out of eye mode', () => {
  fullReset();
  playerMarkers.set('eye3', makePlayerMarker('eye3'));
  setPlayerEyeView('eye3');
  setPlayerEyeView(null);
  assert.equal(runtime.viewPlayerUuid, null);
});

test('setPlayerEyeView ignores unknown players', () => {
  fullReset();
  setPlayerEyeView('ghost');
  assert.equal(runtime.viewPlayerUuid, null);
});

test('setPlayerFollow enables follow controls and follow mode', () => {
  fullReset();
  const marker = makePlayerMarker('f1', 0, 60, 0);
  playerMarkers.set('f1', marker);
  setPlayerFollow('f1');
  assert.equal(runtime.followPlayerUuid, 'f1');
  assert.equal(controls.enabled, true);
  assert.equal(cameraModeStack.length, 1);
});

test('setPlayerFollow(null) pops follow mode', () => {
  fullReset();
  playerMarkers.set('f2', makePlayerMarker('f2'));
  setPlayerFollow('f2');
  setPlayerFollow(null);
  assert.equal(runtime.followPlayerUuid, null);
});

test('popCameraMode restores prior state or resets when stack drains', () => {
  fullReset();
  playerMarkers.set('pc', makePlayerMarker('pc'));
  setPlayerFollow('pc');
  assert.equal(cameraModeStack.length, 1);
  popCameraMode();
  // Restored the captured (non-follow) base state.
  assert.equal(runtime.followPlayerUuid, null);
});

test('popCameraMode with an empty stack fully resets modes', () => {
  fullReset();
  runtime.followPlayerUuid = 'stale';
  popCameraMode();
  assert.equal(runtime.followPlayerUuid, null);
  assert.equal(cameraModeStack.length, 0);
});

test('focusGrid aims the camera at a chunk center', () => {
  fullReset();
  focusGrid(1, 2, 3);
  // center = (1*32+16, 122, 2*32+16) = (48, 122, 80); camera y = 122+58 = 180.
  // OrbitControls.update() applies a small damping/polar-angle adjustment, so allow slack.
  assert.ok(Math.abs(controls.target.x - 48) < 0.5);
  assert.ok(Math.abs(controls.target.z - 80) < 0.5);
  assert.ok(Math.abs(camera.position.y - 180) < 1);
  assert.ok(Math.abs(camera.position.x - 48) < 1);
});

test('playerChunk reads the focused marker, else falls back to the camera', () => {
  fullReset();
  // No focused player -> uses camera position (0,100,0).
  let chunk = playerChunk();
  assert.equal(chunk.chunkX, 0);
  assert.equal(chunk.chunkZ, 0);

  const marker = makePlayerMarker('anchor', 64, 60, 96);
  playerMarkers.set('anchor', marker);
  runtime.followPlayerUuid = 'anchor';
  chunk = playerChunk();
  assert.equal(chunk.chunkX, 2); // floor(64/32)
  assert.equal(chunk.chunkZ, 3); // floor(96/32)
  runtime.followPlayerUuid = null;
});

test('updatePlayerMarkers lerps marker position and orients the card', () => {
  fullReset();
  const marker = makePlayerMarker('m1', 0, 60, 0);
  marker.userData.targetPosition = new THREE.Vector3(10, 60, 0);
  playerMarkers.set('m1', marker);
  updatePlayerMarkers(0.1);
  // Position moved toward the target.
  assert.ok(marker.position.x > 0 && marker.position.x <= 10);
});

test('updateMobMarkers lerps mob position and applies distance opacity', () => {
  fullReset();
  const mob = makeMobMarker(30, 40, 30);
  mob.userData.targetPosition = new THREE.Vector3(60, 40, 60);
  mobMarkers.set('mob1', mob);
  camera.position.set(0, 100, 0);
  camera.updateMatrixWorld(true);
  updateMobMarkers(0.2);
  assert.ok(mob.position.x > 30);
  // Distance opacity recorded on the marker.
  assert.ok(Number.isFinite(mob.userData.distanceOpacity));
});

test('updateMobMarkers fades far mobs toward their minimum opacity', () => {
  fullReset();
  const mob = makeMobMarker(0, 40, 0);
  mob.userData.targetPosition = new THREE.Vector3(0, 40, 0);
  mobMarkers.set('far', mob);
  camera.position.set(2000, 40, 2000); // very far -> low opacity
  camera.updateMatrixWorld(true);
  // Run several frames so the opacity lerp converges.
  for (let i = 0; i < 60; i += 1) updateMobMarkers(0.1);
  assert.ok((mob.userData.badge.material.opacity ?? 1) < 1);
});

test('updatePlayerCameraMode drives eye camera when in eye mode', () => {
  fullReset();
  const marker = makePlayerMarker('eyeC', 0, 70, 0);
  playerMarkers.set('eyeC', marker);
  setPlayerEyeView('eyeC');
  const before = camera.position.clone();
  marker.position.set(5, 70, 5);
  marker.updateMatrixWorld(true);
  updatePlayerCameraMode(0.1);
  assert.ok(!camera.position.equals(before));
});

test('updatePlayerCameraMode drives the follow camera when in follow mode', () => {
  fullReset();
  const marker = makePlayerMarker('folC', 0, 60, 0);
  playerMarkers.set('folC', marker);
  setPlayerFollow('folC');
  controls.target.set(0, 0, 0);
  const before = controls.target.clone();
  marker.position.set(0, 80, 0);
  marker.updateMatrixWorld(true);
  updatePlayerCameraMode(0.2);
  assert.ok(!controls.target.equals(before));
});

test('updatePlayerCameraMode does nothing when no player mode is active', () => {
  fullReset();
  const before = camera.position.clone();
  updatePlayerCameraMode(0.1);
  assert.ok(camera.position.equals(before));
});

test('eye camera self-heals when the focused player disappears', () => {
  fullReset();
  playerMarkers.set('vanish', makePlayerMarker('vanish'));
  setPlayerEyeView('vanish');
  assert.equal(runtime.viewPlayerUuid, 'vanish');
  // Remove the marker and tick: the director should drop eye mode.
  playerMarkers.delete('vanish');
  updatePlayerCameraMode(0.1);
  assert.equal(runtime.viewPlayerUuid, null);
});
