export function terrainTuningControlValue(input, fallback) {
  const parsed = Number.parseInt(input?.value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const min = Number.parseInt(input?.min ?? '', 10);
  const max = Number.parseInt(input?.max ?? '', 10);
  return clamp(parsed, Number.isFinite(min) ? min : 1, Number.isFinite(max) ? max : 64);
}

export function floatControlValue(input, fallback) {
  const parsed = Number.parseFloat(input?.value ?? '');
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const min = Number.parseFloat(input?.min ?? '');
  const max = Number.parseFloat(input?.max ?? '');
  return clamp(
    parsed,
    Number.isFinite(min) ? min : -Infinity,
    Number.isFinite(max) ? max : Infinity,
  );
}

export function fogRangeFromControls(nearInput, farInput, defaults = { near: 150, far: 620 }) {
  const near = terrainTuningControlValue(nearInput, defaults.near);
  const far = Math.max(near + 1, terrainTuningControlValue(farInput, defaults.far));
  return { near, far };
}

export function safeWaterMode(value) {
  return value === 'solid' || value === 'transparent' || value === 'hidden' ? value : 'solid';
}

export function radiusReadout(radius) {
  const safeRadius = Math.max(0, Number.isFinite(radius) ? Math.floor(radius) : 0);
  const diameter = safeRadius * 2 + 1;
  const chunks = diameter * diameter;
  return {
    radius: safeRadius,
    diameter,
    chunks,
    text: `${diameter} x ${diameter} chunks, ${chunks} meshes`,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
