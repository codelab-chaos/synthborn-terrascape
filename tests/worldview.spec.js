const { expect, test } = require('@playwright/test');

test('loads a bounded terrain grid and reports render resources', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=0&chunkZ=0&water=transparent&auto=false');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  await expect(page.locator('#water-mode')).toHaveValue('transparent');
  await expect(page.locator('#shader-effect')).toHaveValue('none');
  await expect(page.locator('#experimental-details-state')).toHaveText(/Experimental trees: server (on|off)/);
  const experimentalDetailsEnabled = await page.locator('#experimental-details-state').evaluate((el) => {
    return el.textContent?.includes('server on') === true;
  });
  await expect(page.locator('#show-players')).toBeChecked();
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#height-grade')).toHaveCount(0);
  await expect(page.locator('#atmosphere-lighting')).toHaveCount(0);
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).not.toBeChecked();
  await expect(page.locator('#lod-horizon')).toBeDisabled();
  await expect(page.locator('#shade-size')).toHaveValue('1.85');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.85');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.4');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.4');
  await expect(page.locator('#show-mobs')).toHaveCount(0);
  await expect(page.locator('#load')).toHaveCount(0);
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#metrics')).toContainText('9 chunks');
  await expect(page.locator('#metrics')).not.toContainText('mob');
  await expect(page.locator('#metrics')).toContainText('geo');
  await expect(page.locator('#metrics')).toContainText('disposed');
  await expect(page.locator('.time-ribbon')).toBeVisible();
  await expect(page.locator('#time-cycle-label')).toContainText(/\d{2}:\d{2}/);
  await expect(page.locator('.time-ribbon-tick')).toHaveCount(4);
  await expect(page.locator('#fps-counter')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => {
    const counter = window.__synthWorldviewDebug?.fpsCounter;
    return counter?.sprite?.isSprite === true && counter?.texture?.isCanvasTexture === true;
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
      'player-look-light-cone',
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
  expect(markerShape.headY).toBeGreaterThan(2.5);
  expect(markerShape.headY).toBeLessThan(2.8);
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
    await expect(page.locator('.player-button').first()).toContainText(player.name);
    const coordinatesBeforeFocus = await page.locator('#coordinates').textContent();
    await page.locator('.player-button').first().click();
    await expect(page.locator('#coordinates')).not.toHaveText(coordinatesBeforeFocus ?? '');
  }

  const mobsResponse = await page.request.get('/api/mobs/default');
  expect(mobsResponse.status()).toBe(410);
  const mobsPayload = await mobsResponse.json();
  expect(mobsPayload.error).toBe('mob_feed_disabled');

  await page.locator('#show-players').uncheck();
  await expect(page.locator('#players')).toHaveText('Players hidden');
  await page.locator('#show-players').check();
  await expect(page.locator('#players')).not.toHaveText('Players hidden');
  const normalDetailResponse = await page.request.get('/api/terrain/default/0/-7/3.glb');
  expect(normalDetailResponse.ok()).toBeTruthy();
  const normalDetails = Number(normalDetailResponse.headers()['x-worldview-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(normalDetails).toBeGreaterThan(0);
  } else {
    expect(normalDetails).toBe(0);
  }
  expect(['generated', 'disk', 'memory']).toContain(normalDetailResponse.headers()['x-worldview-cache']);

  const detailResponse = await page.request.get('/api/terrain/default/0/-7/3.glb?details=1');
  expect(detailResponse.ok()).toBeTruthy();
  const overrideDetails = Number(detailResponse.headers()['x-worldview-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(overrideDetails).toBeGreaterThan(0);
  } else {
    expect(overrideDetails).toBe(0);
  }
  expect(detailResponse.headers()['x-worldview-cache']).toBe('memory');

  const lodTerrain = await page.request.get('/api/terrain/default/1/-7/3.glb');
  expect(lodTerrain.status()).toBe(410);
  expect((await lodTerrain.json()).error).toBe('lod_disabled');

  await page.locator('#water-mode').selectOption('solid');
  await expect(page.locator('#water-mode')).toHaveValue('solid');
  await page.locator('#water-mode').selectOption('hidden');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await page.locator('#shader-effect').selectOption('tiltShift');
  await expect(page.locator('#shader-effect')).toHaveValue('tiltShift');
  await page.locator('#shader-effect').selectOption('cartographicInk');
  await expect(page.locator('#shader-effect')).toHaveValue('cartographicInk');
  await page.locator('#sun-lighting').check();
  await page.locator('#tree-shade').check();
  await page.locator('#shade-size-value').fill('1.35');
  await page.locator('#shade-darkness-value').fill('0.8');
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.35');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.35');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.8');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.8');
  await page.locator('#shade-size').fill('1.6');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.6');

  await page.locator('#chunk-x').fill('2');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 0');
  await expect(page.locator('#metrics')).toContainText('9 chunks');
  await expect(page.locator('#metrics')).toContainText(/disposed [1-9]\d*c/);

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
      lod: true,
      shadeSize: 1.45,
      shadeDarkness: 0.75,
      water: 'hidden',
      shader: 'pixelMap',
      camera: { x: 120, y: 150, z: 160 },
      target: { x: 80, y: 126, z: 112 },
    }));
  });
  await page.goto('/');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 3');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await expect(page.locator('#shader-effect')).toHaveValue('pixelMap');
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#debug-bounds')).toBeChecked();
  await expect(page.locator('#show-players')).not.toBeChecked();
  await expect(page.locator('#sun-lighting')).toBeChecked();
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).not.toBeChecked();
  await expect(page.locator('#lod-horizon')).toBeDisabled();
  await expect(page.locator('#shade-size')).toHaveValue('1.45');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.45');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.75');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.75');
  await expect(page.locator('#show-mobs')).toHaveCount(0);
  await expect(page.locator('#players')).toHaveText('Players hidden');
  await expect(page.locator('#coordinates')).toContainText('Target 80, 126, 112');
  await expect(page.locator('#coordinates')).toContainText('camera 120, 150, 160');

  await page.goto('/?radius=1&chunkX=0&chunkZ=0&auto=false&lod=true');
  await expect(page.locator('#lod-horizon')).not.toBeChecked();
  await expect(page.locator('#lod-horizon')).toBeDisabled();
});
