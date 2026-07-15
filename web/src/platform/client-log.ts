const CLIENT_LOG_ENDPOINT = '/api/client-log';
const FLUSH_INTERVAL_MS = 2000;
const MAX_EVENTS_PER_FLUSH = 24;
const MAX_QUEUED_EVENTS = 80;
const PERF_TELEMETRY_TYPES = new Set([
  'frame_hitch',
  'grid_load',
  'terrain_single_load',
  'terrain_stream_progress',
  'map_tile_single_load',
  'map_tiles_stream',
]);
const PERF_TELEMETRY_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  new URLSearchParams(location.search).get('perfTelemetry')?.toLowerCase() ?? '',
);

let queue = [];
let flushTimer = null;
let sequence = 0;

export function logClientEvent(type, fields = {}) {
  if (!type) return;
  if (PERF_TELEMETRY_TYPES.has(type) && !PERF_TELEMETRY_ENABLED) return;
  const event = sanitizeEvent({
    seq: ++sequence,
    t: Math.round(performance.now()),
    type,
    ...fields,
  });
  queue.push(event);
  if (queue.length > MAX_QUEUED_EVENTS) {
    queue = queue.slice(queue.length - MAX_QUEUED_EVENTS);
  }
  scheduleFlush();
}

export function logClientTiming(type, startedAt, fields = {}) {
  logClientEvent(type, {
    ...fields,
    ms: Math.round(Math.max(0, performance.now() - startedAt)),
  });
}

export function flushClientLogs() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const events = queue.splice(0, MAX_EVENTS_PER_FLUSH);
  const payload = JSON.stringify({
    page: location.pathname,
    perfTelemetry: PERF_TELEMETRY_ENABLED,
    events,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob)) {
      scheduleFlush();
      return;
    }
  }

  fetch(CLIENT_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Drop failed telemetry. The viewer must never slow down because logging is unavailable.
  }).finally(scheduleFlush);
}

function scheduleFlush() {
  if (flushTimer || queue.length === 0) return;
  flushTimer = setTimeout(flushClientLogs, FLUSH_INTERVAL_MS);
}

function sanitizeEvent(event) {
  const sanitized = {};
  for (const [key, value] of Object.entries(event)) {
    if (typeof value === 'number') {
      sanitized[key] = Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    } else if (typeof value === 'boolean' || value === null) {
      sanitized[key] = value;
    } else if (value === undefined) {
      continue;
    } else {
      sanitized[key] = String(value).slice(0, 160);
    }
  }
  return sanitized;
}

window.addEventListener('pagehide', flushClientLogs);
