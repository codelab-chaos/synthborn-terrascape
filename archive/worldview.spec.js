const mapRegionResponse = await page.request.get('/api/mapregion/default/0/0/2.png');
  expect(mapRegionResponse.ok()).toBeTruthy();
  expect(mapRegionResponse.headers()['content-type']).toContain('image/png');
  expect((await mapRegionResponse.body()).length).toBeGreaterThan(1024);
