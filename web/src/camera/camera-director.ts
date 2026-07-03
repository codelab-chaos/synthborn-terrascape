import * as THREE from 'three';
import { disposeObject, updateMobMarkerHeight } from '../entities/players.ts';
import { clamp } from '../common/utils.ts';
import { syncFlyLookFromCamera, updateFlyTarget } from './fly-camera.ts';
import {
  camera,
  cameraModeStack,
  controls,
  mobMarkers,
  playerEyeState,
  playerMarkers,
  runtime,
  scene,
  FLY_MOUSE_BUTTONS,
  FOLLOW_MOUSE_BUTTONS,
} from '../scene/scene-context.ts';
import { updatePlayers, restartPlayerPolling } from '../entities/entity-feed.ts';
import { saveViewState } from '../ui/view-persistence.ts';

const PLAYER_EYE_ROTATION_LERP = 14;
const FOLLOW_CAMERA_TARGET_HEIGHT = 2.1;
const FOLLOW_CAMERA_DEFAULT_DISTANCE = 58;
const FOLLOW_CAMERA_HEIGHT_RATIO = 0.42;
const FOLLOW_CAMERA_MIN_HEIGHT = 10;
const FOLLOW_CAMERA_MAX_HEIGHT = 34;
const FOLLOW_CAMERA_LOCK_LERP = 8;
const FOLLOW_CAMERA_IDLE_DELAY_MS = 900;
const FOLLOW_CAMERA_IDLE_SNAP_LERP = 7.5;
const FOLLOW_CAMERA_TETHER_START = 18;
const FOLLOW_CAMERA_TETHER_MAX = 120;
const FOLLOW_CAMERA_TETHER_LERP = 1.35;
const MOB_CARD_MIN_HEIGHT = 3.4;
const MOB_CARD_PLAYER_HEIGHT = 4.8;
const MOB_CARD_TREE_TOP_HEIGHT = 24;
const MOB_MARKER_FADE_NEAR_DISTANCE = 140;
const MOB_MARKER_FADE_FAR_DISTANCE = 980;
const MOB_MARKER_CARD_MIN_OPACITY = 0.34;
const MOB_MARKER_POINTER_MIN_OPACITY = 0.18;
const MOB_MARKER_GLOW_MIN_OPACITY = 0.1;
const MOB_MARKER_DISTANCE_OPACITY_LERP = 8;

const tempPlayerTarget = new THREE.Vector3();
const tempMobTarget = new THREE.Vector3();
const lastMobBillboardQuaternion = new THREE.Quaternion();
const tempPlayerCamera = new THREE.Vector3();
const tempPlayerLook = new THREE.Vector3();
const tempPlayerForward = new THREE.Vector3();
const tempPlayerCardQuaternion = new THREE.Quaternion();
const tempPlayerParentQuaternion = new THREE.Quaternion();
const tempFollowDelta = new THREE.Vector3();
const tempFollowTarget = new THREE.Vector3();
const tempFollowIdealCamera = new THREE.Vector3();
const tempFollowOffset = new THREE.Vector3();
const tempFollowCorrection = new THREE.Vector3();
const lastFollowTarget = new THREE.Vector3();
let hasLastFollowTarget = false;

export function focusPlayer(uuid) {
  const marker = playerMarkers.get(uuid);
  if (!marker) return;
  const target = marker.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  const offset = new THREE.Vector3(34, 28, 34);
  resetCameraModes();
  controls.target.copy(target);
  camera.position.copy(target).add(offset);
  controls.update();
  syncFlyLookFromCamera();
  saveViewState();
  updatePlayers(currentPlayersFromMarkers());
}

