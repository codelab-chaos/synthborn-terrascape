import assert from 'node:assert/strict';
import test from 'node:test';

import {
  logClientEvent,
  logClientTiming,
  flushClientLogs,
} from '../../../web/src/platform/client-log.ts';

// Helper that captures a single flush payload via sendBeacon, returning the parsed body.
function withBeacon(run: () => void): any {
  const originalBeacon = (navigator as any).sendBeacon;
  let captured: any = null;
  (navigator as any).sendBeacon = (_endpoint: string, blob: any) => {
    captured = blob;
    return true;
  };
  try {
    run();
  } finally {
    (navigator as any).sendBeacon = originalBeacon;
  }
  return captured;
}

async function blobToJson(blob: any): Promise<any> {
  const text = typeof blob.text === 'function' ? await blob.text() : String(blob);
  return JSON.parse(text);
}

test('logClientEvent ignores empty types and flushClientLogs with empty queue is a no-op', () => {
  // Empty type -> dropped.
  logClientEvent('');
  // Ensure the queue is empty by flushing first.
  flushClientLogs();
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  assert.equal(beacon, null);
});

test('logClientEvent queues an event and flushClientLogs sends it via sendBeacon', async () => {
  flushClientLogs(); // clear any residue
  logClientEvent('ui_ready', { detail: 'startup' });
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  assert.ok(beacon, 'expected a beacon blob to be sent');
  const body = await blobToJson(beacon);
  assert.equal(body.page, location.pathname);
  assert.equal(body.perfTelemetry, false);
  assert.ok(Array.isArray(body.events));
  const event = body.events.find((e: any) => e.type === 'ui_ready');
  assert.ok(event);
  assert.equal(event.detail, 'startup');
  assert.ok(Number.isFinite(event.seq));
});

test('perf telemetry events are dropped when telemetry is disabled', () => {
  flushClientLogs();
  logClientEvent('frame_hitch', { ms: 50 });
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  // The perf event was filtered out, leaving nothing to flush.
  assert.equal(beacon, null);
});

test('terrain progress is suppressed by default while its final summary remains', async () => {
  flushClientLogs();
  logClientEvent('terrain_stream_progress', { promoted: 3, queued: 526 });
  logClientEvent('terrain_stream_summary', { promoted: 529, queued: 0, final: true });
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  assert.ok(beacon);
  const body = await blobToJson(beacon);
  assert.deepEqual(body.events.map((event: any) => event.type), ['terrain_stream_summary']);
});

test('sanitizeEvent rounds numbers, clamps strings, and preserves booleans/null', async () => {
  flushClientLogs();
  const longString = 'x'.repeat(300);
  logClientEvent('sanitize_check', {
    rounded: 1.23456,
    notFinite: Infinity,
    flag: true,
    nothing: null,
    skipped: undefined,
    text: longString,
  });
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  const body = await blobToJson(beacon);
  const event = body.events.find((e: any) => e.type === 'sanitize_check');
  assert.equal(event.rounded, 1.23);
  assert.equal(event.notFinite, null);
  assert.equal(event.flag, true);
  assert.equal(event.nothing, null);
  assert.ok(!('skipped' in event));
  assert.equal(event.text.length, 160);
});

test('logClientTiming records a non-negative ms duration', async () => {
  flushClientLogs();
  logClientTiming('custom_timing', performance.now() + 1000, { label: 'future' });
  const beacon = withBeacon(() => {
    flushClientLogs();
  });
  const body = await blobToJson(beacon);
  const event = body.events.find((e: any) => e.type === 'custom_timing');
  assert.ok(event);
  // startedAt in the future -> clamped to 0.
  assert.equal(event.ms, 0);
  assert.equal(event.label, 'future');
});

test('flushClientLogs falls back to fetch when sendBeacon is unavailable', async () => {
  flushClientLogs();
  logClientEvent('fetch_path', { ok: true });

  const originalBeacon = (navigator as any).sendBeacon;
  const originalFetch = globalThis.fetch;
  let fetchCall: any = null;
  (navigator as any).sendBeacon = undefined;
  globalThis.fetch = (async (url: any, init: any) => {
    fetchCall = { url, init };
    return { ok: true };
  }) as any;
  try {
    flushClientLogs();
    // Allow the .catch/.finally microtasks to settle.
    await Promise.resolve();
  } finally {
    (navigator as any).sendBeacon = originalBeacon;
    globalThis.fetch = originalFetch;
  }
  assert.ok(fetchCall, 'expected fetch to be used as the fallback');
  assert.equal(fetchCall.url, '/api/client-log');
  assert.equal(fetchCall.init.method, 'POST');
  const parsed = JSON.parse(fetchCall.init.body);
  assert.ok(parsed.events.some((e: any) => e.type === 'fetch_path'));
});

test('logClientEvent caps the queue at the maximum and keeps the newest events', async () => {
  flushClientLogs();
  for (let i = 0; i < 120; i += 1) {
    logClientEvent('overflow', { i });
  }
  // Drain everything across multiple flushes and assert we never exceed the queue cap.
  const collected: any[] = [];
  for (let pass = 0; pass < 10; pass += 1) {
    const beacon = withBeacon(() => { flushClientLogs(); });
    if (!beacon) break;
    const body = await blobToJson(beacon);
    collected.push(...body.events.filter((e: any) => e.type === 'overflow'));
  }
  // At most MAX_QUEUED_EVENTS (80) overflow events should have survived.
  assert.ok(collected.length <= 80, `expected <= 80 retained, got ${collected.length}`);
  // The newest event (i=119) should be present since the cap keeps the tail.
  assert.ok(collected.some((e: any) => e.i === 119));
});
