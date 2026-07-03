import assert from 'node:assert/strict';
import test from 'node:test';

import {
  refreshWorldTime,
  restartWorldTimePolling,
} from '../../../web/src/entities/world-time-feed.ts';
import { runtime } from '../../../web/src/scene/scene-context.ts';
import { worldSelect, syncTimeInput } from '../../../web/src/ui/dom.ts';

// The failure paths call logClientEvent, which schedules a deferred telemetry flush
// (navigator.sendBeacon / fetch to /api/client-log) that fires ~2s later and would
// otherwise surface as an unhandledRejection after the test ends. Neutralize the
// beacon and swallow that specific noise so it cannot fail an otherwise-green run.
(globalThis as unknown as { navigator: { sendBeacon: () => boolean } }).navigator.sendBeacon =
  () => true;
process.on('unhandledRejection', (reason) => {
  const message = String((reason as { message?: string })?.message ?? reason);
  if (
    message.includes('client-log')
    || message.includes('ECONNREFUSED')
    || message.includes('NetworkError')
    || message.includes('fetch')
  ) {
    return;
  }
  throw reason;
});

test.after(() => {
  clearTimeout(runtime.timePollTimer);
});

function selectWorld(value: string) {
  // happy-dom only honors a <select>.value that matches an existing <option>.
  if (value && !worldSelect.querySelector(`option[value="${value}"]`)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    worldSelect.appendChild(option);
  }
  (worldSelect as unknown as { value: string }).value = value;
}

function stubFetch(handler: (url: string) => unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => handler(String(url))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test('refreshWorldTime is a no-op when no world is selected', async () => {
  selectWorld('');
  runtime.worldTime = null;
  let called = false;
  const restore = stubFetch(() => {
    called = true;
    return { ok: true, json: async () => ({}) };
  });
  try {
    await refreshWorldTime();
    assert.equal(called, false);
    assert.equal(runtime.worldTime, null);
  } finally {
    restore();
  }
});

test('refreshWorldTime stores world time and applies lighting', async () => {
  selectWorld('overworld');
  runtime.worldTime = null;
  const restore = stubFetch((url) => {
    assert.ok(url.includes('/api/time/overworld'));
    return {
      ok: true,
      json: async () => ({
        ok: true,
        dayProgress: 0.5,
        sunlightFactor: 1,
        phase: 'noon',
        sunDirection: { x: 0.2, y: -1, z: 0.25 },
      }),
    };
  });
  try {
    await refreshWorldTime();
    assert.ok(runtime.worldTime);
    assert.equal(runtime.worldTime.phase, 'noon');
  } finally {
    restore();
    selectWorld('');
  }
});

test('refreshWorldTime ignores payloads without ok flag', async () => {
  selectWorld('overworld');
  runtime.worldTime = null;
  const restore = stubFetch(() => ({ ok: true, json: async () => ({ ok: false }) }));
  try {
    await refreshWorldTime();
    assert.equal(runtime.worldTime, null);
  } finally {
    restore();
    selectWorld('');
  }
});

test('refreshWorldTime swallows non-ok responses', async () => {
  selectWorld('overworld');
  runtime.worldTime = null;
  const restore = stubFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
  try {
    await refreshWorldTime();
    assert.equal(runtime.worldTime, null);
  } finally {
    restore();
    selectWorld('');
  }
});

test('refreshWorldTime swallows fetch errors', async () => {
  selectWorld('overworld');
  const restore = stubFetch(() => {
    throw new Error('network down');
  });
  try {
    await refreshWorldTime();
    assert.ok(true);
  } finally {
    restore();
    selectWorld('');
  }
});

test('restartWorldTimePolling schedules a timer it can clear', () => {
  syncTimeInput.checked = false;
  runtime.lastPlayerCount = 0;
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = null;
  restartWorldTimePolling(100000);
  assert.ok(runtime.timePollTimer != null);
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = null;
});

test('restartWorldTimePolling uses default delay derived from policy', () => {
  syncTimeInput.checked = true;
  runtime.lastPlayerCount = 3;
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = null;
  restartWorldTimePolling();
  assert.ok(runtime.timePollTimer != null);
  clearTimeout(runtime.timePollTimer);
  runtime.timePollTimer = null;
});
