/** Deterministic coordinate noise in [0, maxDelayMs], suitable for visual reveal timing. */
export function spatialStaggerDelayMs(chunkX: number, chunkZ: number, maxDelayMs: number) {
  const boundedMax = Math.max(0, Math.floor(maxDelayMs));
  let hash = Math.imul(chunkX, 0x1f123bb5) ^ Math.imul(chunkZ, 0x5f356495);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  return Math.floor((hash >>> 0) / 0x1_0000_0000 * (boundedMax + 1));
}
