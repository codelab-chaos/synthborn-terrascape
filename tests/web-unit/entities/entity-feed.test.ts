import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearMobs,
  closeEntityStream,
  liveMobFeedEnabled,
  refreshMobs,
  refreshPlayers,
  restartEntityStream,
  restartMobPolling,
  restartPlayerPolling,
  scheduleMobMarkerUpdate,
  updateEntityVisibility,
  updateMobs,
  updatePlayers,
} from '../../../src/main/resources/web/src/entities/entity-feed.ts';
import {
  mobMarkers,
  playerMarkers,
  playerTiles,
  runtime,
} from '../../../src/main/resources/web/src/scene/scene-context.ts';
import {
  mobUpdateRateInput,
  playerUpdateRateInput,
  playersEl,
  showMobsInput,
  showPlayersInput,
  worldSelect,
} from '../../../src/main/resources/web/src/ui/dom.ts';

// logClientEvent (fired on count changes / refresh failures) schedules a deferred
// telemetry flush that would surface as an unhandledRejection after a test ends.
// Neutralize the beacon and swallow that specific noise.
(globalThis as unknown as { navigator: { sendBeacon: () => boolean } }).navigator.sendBeacon =
  () => true;
process.on('unhandledRejection', (reason) => {
  const message = String((reason as { message?: string })?.message ?? reason);
  // Deferred telemetry/poll fetches may fire after a test ends and hit a dead port.
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

// Stop any polling/stream/telemetry timers the feed scheduled so the process can exit
// cleanly without a stray real fetch firing after the suite finishes.
test.after(() => {
  clearTimeout(runtime.playerPollTimer);
  clearTimeout(runtime.mobPollTimer);
  clearTimeout(runtime.timePollTimer);
  clearTimeout(runtime.entityStreamFallbackTimer);
  clearTimeout(runtime.playerConnectMobSampleTimer);
  closeEntityStream();
});

// restartEntityStream constructs the bare `EventSource` global but gates on
// `'EventSource' in window`, so the fake must live on both.
function setEventSource(ctor: unknown) {
  (globalThis as unknown as { EventSource?: unknown }).EventSource = ctor;
  (window as unknown as { EventSource?: unknown }).EventSource = ctor;
}
function clearEventSource() {
  delete (globalThis as unknown as { EventSource?: unknown }).EventSource;
  delete (window as unknown as { EventSource?: unknown }).EventSource;
}

function stubFetch(handler: (url: string) => unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => handler(String(url))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function selectWorld(value: string) {
  if (value && !worldSelect.querySelector(`option[value="${value}"]`)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    worldSelect.appendChild(option);
  }
  (worldSelect as unknown as { value: string }).value = value;
}

function resetWorld() {
  // Clear any live markers/tiles from prior tests.
  for (const [, marker] of playerMarkers) marker.parent?.remove(marker);
  playerMarkers.clear();
  for (const [, marker] of mobMarkers) marker.parent?.remove(marker);
  mobMarkers.clear();
  for (const [, tile] of playerTiles) tile.element.remove();
  playerTiles.clear();
  playersEl.replaceChildren();

  // happy-dom only honors a <select>.value that matches an existing <option>.
  selectWorld('overworld');
  showPlayersInput.checked = true;
  showMobsInput.checked = true;
  playerUpdateRateInput.value = '1000';
  mobUpdateRateInput.value = '5000';

  runtime.isRefreshingPlayers = false;
  runtime.isRefreshingMobs = false;
  runtime.lastPlayerCount = 0;
  runtime.lastMobCount = 0;
  runtime.lastPlayerPollFailed = false;
  runtime.lastMobPollFailed = false;
  runtime.viewPlayerUuid = null;
  runtime.followPlayerUuid = null;
  runtime.entityStreamConnected = false;
  runtime.pendingMobMarkerUpdate = null;
  runtime.mobMarkerUpdateScheduled = false;
  clearTimeout(runtime.playerPollTimer);
  clearTimeout(runtime.mobPollTimer);
  clearTimeout(runtime.entityStreamFallbackTimer);
  clearTimeout(runtime.playerConnectMobSampleTimer);
  closeEntityStream();
}

const player = (uuid: string, name = `P-${uuid}`) => ({
  uuid,
  name,
  x: 10,
  y: 64,
  z: 12,
  yaw: 45,
  pitch: 0,
});

const mob = (id: string, type = 'Goblin') => ({
  id,
  type,
  color: '#ff0000',
  x: 5,
  y: 64,
  z: 7,
});

test('liveMobFeedEnabled requires players present', () => {
  resetWorld();
  runtime.lastPlayerCount = 0;
  showMobsInput.checked = true;
  assert.equal(liveMobFeedEnabled(), false);
  runtime.lastPlayerCount = 2;
  assert.equal(liveMobFeedEnabled(), true);
  showMobsInput.checked = false;
  assert.equal(liveMobFeedEnabled(), false);
});

test('updatePlayers adds markers and tiles for players', () => {
  resetWorld();
  updatePlayers([player('a'), player('b')]);
  assert.equal(playerMarkers.size, 2);
  assert.equal(playerTiles.size, 2);
  assert.equal(runtime.lastPlayerCount, 2);
  assert.equal(playersEl.children.length, 2);
});

test('updatePlayers removes markers/tiles for players that left', () => {
  resetWorld();
  updatePlayers([player('a'), player('b')]);
  updatePlayers([player('a')]);
  assert.equal(playerMarkers.size, 1);
  assert.equal(playerTiles.size, 1);
  assert.ok(playerMarkers.has('a'));
  assert.ok(!playerMarkers.has('b'));
});

test('updatePlayers with empty list shows the no-players message', () => {
  resetWorld();
  updatePlayers([player('a')]);
  updatePlayers([]);
  assert.equal(playerMarkers.size, 0);
  assert.equal(playersEl.textContent, 'No players');
});

test('updatePlayers hides player UI when players are hidden', () => {
  resetWorld();
  showPlayersInput.checked = false;
  updatePlayers([player('a')]);
  assert.equal(playersEl.textContent, 'Players hidden');
  // markers still tracked but not visible
  assert.ok(playerMarkers.get('a'));
  assert.equal(playerMarkers.get('a').visible, false);
});

test('updatePlayers updates existing marker position on re-poll', () => {
  resetWorld();
  updatePlayers([player('a')]);
  const marker = playerMarkers.get('a');
  updatePlayers([{ ...player('a'), x: 99 }]);
  assert.equal(playerMarkers.get('a'), marker); // reused
  assert.equal(marker.userData.targetPosition.x, 99);
});

test('refreshPlayers fetches and applies player snapshot', async () => {
  resetWorld();
  const restore = stubFetch((url) => {
    assert.ok(url.includes('/api/players/overworld'));
    return { ok: true, json: async () => ({ players: [player('x')] }) };
  });
  try {
    await refreshPlayers();
    assert.equal(playerMarkers.size, 1);
    assert.equal(runtime.lastPlayerPollFailed, false);
  } finally {
    restore();
  }
});

test('refreshPlayers marks failure on non-ok response', async () => {
  resetWorld();
  const restore = stubFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
  try {
    await refreshPlayers();
    assert.equal(runtime.lastPlayerPollFailed, true);
  } finally {
    restore();
  }
});

test('refreshPlayers skips when no world selected', async () => {
  resetWorld();
  selectWorld('');
  let called = false;
  const restore = stubFetch(() => {
    called = true;
    return { ok: true, json: async () => ({ players: [] }) };
  });
  try {
    await refreshPlayers();
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test('refreshPlayers skips when already refreshing', async () => {
  resetWorld();
  runtime.isRefreshingPlayers = true;
  let called = false;
  const restore = stubFetch(() => {
    called = true;
    return { ok: true, json: async () => ({ players: [] }) };
  });
  try {
    await refreshPlayers();
    assert.equal(called, false);
  } finally {
    restore();
    runtime.isRefreshingPlayers = false;
  }
});

test('updateMobs adds and removes mob markers (sync path)', () => {
  resetWorld();
  runtime.lastPlayerCount = 1;
  updateMobs([mob('m1'), mob('m2')]);
  assert.equal(mobMarkers.size, 2);
  assert.equal(runtime.lastMobCount, 2);
  updateMobs([mob('m1')]);
  assert.equal(mobMarkers.size, 1);
  assert.ok(mobMarkers.has('m1'));
});

test('updateMobs bails when mobs hidden but list non-empty', () => {
  resetWorld();
  showMobsInput.checked = false;
  updateMobs([mob('m1')]);
  assert.equal(mobMarkers.size, 0);
});

test('clearMobs empties markers and resets failure state', () => {
  resetWorld();
  runtime.lastPlayerCount = 1;
  updateMobs([mob('m1'), mob('m2')]);
  runtime.lastMobPollFailed = true;
  clearMobs();
  assert.equal(mobMarkers.size, 0);
  assert.equal(runtime.lastMobPollFailed, false);
  assert.equal(runtime.lastMobSourceStats, null);
});

test('scheduleMobMarkerUpdate stages a pending update', () => {
  resetWorld();
  scheduleMobMarkerUpdate([mob('s1'), mob('s2')]);
  assert.ok(runtime.pendingMobMarkerUpdate);
  assert.equal(runtime.pendingMobMarkerUpdate.mobs.length, 2);
  assert.equal(runtime.lastMobCount, 2);
});

test('scheduleMobMarkerUpdate bails when mobs hidden', () => {
  resetWorld();
  showMobsInput.checked = false;
  runtime.pendingMobMarkerUpdate = null;
  scheduleMobMarkerUpdate([mob('s1')]);
  assert.equal(runtime.pendingMobMarkerUpdate, null);
});

test('refreshMobs requires live mob feed (players present)', async () => {
  resetWorld();
  runtime.lastPlayerCount = 0; // no players => no live feed
  let called = false;
  const restore = stubFetch(() => {
    called = true;
    return { ok: true, json: async () => ({ mobs: [] }) };
  });
  try {
    await refreshMobs();
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test('refreshMobs fetches and stages mob update when feed live', async () => {
  resetWorld();
  runtime.lastPlayerCount = 2;
  const restore = stubFetch((url) => {
    assert.ok(url.includes('/api/mobs/overworld'));
    return {
      ok: true,
      json: async () => ({ mobs: [mob('mm1')], sourceStats: { spawned: 1 } }),
    };
  });
  try {
    await refreshMobs();
    assert.equal(runtime.lastMobPollFailed, false);
    assert.deepEqual(runtime.lastMobSourceStats, { spawned: 1 });
    assert.ok(runtime.pendingMobMarkerUpdate);
  } finally {
    restore();
  }
});

test('refreshMobs marks failure on error response', async () => {
  resetWorld();
  runtime.lastPlayerCount = 2;
  const restore = stubFetch(() => ({ ok: false, status: 502, json: async () => ({}) }));
  try {
    await refreshMobs();
    assert.equal(runtime.lastMobPollFailed, true);
  } finally {
    restore();
  }
});

test('updateEntityVisibility toggles marker visibility from inputs', () => {
  resetWorld();
  runtime.lastPlayerCount = 1;
  updatePlayers([player('a')]);
  updateMobs([mob('m1')]);
  showPlayersInput.checked = false;
  showMobsInput.checked = false;
  updateEntityVisibility();
  assert.equal(playerMarkers.get('a').visible, false);
  assert.equal(mobMarkers.get('m1').visible, false);
  assert.equal(playersEl.textContent, 'Players hidden');
});

test('restartPlayerPolling schedules a timer when not streaming', () => {
  resetWorld();
  runtime.entityStreamConnected = false;
  restartPlayerPolling(100000);
  assert.ok(runtime.playerPollTimer != null);
  clearTimeout(runtime.playerPollTimer);
});

test('restartPlayerPolling does nothing while stream connected', () => {
  resetWorld();
  clearTimeout(runtime.playerPollTimer);
  runtime.playerPollTimer = null;
  runtime.entityStreamConnected = true;
  restartPlayerPolling(100000);
  assert.equal(runtime.playerPollTimer, null);
  runtime.entityStreamConnected = false;
});

test('restartMobPolling clears timer when delay is null (mobs hidden)', () => {
  resetWorld();
  showMobsInput.checked = false; // mobPollDelayMs => null
  restartMobPolling();
  assert.equal(runtime.mobPollTimer, null);
});

test('restartMobPolling schedules a timer with an explicit delay', () => {
  resetWorld();
  runtime.entityStreamConnected = false;
  restartMobPolling(100000);
  assert.ok(runtime.mobPollTimer != null);
  clearTimeout(runtime.mobPollTimer);
  runtime.mobPollTimer = null;
});

test('restartEntityStream falls back to polling without EventSource', () => {
  resetWorld();
  const original = (globalThis as unknown as { EventSource?: unknown }).EventSource;
  // Force the no-EventSource branch.
  clearEventSource();
  try {
    restartEntityStream();
    // Should have set up polling and not opened a stream.
    assert.equal(runtime.entityStream, null);
  } finally {
    if (original) setEventSource(original);
    clearTimeout(runtime.playerPollTimer);
    clearTimeout(runtime.mobPollTimer);
  }
});

test('restartEntityStream opens a stream when wanted', () => {
  resetWorld();
  runtime.lastPlayerCount = 2; // makes live mob feed true
  const listeners: Record<string, (e: { data: string }) => void> = {};
  let closed = false;
  class FakeEventSource {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    addEventListener(type: string, cb: (e: { data: string }) => void) {
      listeners[type] = cb;
    }
    close() {
      closed = true;
    }
  }
  const original = (globalThis as unknown as { EventSource?: unknown }).EventSource;
  setEventSource(FakeEventSource as unknown);
  try {
    restartEntityStream();
    assert.ok(runtime.entityStream);
    assert.equal(runtime.entityStreamWorld, 'overworld');
    // Deliver an entities event through the stream.
    listeners.open?.({ data: '' });
    assert.equal(runtime.entityStreamConnected, true);
    listeners.entities?.({
      data: JSON.stringify({ ok: true, world: 'overworld', players: [player('z')], mobs: [] }),
    });
    assert.ok(playerMarkers.has('z'));
    // Error handler schedules fallback without throwing.
    listeners.error?.({ data: '' });
    closeEntityStream();
    assert.equal(closed, true);
    assert.equal(runtime.entityStream, null);
  } finally {
    if (original) setEventSource(original);
    else clearEventSource();
    closeEntityStream();
  }
});

test('restartEntityStream reuses an identical existing stream', () => {
  resetWorld();
  runtime.lastPlayerCount = 2;
  let constructed = 0;
  class FakeEventSource {
    constructor() {
      constructed += 1;
    }
    addEventListener() {}
    close() {}
  }
  const original = (globalThis as unknown as { EventSource?: unknown }).EventSource;
  setEventSource(FakeEventSource as unknown);
  try {
    restartEntityStream();
    const first = constructed;
    restartEntityStream(); // identical params => no new stream
    assert.equal(constructed, first);
  } finally {
    if (original) setEventSource(original);
    else clearEventSource();
    closeEntityStream();
  }
});
