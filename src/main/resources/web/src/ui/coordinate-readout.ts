import { playerChunk } from '../camera/camera-director.ts';
import { formatCoord } from '../common/utils.ts';
import { camera, controls } from '../scene/scene-context.ts';
import { coordCameraEl, coordChunkEl, coordTargetEl, posValueEl } from './dom.ts';

export function updateCoordinates() {
  const target = controls.target;
  const chunk = playerChunk();
  const cameraCoords = `${formatCoord(camera.position.x)}, ${formatCoord(camera.position.y)}, ${formatCoord(camera.position.z)}`;
  coordTargetEl.textContent = `${formatCoord(target.x)}, ${formatCoord(target.y)}, ${formatCoord(target.z)}`;
  coordChunkEl.textContent = `${chunk.chunkX}, ${chunk.chunkZ}`;
  coordCameraEl.textContent = cameraCoords;
  posValueEl.textContent = `[${cameraCoords}]`;
}
