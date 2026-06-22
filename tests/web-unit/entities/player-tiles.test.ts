import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPlayerTile,
  updatePlayerTile,
} from '../../../src/main/resources/web/src/entities/player-tiles.ts';

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    activeViewUuid: null,
    activeFollowUuid: null,
    onFocus: () => {},
    onToggleEyeView: () => {},
    onToggleFollow: () => {},
    ...overrides,
  };
}

test('createPlayerTile builds expected structure and returns handles', () => {
  const tile = createPlayerTile({ uuid: 'u1', name: 'Alice' }, makeContext());
  assert.equal(tile.element.className, 'player-tile');
  assert.ok(tile.avatar);
  assert.ok(tile.name);
  assert.ok(tile.eyeButton);
  assert.ok(tile.walkButton);
  assert.equal(tile.avatarUrl, null);
  assert.equal(tile.avatarImage, null);
  // main button + actions wrapper
  assert.equal(tile.element.children.length, 2);
});

test('createPlayerTile marks active eye/walk buttons via context', () => {
  const tile = createPlayerTile(
    { uuid: 'u1', name: 'Alice' },
    makeContext({ activeViewUuid: 'u1', activeFollowUuid: 'u1' }),
  );
  assert.ok(tile.eyeButton.className.includes('active'));
  assert.ok(tile.walkButton.className.includes('active'));
  assert.equal(tile.eyeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(tile.walkButton.getAttribute('aria-pressed'), 'true');
});

test('tile button clicks invoke the supplied callbacks', () => {
  const calls: string[] = [];
  const tile = createPlayerTile(
    { uuid: 'u1', name: 'Alice' },
    makeContext({
      onFocus: (uuid: string) => calls.push(`focus:${uuid}`),
      onToggleEyeView: (uuid: string) => calls.push(`eye:${uuid}`),
      onToggleFollow: (uuid: string) => calls.push(`walk:${uuid}`),
    }),
  );
  const main = tile.element.querySelector('.player-tile-main') as HTMLElement;
  main.click();
  tile.eyeButton.click();
  tile.walkButton.click();
  assert.deepEqual(calls, ['focus:u1', 'eye:u1', 'walk:u1']);
});

test('updatePlayerTile sets initials and name and avatar image', () => {
  const tile = createPlayerTile({ uuid: 'u1', name: 'Alice Smith' }, makeContext());
  updatePlayerTile(tile, { uuid: 'u1', name: 'Alice Smith' }, makeContext());
  assert.equal(tile.name.textContent, 'Alice Smith');
  // initials from first+last name
  assert.ok(tile.avatar.textContent?.startsWith('AS'));
  // avatar image created from generated url
  assert.ok(tile.avatarUrl);
  assert.ok(tile.avatarImage);
});

test('updatePlayerTile single-word initials and prebuilt avatarUrl', () => {
  const tile = createPlayerTile({ uuid: 'u2', name: 'Bob' }, makeContext());
  updatePlayerTile(
    tile,
    { uuid: 'u2', name: 'Bob', avatarUrl: '/explicit.png' },
    makeContext(),
  );
  assert.ok(tile.avatar.textContent?.startsWith('BO'));
  assert.equal(tile.avatarUrl, '/explicit.png');
});

test('updatePlayerTile empty name yields question mark initials and no avatar url', () => {
  const tile = createPlayerTile({ uuid: 'u3', name: '' }, makeContext());
  updatePlayerTile(tile, { uuid: 'u3', name: '' }, makeContext());
  // no uuid/name combo for generated url; player has uuid but empty name -> null url
  assert.equal(tile.avatarUrl, null);
  assert.ok(tile.avatar.textContent?.includes('?'));
});

test('updatePlayerTile drops avatar when url removed on subsequent update', () => {
  const tile = createPlayerTile({ uuid: 'u4', name: 'Carol' }, makeContext());
  updatePlayerTile(tile, { uuid: 'u4', name: 'Carol' }, makeContext());
  assert.ok(tile.avatarUrl);
  // Update with no derivable url (missing name) clears the avatar.
  updatePlayerTile(tile, { uuid: 'u4', name: 'Carol' }, makeContext());
  // Force the no-url branch: pass a player that yields null avatar url.
  updatePlayerTile(tile, { uuid: '', name: '' }, makeContext());
  assert.equal(tile.avatarUrl, null);
  assert.equal(tile.avatarImage, null);
});

test('updatePlayerTile toggles active state via aria-pressed', () => {
  const tile = createPlayerTile({ uuid: 'u5', name: 'Dan' }, makeContext());
  updatePlayerTile(
    tile,
    { uuid: 'u5', name: 'Dan' },
    makeContext({ activeViewUuid: 'u5', activeFollowUuid: 'other' }),
  );
  assert.equal(tile.eyeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(tile.walkButton.getAttribute('aria-pressed'), 'false');
  assert.ok(tile.eyeButton.className.includes('active'));
  assert.ok(!tile.walkButton.className.includes('active'));
});

test('updatePlayerTile reuses existing text node on repeated updates', () => {
  const tile = createPlayerTile({ uuid: 'u6', name: 'Eve Long' }, makeContext());
  updatePlayerTile(tile, { uuid: 'u6', name: 'Eve Long' }, makeContext());
  const firstInitials = tile.avatar.textContent;
  updatePlayerTile(tile, { uuid: 'u6', name: 'Xander York' }, makeContext());
  assert.notEqual(tile.avatar.textContent, firstInitials);
  assert.ok(tile.avatar.textContent?.startsWith('XY'));
});
