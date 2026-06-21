import { worldTimePollDelayMs as computeWorldTimePollDelayMs } from '../common/entity-feed-policy.ts';
import { apiFetch } from '../platform/api-client.ts';
import { logClientEvent } from '../platform/client-log.ts';
import { applyLighting } from '../scene/lighting-controls.ts';
import { runtime, timeRibbon } from '../scene/scene-context.ts';
import { mapTimeInput, worldSelect } from '../ui/dom.ts';

const MAP_TIME_ACTIVE_POLL_MS = 5000;
const MAP_TIME_VISIBLE_POLL_MS = 10000;
const MAP_TIME_IDLE_POLL_MS = 30000;

export async function refreshWorldTime() {
  if (!worldSelect.value) {
    return;
  }
  try {
    const response = await apiFetch(`/api/time/${encodeURIComponent(worldSelect.value)}`);
    if (!response.ok) {
      throw new Error(`Time request failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.ok) {
      runtime.worldTime = data;
      applyLighting();
      timeRibbon.update(runtime.worldTime);
    }
  } catch (error) {
    console.warn('World time refresh failed', error);
    logClientEvent('world_time_refresh_failed', { error: error?.message ?? error });
  }
}

function worldTimePollDelayMs() {
  return computeWorldTimePollDelayMs({
    mapTimeEnabled: mapTimeInput.checked,
    lastPlayerCount: runtime.lastPlayerCount,
    activeMs: MAP_TIME_ACTIVE_POLL_MS,
    visibleMs: MAP_TIME_VISIBLE_POLL_MS,
    idleMs: MAP_TIME_IDLE_POLL_MS,
  });
}

export function restartWorldTimePolling(delayMs = worldTimePollDelayMs()) {
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = setTimeout(async () => {
    await refreshWorldTime();
    restartWorldTimePolling();
  }, delayMs);
}
