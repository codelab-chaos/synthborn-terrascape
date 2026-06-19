import * as THREE from 'three';
import { isTypingInHud } from '../ui/app-events.ts';
import {
  camera,
  controls,
  pressedKeys,
  renderer,
  runtime,
} from '../scene/scene-context.ts';

const FLY_LOOK_DISTANCE = 64;
const FLY_MOUSE_SENSITIVITY = 0.0022;
const FLY_MOVE_SPEED = 72;
const FLY_SPRINT_MULTIPLIER = 3;
const FLY_ZOOM_STEP = 18;
const FLY_ZOOM_MAX_TICKS = 6;
const FLY_MIN_Y = 8;
const FLY_MAX_Y = 1200;

const tempCameraForward = new THREE.Vector3();
const tempCenteredPivot = new THREE.Vector3();
const tempFlyRight = new THREE.Vector3();
const tempFlyMove = new THREE.Vector3();
const tempFlyZoom = new THREE.Vector3();
const tempFlyEuler = new THREE.Euler(0, 0, 0, 'YXZ');

export function syncFlyLookFromCamera() {
  camera.getWorldDirection(tempCameraForward);
  if (tempCameraForward.lengthSq() < 0.0001) return;
  runtime.flyYaw = Math.atan2(-tempCameraForward.x, -tempCameraForward.z);
  runtime.flyPitch = Math.asin(Math.max(-1, Math.min(1, tempCameraForward.y)));
}

export function applyFlyLook() {
  runtime.flyPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, runtime.flyPitch));
  tempFlyEuler.set(runtime.flyPitch, runtime.flyYaw, 0);
  camera.quaternion.setFromEuler(tempFlyEuler);
  updateFlyTarget();
}

export function updateFlyTarget() {
  camera.getWorldDirection(tempCameraForward);
  tempCenteredPivot.copy(camera.position).addScaledVector(tempCameraForward, FLY_LOOK_DISTANCE);
  controls.target.copy(tempCenteredPivot);
}

export function zoomFlyView(deltaY) {
  if (runtime.viewPlayerUuid || !Number.isFinite(deltaY) || deltaY === 0) return;
  camera.getWorldDirection(tempCameraForward);
  if (tempCameraForward.lengthSq() < 0.0001) return;

  const ticks = Math.max(-FLY_ZOOM_MAX_TICKS, Math.min(FLY_ZOOM_MAX_TICKS, deltaY / 100));
  tempFlyZoom.copy(tempCameraForward).multiplyScalar(-ticks * FLY_ZOOM_STEP);
  const nextY = camera.position.y + tempFlyZoom.y;
  if (nextY < FLY_MIN_Y || nextY > FLY_MAX_Y) {
    tempFlyZoom.y = Math.max(FLY_MIN_Y, Math.min(FLY_MAX_Y, nextY)) - camera.position.y;
  }
  camera.position.add(tempFlyZoom);
  updateFlyTarget();
}

export function shouldStartFlyLook(event) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey;
}

export function isFlyLookActive() {
  return document.pointerLockElement === renderer.domElement;
}

export function applyFlyLookDelta(movementX, movementY) {
  runtime.flyYaw -= Number(movementX) * FLY_MOUSE_SENSITIVITY;
  runtime.flyPitch -= Number(movementY) * FLY_MOUSE_SENSITIVITY;
  applyFlyLook();
}

export function handleKeyboardNavigation(deltaSeconds) {
  if (runtime.viewPlayerUuid || pressedKeys.size === 0 || isTypingInHud()) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  if (forward.lengthSq() < 0.0001) return;
  forward.normalize();

  tempFlyRight.crossVectors(forward, camera.up);
  if (tempFlyRight.lengthSq() < 0.0001) {
    tempFlyRight.set(1, 0, 0);
  } else {
    tempFlyRight.normalize();
  }
  tempFlyMove.set(0, 0, 0);

  if (pressedKeys.has('KeyW')) tempFlyMove.add(forward);
  if (pressedKeys.has('KeyS')) tempFlyMove.sub(forward);
  if (pressedKeys.has('KeyA') || pressedKeys.has('KeyQ')) tempFlyMove.sub(tempFlyRight);
  if (pressedKeys.has('KeyD') || pressedKeys.has('KeyE')) tempFlyMove.add(tempFlyRight);
  if (pressedKeys.has('Space') || pressedKeys.has('KeyR') || pressedKeys.has('PageUp')) tempFlyMove.y += 1;
  if (pressedKeys.has('KeyC') || pressedKeys.has('PageDown')) tempFlyMove.y -= 1;

  if (tempFlyMove.lengthSq() === 0) return;
  tempFlyMove.normalize();

  const boost = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? FLY_SPRINT_MULTIPLIER : 1;
  tempFlyMove.multiplyScalar(FLY_MOVE_SPEED * boost * deltaSeconds);
  camera.position.add(tempFlyMove);
  updateFlyTarget();
}
