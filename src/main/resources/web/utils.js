export function chunkId(world, chunkX, chunkZ) {
  return `${world}:${chunkX}:${chunkZ}`;
}

export function centerId(world, chunkX, chunkZ) {
  return `${world}:${chunkX}:${chunkZ}`;
}

export function numberOr(value, fallback) {
  return Number.isNaN(value) ? fallback : value;
}

export function formatCoord(value) {
  return Math.round(value).toString();
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
