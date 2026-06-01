const { expect, test } = require('@playwright/test');

test('loads a bounded terrain grid and reports render resources', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=0&chunkZ=0&water=transparent&auto=false');
  const setControlValue = async (selector, value, eventName = 'change') => {
    await page.locator(selector).evaluate((element, payload) => {
      element.value = payload.value;
      element.dispatchEvent(new Event(payload.eventName, { bubbles: true }));
      if (payload.eventName !== 'change') {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { value, eventName });
  };
  const setControlChecked = async (selector, checked) => {
    await page.locator(selector).evaluate((element, value) => {
      element.checked = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, checked);
  };

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  await expect(page.locator('#water-mode')).toHaveValue('transparent');
  await expect(page.locator('#shader-effect')).toHaveValue('none');
  await expect(page.locator('#experimental-details-state')).toHaveText(/Detailed trees: server (on|off)/);
  const experimentalDetailsEnabled = await page.locator('#experimental-details-state').evaluate((el) => {
    return el.textContent?.includes('server on') === true;
  });
  await expect(page.locator('#show-players')).toBeChecked();
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#height-grade')).toHaveCount(0);
  await expect(page.locator('#atmosphere-lighting')).toHaveCount(0);
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.85');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.85');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.4');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.4');
  await expect(page.locator('#show-mobs')).toHaveCount(0);
  await expect(page.locator('#load')).toHaveCount(0);
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#metric-loaded')).toContainText('9 chunks');
  await expect(page.locator('#metric-resources')).toContainText('geo');
  await expect(page.locator('#metric-disposed')).toContainText('c');
  await expect(page.locator('#fps-value')).toBeVisible();
  await expect(page.locator('#fps-frame')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const counter = window.__synthWorldviewDebug?.fpsCounter;
    return typeof counter?.fps === 'number' && typeof counter?.frameMs === 'number';
  })).toBe(true);
  const markerShape = await page.evaluate(async () => {
    const { createPlayerMarker, disposeObject } = await import('/players.js');
    const marker = createPlayerMarker({ uuid: 'test-player' });
    const parts = [
      'player-base',
      'player-legs',
      'player-body',
      'player-head',
      'player-face-glow',
      'player-look-light',
      'player-look-light-target',
      'player-overhead-diamond',
    ];
    const result = {
      hasParts: parts.every((part) => marker.getObjectByName(part) !== undefined),
      headY: marker.getObjectByName('player-head')?.position.y,
      diamondY: marker.getObjectByName('player-overhead-diamond')?.position.y,
      lightDistance: marker.getObjectByName('player-look-light')?.distance,
      lookTargetZ: marker.getObjectByName('player-look-light-target')?.position.z,
    };
    disposeObject(marker);
    return result;
  });
  expect(markerShape.hasParts).toBe(true);
  expect(markerShape.headY).toBeGreaterThan(2.35);
  expect(markerShape.headY).toBeLessThan(2.5);
  expect(markerShape.diamondY).toBeGreaterThan(3);
  expect(markerShape.lightDistance).toBeGreaterThan(10);
  expect(markerShape.lookTargetZ).toBeLessThan(-4);

  const playersResponse = await page.request.get('/api/players/default');
  expect(playersResponse.ok()).toBeTruthy();
  const playersPayload = await playersResponse.json();
  expect(playersPayload.ok).toBeTruthy();
  expect(Array.isArray(playersPayload.players)).toBeTruthy();

  const timeResponse = await page.request.get('/api/time/default');
  expect(timeResponse.ok()).toBeTruthy();
  const timePayload = await timeResponse.json();
  expect(timePayload.ok).toBeTruthy();
  expect(timePayload.hour).toBeGreaterThanOrEqual(0);
  expect(timePayload.hour).toBeLessThanOrEqual(23);
  expect(typeof timePayload.phase).toBe('string');
  expect(typeof timePayload.sunDirection?.x).toBe('number');

  if (playersPayload.players.length > 0) {
    const player = playersPayload.players[0];
    await expect(page.locator('.player-tile-main').first()).toContainText(player.name);
    const coordinatesBeforeFocus = await page.locator('#coord-target').textContent();
    await page.locator('.player-tile-main').first().click();
    await expect(page.locator('#coord-target')).not.toHaveText(coordinatesBeforeFocus ?? '');
  }

  const mobsResponse = await page.request.get('/api/mobs/default');
  expect(mobsResponse.status()).toBe(410);
  const mobsPayload = await mobsResponse.json();
  expect(mobsPayload.error).toBe('mob_feed_disabled');

  await page.locator('#show-players').evaluate((input) => {
    input.checked = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#players')).toHaveText('Players hidden');
  await page.locator('#show-players').evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#players')).not.toHaveText('Players hidden');
  const normalDetailResponse = await page.request.get('/api/terrain/default/0/-7.glb');
  expect(normalDetailResponse.ok()).toBeTruthy();
  const normalDetails = Number(normalDetailResponse.headers()['x-worldview-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(normalDetails).toBeGreaterThan(0);
  } else {
    expect(normalDetails).toBe(0);
  }
  expect(['generated', 'disk', 'memory']).toContain(normalDetailResponse.headers()['x-worldview-cache']);

  const detailResponse = await page.request.get('/api/terrain/default/0/-7.glb?details=1');
  expect(detailResponse.ok()).toBeTruthy();
  const overrideDetails = Number(detailResponse.headers()['x-worldview-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(overrideDetails).toBeGreaterThan(0);
  } else {
    expect(overrideDetails).toBe(0);
  }
  expect(detailResponse.headers()['x-worldview-cache']).toBe('memory');

  const oldLodTerrain = await page.request.get('/api/terrain/default/1/-7/3.glb');
  expect(oldLodTerrain.status()).toBe(400);
  expect((await oldLodTerrain.json()).error).toBe('expected_/api/terrain/{world}/{chunkX}/{chunkZ}.glb');

  await setControlValue('#water-mode', 'solid');
  await expect(page.locator('#water-mode')).toHaveValue('solid');
  await setControlValue('#water-mode', 'hidden');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await setControlValue('#shader-effect', 'tiltShift');
  await expect(page.locator('#shader-effect')).toHaveValue('tiltShift');
  await setControlValue('#shader-effect', 'cartographicInk');
  await expect(page.locator('#shader-effect')).toHaveValue('cartographicInk');
  await setControlChecked('#sun-lighting', true);
  await setControlChecked('#tree-shade', true);
  await setControlValue('#shade-size-value', '1.35', 'input');
  await setControlValue('#shade-darkness-value', '0.8', 'input');
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.35');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.35');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.8');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.8');
  await setControlValue('#shade-size', '1.6', 'input');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.6');

  await setControlValue('#chunk-x', '2', 'input');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 0');
  await expect(page.locator('.info-card')).toContainText('9 chunks');
  await expect(page.locator('.info-card')).toContainText(/[1-9]\d*c/);

  await page.evaluate(() => {
    window.localStorage.setItem('synthworldview.viewState.v1', JSON.stringify({
      world: 'default',
      chunkX: 2,
      chunkZ: 3,
      radius: 1,
      auto: false,
      bounds: true,
      players: false,
      sun: true,
      shade: true,
      mapTiles: true,
      shadeSize: 1.45,
      shadeDarkness: 0.75,
      water: 'hidden',
      shader: 'pixelMap',
      camera: { x: 120, y: 150, z: 160 },
      target: { x: 80, y: 122, z: 112 },
    }));
  });
  await page.goto('/?chunkX=2&chunkZ=3&radius=1&auto=false&bounds=true&players=false&shader=pixelMap&water=hidden&shadeSize=1.45&shadeDarkness=0.75');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 3');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await expect(page.locator('#shader-effect')).toHaveValue('pixelMap');
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#debug-bounds')).toBeChecked();
  await expect(page.locator('#show-players')).not.toBeChecked();
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.45');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.45');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.75');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.75');
  await expect(page.locator('#show-mobs')).toHaveCount(0);
  await expect(page.locator('#players')).toHaveText('Players hidden');
  await expect(page.locator('#coord-target')).toHaveText('80, 122, 112');
  await expect(page.locator('#coord-camera')).toHaveText(/-?\d+, -?\d+, -?\d+/);

  await page.goto('/?radius=1&chunkX=0&chunkZ=0&auto=false&mapTiles=false');
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).not.toBeChecked();
});