export function setPlayerEyeView(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('eye', uuid);
    resetPlayerEyeState(uuid);
    updateEyeCamera(0);
  } else if (runtime.viewPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

export function setPlayerFollow(uuid) {
  if (uuid && !playerMarkers.has(uuid)) return;
  if (uuid) {
    pushCameraMode('follow', uuid);
  } else if (runtime.followPlayerUuid) {
    popCameraMode();
  }
  updatePlayers(currentPlayersFromMarkers());
  restartPlayerPolling();
}

function pushCameraMode(mode, uuid) {
  if ((mode === 'eye' && runtime.viewPlayerUuid === uuid) || (mode === 'follow' && runtime.followPlayerUuid === uuid)) {
    popCameraMode();
    return;
  }

  cameraModeStack.push(captureCameraModeState());
  applyCameraMode(mode, uuid);
}

export function popCameraMode() {
  while (cameraModeStack.length > 0) {
    const previous = cameraModeStack.pop();
    if (restoreCameraModeState(previous)) {
      updatePlayers(currentPlayersFromMarkers());
      restartPlayerPolling();
      return;
    }
  }
  resetCameraModes();
}

export function currentPlayersFromMarkers() {
  return Array.from(playerMarkers.values()).map((markerEntry) => markerEntry.userData.player).filter(Boolean);
}

function resetCameraModes() {
  cameraModeStack.length = 0;
  runtime.viewPlayerUuid = null;
  runtime.followPlayerUuid = null;
  runtime.followCameraDistance = FOLLOW_CAMERA_DEFAULT_DISTANCE;
  runtime.followCameraDetached = false;
  runtime.followCameraLastInputAt = 0;
  hasLastFollowTarget = false;
  playerEyeState.uuid = null;
  setFollowControlsEnabled(false);
}

function captureCameraModeState() {
  return {
    camera: camera.position.clone(),
    target: controls.target.clone(),
    viewPlayerUuid: runtime.viewPlayerUuid,
    followPlayerUuid: runtime.followPlayerUuid,
    controlsEnabled: controls.enabled,
    followCameraDistance: runtime.followCameraDistance,
    followCameraDetached: runtime.followCameraDetached,
    followCameraLastInputAt: runtime.followCameraLastInputAt,
  };
}

function restoreCameraModeState(state) {
  if (!state) return false;
  if (state.viewPlayerUuid && !playerMarkers.has(state.viewPlayerUuid)) return false;
  if (state.followPlayerUuid && !playerMarkers.has(state.followPlayerUuid)) return false;

  camera.position.copy(state.camera);
  controls.target.copy(state.target);
  runtime.viewPlayerUuid = state.viewPlayerUuid;
  runtime.followPlayerUuid = state.followPlayerUuid;
  runtime.followCameraDistance = Number.isFinite(state.followCameraDistance)
    ? state.followCameraDistance
    : FOLLOW_CAMERA_DEFAULT_DISTANCE;
  runtime.followCameraDetached = state.followCameraDetached === true;
  runtime.followCameraLastInputAt = Number.isFinite(state.followCameraLastInputAt)
    ? state.followCameraLastInputAt
    : 0;
  hasLastFollowTarget = false;
  if (runtime.viewPlayerUuid) {
    resetPlayerEyeState(runtime.viewPlayerUuid);
  } else {
    playerEyeState.uuid = null;
  }
  setFollowControlsEnabled(Boolean(runtime.followPlayerUuid));
  controls.update();
  syncFlyLookFromCamera();
  saveViewState();
  return true;
}

function applyCameraMode(mode, uuid) {
  runtime.viewPlayerUuid = mode === 'eye' ? uuid : null;
  runtime.followPlayerUuid = mode === 'follow' ? uuid : null;
  setFollowControlsEnabled(mode === 'follow');
  if (mode === 'follow') {
    runtime.followCameraDistance = FOLLOW_CAMERA_DEFAULT_DISTANCE;
    runtime.followCameraDetached = false;
    runtime.followCameraLastInputAt = 0;
    hasLastFollowTarget = false;
    updateWalkFollowCamera(1);
  }
}

function setFollowControlsEnabled(enabled) {
  controls.enabled = false;
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.mouseButtons = enabled ? FOLLOW_MOUSE_BUTTONS : FLY_MOUSE_BUTTONS;
}

export function focusGrid(centerX, centerZ, radius) {
  const center = new THREE.Vector3(centerX * 32 + 16, 122, centerZ * 32 + 16);
  camera.position.set(center.x, center.y + 58, center.z);
  controls.target.copy(center);
  camera.lookAt(center);
  controls.update();
  syncFlyLookFromCamera();
  updateFlyTarget();
  saveViewState();
}

export function playerChunk() {
  const anchor = streamAnchorPosition();
  return {
    chunkX: Math.floor(anchor.x / 32),
    chunkZ: Math.floor(anchor.z / 32),
  };
}

function streamAnchorPosition() {
  const focusedMarker = playerMarkers.get(runtime.viewPlayerUuid) ?? playerMarkers.get(runtime.followPlayerUuid);
  const targetPosition = focusedMarker?.userData?.targetPosition;
  if (targetPosition) {
    return targetPosition;
  }
  if (focusedMarker?.position) {
    return focusedMarker.position;
  }
  return camera.position;
}

export function updatePlayerMarkers(deltaSeconds) {
  const alpha = 1 - Math.exp(-deltaSeconds * 10);
  for (const marker of playerMarkers.values()) {
    const targetPosition = marker.userData.targetPosition;
    if (targetPosition) {
      marker.position.lerp(targetPosition, alpha);
    }
    const targetYaw = marker.userData.targetYaw;
    if (Number.isFinite(targetYaw)) {
      marker.rotation.y = lerpAngle(marker.rotation.y, targetYaw, alpha);
    }
    const card = marker.userData.card;
    if (card) {
      marker.getWorldQuaternion(tempPlayerParentQuaternion);
      tempPlayerCardQuaternion.copy(tempPlayerParentQuaternion).invert().multiply(camera.quaternion);
      card.quaternion.copy(tempPlayerCardQuaternion);
    }
  }
}

export function updateMobMarkers(deltaSeconds) {
  const alpha = 1 - Math.exp(-deltaSeconds * 5);
  const opacityAlpha = 1 - Math.exp(-deltaSeconds * MOB_MARKER_DISTANCE_OPACITY_LERP);
  const playerHeightSource = playerMarkers.get(runtime.viewPlayerUuid) ?? playerMarkers.get(runtime.followPlayerUuid);
  const desiredWorldY = playerHeightSource
    ? playerHeightSource.position.y + MOB_CARD_PLAYER_HEIGHT
    : camera.position.y;
  const updateBillboards = !runtime.hasMobBillboardQuaternion
    || lastMobBillboardQuaternion.angleTo(camera.quaternion) > 0.0005;
  if (updateBillboards) {
    lastMobBillboardQuaternion.copy(camera.quaternion);
    runtime.hasMobBillboardQuaternion = true;
  }
  for (const marker of mobMarkers.values()) {
    const targetPosition = marker.userData.targetPosition;
    if (targetPosition) {
      tempMobTarget.copy(targetPosition);
      tempMobTarget.y += 0.25;
      marker.position.lerp(tempMobTarget, alpha);
      const cardHeight = clamp(
        desiredWorldY - targetPosition.y,
        MOB_CARD_MIN_HEIGHT,
        MOB_CARD_TREE_TOP_HEIGHT,
      );
      if (!Number.isFinite(marker.userData.cardHeight)
          || Math.abs(marker.userData.cardHeight - cardHeight) > 0.05) {
        updateMobMarkerHeight(marker, cardHeight);
        marker.userData.cardHeight = cardHeight;
      }
    }
    const badge = marker.userData.badge;
    if (badge && updateBillboards) {
      badge.quaternion.copy(camera.quaternion);
    }
    applyMobMarkerDistanceOpacity(marker, opacityAlpha);
  }
}

function applyMobMarkerDistanceOpacity(marker, alpha = 1) {
  const distance = marker.position.distanceTo(camera.position);
  const cardOpacity = distanceOpacity(distance, MOB_MARKER_CARD_MIN_OPACITY);
  const pointerOpacity = distanceOpacity(distance, MOB_MARKER_POINTER_MIN_OPACITY);
  const glowOpacity = distanceOpacity(distance, MOB_MARKER_GLOW_MIN_OPACITY);
  const current = Number.isFinite(marker.userData.distanceOpacity)
    ? marker.userData.distanceOpacity
    : cardOpacity;
  const next = current + (cardOpacity - current) * clamp(alpha, 0, 1);
  marker.userData.distanceOpacity = next;
  applyMaterialOpacity(marker.userData.badge, next);
  applyMaterialOpacity(marker.userData.pointer, pointerOpacity);
  applyMaterialOpacity(marker.getObjectByName('mob-ground-glow'), glowOpacity);
}

function distanceOpacity(distance, minOpacity) {
  const t = clamp(
    (distance - MOB_MARKER_FADE_NEAR_DISTANCE) / (MOB_MARKER_FADE_FAR_DISTANCE - MOB_MARKER_FADE_NEAR_DISTANCE),
    0,
    1,
  );
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth * (1 - minOpacity);
}

function applyMaterialOpacity(object, opacityScale) {
  if (!object?.material) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    if (!material || material.userData?.terrascapeShared === true) continue;
    const baseOpacity = Number.isFinite(material.userData.terrascapeBaseOpacity)
      ? material.userData.terrascapeBaseOpacity
      : material.opacity;
    material.userData.terrascapeBaseOpacity = baseOpacity;
    const nextOpacity = clamp(baseOpacity * opacityScale, 0, 1);
    if (Math.abs((material.opacity ?? 1) - nextOpacity) < 0.003) continue;
    material.opacity = nextOpacity;
    material.transparent = true;
    material.needsUpdate = true;
  }
}

