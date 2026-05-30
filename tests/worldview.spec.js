const { expect, test } = require('@playwright/test');

test('loads a bounded terrain grid and reports render resources', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=0&chunkZ=0&water=transparent');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  await expect(page.locator('#water-mode')).toHaveValue('transparent');
  await expect(page.locator('#experimental-details-state')).toHaveText('Experimental trees: server off');
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#metrics')).toContainText('9 chunks');
  await expect(page.locator('#metrics')).toContainText('geo');
  await expect(page.locator('#metrics')).toContainText('disposed');

  const playersResponse = await page.request.get('/api/players/default');
  expect(playersResponse.ok()).toBeTruthy();
  const playersPayload = await playersResponse.json();
  expect(playersPayload.ok).toBeTruthy();
  expect(Array.isArray(playersPayload.players)).toBeTruthy();
  if (playersPayload.players.length > 0) {
    const player = playersPayload.players[0];
    await expect(page.locator('.player-button').first()).toContainText(player.name);
    const coordinatesBeforeFocus = await page.locator('#coordinates').textContent();
    await page.locator('.player-button').first().click();
    await expect(page.locator('#coordinates')).not.toHaveText(coordinatesBeforeFocus ?? '');
  }

  const normalDetailResponse = await page.request.get('/api/terrain/default/0/-7/3.glb');
  expect(normalDetailResponse.ok()).toBeTruthy();
  expect(Number(normalDetailResponse.headers()['x-worldview-details'] ?? 0)).toBe(0);
  expect(['generated', 'disk', 'memory']).toContain(normalDetailResponse.headers()['x-worldview-cache']);

  const detailResponse = await page.request.get('/api/terrain/default/0/-7/3.glb?details=1');
  expect(detailResponse.ok()).toBeTruthy();
  expect(Number(detailResponse.headers()['x-worldview-details'] ?? 0)).toBe(0);
  expect(detailResponse.headers()['x-worldview-cache']).toBe('memory');

  await page.locator('#water-mode').selectOption('solid');
  await expect(page.locator('#water-mode')).toHaveValue('solid');
  await page.locator('#water-mode').selectOption('hidden');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');

  await page.locator('#chunk-x').fill('2');
  await page.locator('#load').click();

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
      water: 'hidden',
      camera: { x: 120, y: 150, z: 160 },
      target: { x: 80, y: 126, z: 112 },
    }));
  });
  await page.goto('/');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 3');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#debug-bounds')).toBeChecked();
  await expect(page.locator('#coordinates')).toContainText('Target 80, 126, 112');
  await expect(page.locator('#coordinates')).toContainText('camera 120, 150, 160');
});
