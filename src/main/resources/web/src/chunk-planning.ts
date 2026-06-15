import { chunkId } from './utils.js';

export function chunkKeysForWorld(world: string, centerX: number, centerZ: number, radius: number) {
  const keys = [];
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const chunkX = centerX + dx;
      const chunkZ = centerZ + dz;
      keys.push({
        chunkX,
        chunkZ,
        id: chunkId(world, chunkX, chunkZ),
      });
    }
  }
  return keys;
}

export function sortChunkKeysByPlayerDistance<T extends { chunkX: number; chunkZ: number }>(
  keys: T[],
  playerChunkX: number,
  playerChunkZ: number,
) {
  return [...keys].sort((left, right) => {
    const leftDistance = chunkDistanceSq(left.chunkX, left.chunkZ, playerChunkX, playerChunkZ);
    const rightDistance = chunkDistanceSq(right.chunkX, right.chunkZ, playerChunkX, playerChunkZ);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left.chunkZ - right.chunkZ || left.chunkX - right.chunkX;
  });
}

export function chunkDistanceSq(chunkX: number, chunkZ: number, centerX: number, centerZ: number) {
  const dx = chunkX - centerX;
  const dz = chunkZ - centerZ;
  return dx * dx + dz * dz;
}