export function updatePlayerCameraMode(deltaSeconds) {
  if (runtime.viewPlayerUuid) {
    updateEyeCamera(deltaSeconds);
    return;
  }
  if (runtime.followPlayerUuid) {
    updateWalkFollowCamera(deltaSeconds);
  }
}

function resetPlayerEyeState(uuid) {
  const marker = playerMarkers.get(uuid);
  if (!marker) return;
  playerEyeState.uuid = uuid;
  playerEyeState.yawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : 0;
  playerEyeState.pitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
}

function updateEyeCamera(deltaSeconds = 0) {
  const marker = playerMarkers.get(runtime.viewPlayerUuid);
  if (!marker) {
    setPlayerEyeView(null);
    return;
  }
  if (playerEyeState.uuid !== runtime.viewPlayerUuid) {
    resetPlayerEyeState(runtime.viewPlayerUuid);
  }
  const targetYawRad = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : playerEyeState.yawRad;
  const targetPitchRad = playerCameraPitchRad(marker.userData.targetPitch ?? 0);
  const alpha = deltaSeconds > 0 ? 1 - Math.exp(-deltaSeconds * PLAYER_EYE_ROTATION_LERP) : 1;
  playerEyeState.yawRad = lerpAngle(playerEyeState.yawRad, targetYawRad, alpha);
  playerEyeState.pitchRad = THREE.MathUtils.lerp(playerEyeState.pitchRad, targetPitchRad, alpha);

  const lookDistance = 12;
  const cosPitch = Math.cos(playerEyeState.pitchRad);
  tempPlayerForward.set(
    -Math.sin(playerEyeState.yawRad) * cosPitch,
    Math.sin(playerEyeState.pitchRad),
    -Math.cos(playerEyeState.yawRad) * cosPitch,
  );
  tempPlayerCamera.copy(marker.position);
  tempPlayerCamera.y += 2.45;
  tempPlayerCamera.addScaledVector(tempPlayerForward, 0.44);
  tempPlayerLook.copy(tempPlayerCamera).addScaledVector(tempPlayerForward, lookDistance);
  camera.position.copy(tempPlayerCamera);
  controls.target.copy(tempPlayerLook);
  camera.lookAt(tempPlayerLook);
}

