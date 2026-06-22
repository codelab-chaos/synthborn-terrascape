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

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
