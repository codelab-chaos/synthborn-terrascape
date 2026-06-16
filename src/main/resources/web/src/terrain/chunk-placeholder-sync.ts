import { playerChunk } from '../camera/camera-director.ts';
import { chunkKeysForWorld } from '../common/chunk-planning.ts';
import { centerId } from '../common/utils.ts';
import {
  chunkPlaceholderManager,
  loadedChunks,
  runtime,
} from '../scene/scene-context.ts';
import { radiusValue } from '../ui/control-readers.ts';
import { autoStreamInput, worldSelect } from '../ui/dom.ts';

export function updateChunkPlaceholders() {
  const world = worldSelect.value;
  if (!world || !runtime.hasFocusedInitialGrid) {
    return;
  }
  const radius = radiusValue();
  const player = playerChunk();
  const playerId = centerId(world, player.chunkX, player.chunkZ);
  const shouldShow = autoStreamInput.checked
    || runtime.requestedCenterId != null
    || (runtime.activeCenterId != null && playerId !== runtime.activeCenterId);
  if (!shouldShow) {
    chunkPlaceholderManager.sync(world, [], new Set(loadedChunks.keys()));
    return;
  }
  const keys = chunkKeysForWorld(world, player.chunkX, player.chunkZ, radius);
  chunkPlaceholderManager.sync(world, keys, new Set(loadedChunks.keys()));
}
