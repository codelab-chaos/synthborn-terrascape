import assert from 'node:assert/strict';
import test from 'node:test';

import {
  liveMobFeedEnabled,
  mobPollDelayMs,
  playerPollDelayMs,
  positiveIntegerMs,
  wantsEntityStream,
  worldTimePollDelayMs,
} from '../../../web/src/common/entity-feed-policy.ts';

test('computes entity feed polling policy', () => {
  assert.equal(positiveIntegerMs('250', 1000), 250);
  assert.equal(positiveIntegerMs('0', 1000), 1000);
  assert.equal(positiveIntegerMs('nope', 1000), 1000);
  assert.equal(worldTimePollDelayMs({
    syncTimeEnabled: true,
    lastPlayerCount: 0,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 5);
  assert.equal(worldTimePollDelayMs({
    syncTimeEnabled: false,
    lastPlayerCount: 2,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 10);
  assert.equal(worldTimePollDelayMs({
    syncTimeEnabled: false,
    lastPlayerCount: 0,
    activeMs: 5,
    visibleMs: 10,
    idleMs: 30,
  }), 30);

  const playerPolicy = {
    lastPollFailed: false,
    showPlayers: true,
    lastPlayerCount: 2,
    requestedRateMs: 500,
    focused: false,
    errorMs: 10000,
    hiddenMs: 30000,
    emptyMs: 15000,
    focusedMinMs: 1000,
  };
  assert.equal(playerPollDelayMs(playerPolicy), 500);
  assert.equal(playerPollDelayMs({ ...playerPolicy, focused: true }), 1000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, lastPollFailed: true }), 10000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, showPlayers: false }), 30000);
  assert.equal(playerPollDelayMs({ ...playerPolicy, lastPlayerCount: 0 }), 15000);

  assert.equal(liveMobFeedEnabled(true, 1), true);
  assert.equal(liveMobFeedEnabled(true, 0), false);
  assert.equal(liveMobFeedEnabled(false, 3), false);
  const mobPolicy = {
    showMobs: true,
    liveMobFeed: true,
    lastPollFailed: false,
    lastMobCount: 3,
    activeMs: 5000,
    emptyMs: 30000,
    errorMs: 15000,
  };
  assert.equal(mobPollDelayMs(mobPolicy), 5000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, showMobs: false }), null);
  assert.equal(mobPollDelayMs({ ...mobPolicy, liveMobFeed: false }), 30000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, lastPollFailed: true }), 15000);
  assert.equal(mobPollDelayMs({ ...mobPolicy, lastMobCount: 0 }), 30000);

  assert.equal(wantsEntityStream({ world: 'default', showPlayers: true, liveMobFeed: false }), true);
  assert.equal(wantsEntityStream({ world: 'default', showPlayers: false, liveMobFeed: true }), true);
  assert.equal(wantsEntityStream({ world: '', showPlayers: true, liveMobFeed: true }), false);
  assert.equal(wantsEntityStream({ world: 'default', showPlayers: false, liveMobFeed: false }), false);
});
