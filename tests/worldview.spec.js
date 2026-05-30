const { expect, test } = require('@playwright/test');

test('loads a bounded terrain grid and reports render resources', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=0&chunkZ=0');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  await expect(page.locator('#metrics')).toContainText('9 chunks');
  await expect(page.locator('#metrics')).toContainText('geo');
  await expect(page.locator('#metrics')).toContainText('disposed');

  await page.locator('#chunk-x').fill('2');
  await page.locator('#load').click();

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 0');
  await expect(page.locator('#metrics')).toContainText('9 chunks');
  await expect(page.locator('#metrics')).toContainText(/disposed [1-9]\d*c/);
});
