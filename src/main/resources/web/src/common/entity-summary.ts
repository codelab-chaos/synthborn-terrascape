export function summarizeItems<T>(items: T[], selector: (item: T) => unknown, limit = 10) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = String(selector(item) ?? 'unknown');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join('|');
}

export function summarizeCountsObject(countsObject: Record<string, unknown> | null | undefined, limit = 10) {
  return Object.entries(countsObject ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join('|');
}

export function compactMobSourceStats(stats) {
  if (!stats || typeof stats !== 'object') return null;
  return compactObject({
    source: stats.source,
    chunks: stats.chunks,
    accepted: stats.accepted,
    duplicate: stats.duplicate,
    outsideRadar: stats.outsideRadar,
    nonMob: stats.nonMob,
    skippedTypes: summarizeCountsObject(stats.skippedTypes, 8),
  });
}

export function nearestMobsForSample(mobs, player, limit) {
  return mobs
    .map((mob) => ({
      mob,
      distance: distanceBetween(mob, player),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ mob, distance }) => compactObject({
      type: mob.type,
      label: mob.label,
      category: mob.category,
      source: mob.source,
      x: roundCoord(mob.x),
      y: roundCoord(mob.y),
      z: roundCoord(mob.z),
      d: Number.isFinite(distance) ? Math.round(distance) : null,
    }));
}

export function distanceBetween(a, b) {
  if (![a?.x, a?.y, a?.z, b?.x, b?.y, b?.z].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function roundCoord(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

export function compactObject(object) {
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result;
}