export function playerCameraYawRad(yawDeg) {
  // Hytale client yaw arrives in degrees. Keep the sign direct for this FPV rig:
  // negating it makes real left turns render as right turns.
  return THREE.MathUtils.degToRad(Number(yawDeg || 0));
}

function playerCameraPitchRad(pitchDeg) {
  return THREE.MathUtils.degToRad(clamp(Number(pitchDeg || 0), -89, 89));
}

function updateWalkFollowCamera(deltaSeconds) {
  const marker = playerMarkers.get(runtime.followPlayerUuid);
  if (!marker) {
    setPlayerFollow(null);
    return;
  }
  followTarget(marker, tempFollowTarget);
  followIdealCamera(marker, tempFollowTarget, tempFollowIdealCamera);

  if (!hasLastFollowTarget) {
    lastFollowTarget.copy(tempFollowTarget);
    hasLastFollowTarget = true;
  }
  tempFollowDelta.copy(tempFollowTarget).sub(lastFollowTarget);
  if (tempFollowDelta.lengthSq() > 0) {
    camera.position.add(tempFollowDelta);
    controls.target.add(tempFollowDelta);
    lastFollowTarget.copy(tempFollowTarget);
  }

  if (!runtime.followCameraDetached) {
    const alpha = lerpAlpha(deltaSeconds, FOLLOW_CAMERA_LOCK_LERP);
    camera.position.lerp(tempFollowIdealCamera, alpha);
    controls.target.lerp(tempFollowTarget, alpha);
    camera.lookAt(controls.target);
    syncFlyLookFromCamera();
    return;
  }

  const idleMs = performance.now() - (runtime.followCameraLastInputAt || 0);
  if (idleMs >= FOLLOW_CAMERA_IDLE_DELAY_MS) {
    const alpha = lerpAlpha(deltaSeconds, FOLLOW_CAMERA_IDLE_SNAP_LERP);
    camera.position.lerp(tempFollowIdealCamera, alpha);
    controls.target.lerp(tempFollowTarget, alpha);
    camera.lookAt(controls.target);
    syncFlyLookFromCamera();
    if (camera.position.distanceTo(tempFollowIdealCamera) < 0.35 && controls.target.distanceTo(tempFollowTarget) < 0.2) {
      camera.position.copy(tempFollowIdealCamera);
      controls.target.copy(tempFollowTarget);
      camera.lookAt(controls.target);
      syncFlyLookFromCamera();
      runtime.followCameraDetached = false;
    }
    return;
  }

  tempFollowOffset.copy(camera.position).sub(tempFollowIdealCamera);
  const offsetLength = tempFollowOffset.length();
  if (offsetLength > FOLLOW_CAMERA_TETHER_START) {
    const excess = clamp(
      (offsetLength - FOLLOW_CAMERA_TETHER_START) / (FOLLOW_CAMERA_TETHER_MAX - FOLLOW_CAMERA_TETHER_START),
      0,
      1,
    );
    const alpha = lerpAlpha(deltaSeconds, FOLLOW_CAMERA_TETHER_LERP * (0.35 + excess * 1.65));
    tempFollowCorrection.copy(tempFollowOffset).multiplyScalar(-alpha);
    camera.position.add(tempFollowCorrection);
    controls.target.add(tempFollowCorrection);
  }
}

function followTarget(marker, target) {
  return target.copy(marker.position).setY(marker.position.y + FOLLOW_CAMERA_TARGET_HEIGHT);
}

function followIdealCamera(marker, target, out) {
  const yaw = Number.isFinite(marker.userData.targetYaw) ? marker.userData.targetYaw : marker.rotation.y;
  tempPlayerForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (tempPlayerForward.lengthSq() < 0.0001) {
    tempPlayerForward.set(0, 0, -1);
  } else {
    tempPlayerForward.normalize();
  }
  const distance = Number.isFinite(runtime.followCameraDistance)
    ? runtime.followCameraDistance
    : FOLLOW_CAMERA_DEFAULT_DISTANCE;
  const height = clamp(distance * FOLLOW_CAMERA_HEIGHT_RATIO, FOLLOW_CAMERA_MIN_HEIGHT, FOLLOW_CAMERA_MAX_HEIGHT);
  return out.copy(target)
    .addScaledVector(tempPlayerForward, -distance)
    .setY(target.y + height);
}

function lerpAlpha(deltaSeconds, speed) {
  return 1 - Math.exp(-Math.max(0, deltaSeconds) * speed);
}

function lerpAngle(current, target, alpha) {
  const delta = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + delta * alpha;
}
