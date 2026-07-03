export function positiveIntegerMs(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function worldTimePollDelayMs({
  syncTimeEnabled,
  lastPlayerCount,
  activeMs,
  visibleMs,
  idleMs,
}: {
  syncTimeEnabled: boolean;
  lastPlayerCount: number;
  activeMs: number;
  visibleMs: number;
  idleMs: number;
}) {
  if (syncTimeEnabled) {
    return activeMs;
  }
  return lastPlayerCount > 0 ? visibleMs : idleMs;
}

export function playerPollDelayMs({
  lastPollFailed,
  showPlayers,
  lastPlayerCount,
  requestedRateMs,
  focused,
  errorMs,
  hiddenMs,
  emptyMs,
  focusedMinMs,
}: {
  lastPollFailed: boolean;
  showPlayers: boolean;
  lastPlayerCount: number;
  requestedRateMs: number;
  focused: boolean;
  errorMs: number;
  hiddenMs: number;
  emptyMs: number;
  focusedMinMs: number;
}) {
  if (lastPollFailed) {
    return errorMs;
  }
  if (!showPlayers) {
    return hiddenMs;
  }
  if (lastPlayerCount <= 0) {
    return emptyMs;
  }
  return focused ? Math.max(requestedRateMs, focusedMinMs) : requestedRateMs;
}

export function liveMobFeedEnabled(showMobs: boolean, lastPlayerCount: number) {
  return showMobs && lastPlayerCount > 0;
}

export function mobPollDelayMs({
  showMobs,
  liveMobFeed,
  lastPollFailed,
  lastMobCount,
  activeMs,
  emptyMs,
  errorMs,
}: {
  showMobs: boolean;
  liveMobFeed: boolean;
  lastPollFailed: boolean;
  lastMobCount: number;
  activeMs: number;
  emptyMs: number;
  errorMs: number;
}) {
  if (!showMobs) {
    return null;
  }
  if (!liveMobFeed) {
    return emptyMs;
  }
  if (lastPollFailed) {
    return errorMs;
  }
  return lastMobCount > 0 ? activeMs : emptyMs;
}

export function wantsEntityStream({
  world,
  showPlayers,
  liveMobFeed,
}: {
  world: string | null | undefined;
  showPlayers: boolean;
  liveMobFeed: boolean;
}) {
  return Boolean(world && (showPlayers || liveMobFeed));
}
