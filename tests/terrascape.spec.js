const { expect, test } = require('@playwright/test');

test('supports canvas-scoped FPS fly look, capped zoom, and sprint movement', async ({ page }) => {
  await page.goto('/?radius=0&chunkX=0&chunkZ=0&auto=true&mapTiles=false&players=false');
  await expect(page.locator('#status')).toHaveText('Loaded 1 chunks around 0, 0');

  await page.locator('#player-update-rate').focus();
  await expect(page.locator('#player-update-rate')).toBeFocused();
  await page.locator('canvas').click({ position: { x: 120, y: 120 } });
  await expect(page.locator('#player-update-rate')).not.toBeFocused();

  await page.evaluate(() => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 16, y: 100, z: 16 },
      target: { x: 100, y: 100, z: 0 },
      lookAt: { x: 16, y: 100, z: -48 },
    });
  });

  await page.evaluate(() => {
    window.__synthTerrascapeDebug.applyFlyLookDelta(100, -50);
  });
  const lookedPose = await page.evaluate(() => window.__synthTerrascapeDebug.cameraPose());
  expect(lookedPose.target.x).toBeGreaterThan(1);
  expect(lookedPose.target.y).toBeGreaterThan(100);
  await page.waitForTimeout(400);
  await expect(page.locator('#status')).toHaveText('Loaded 1 chunks around 0, 0');
  await expect(page.locator('#coord-chunk')).toHaveText('0, 0');
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.activeCenterId())).toBe('default:0:0');

  const zoomPose = await page.evaluate(() => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 0, y: 1190, z: 100 },
      target: { x: 0, y: 1300, z: 0 },
      lookAt: { x: 0, y: 1300, z: 0 },
    });
    window.__synthTerrascapeDebug.zoomFlyView(-100000);
    return window.__synthTerrascapeDebug.cameraPose();
  });
  expect(zoomPose.camera.y).toBeLessThanOrEqual(1200);

  const normalDistance = await flyForwardDistance(page, false);
  const sprintDistance = await flyForwardDistance(page, true);
  expect(sprintDistance).toBeGreaterThan(normalDistance * 1.8);
});

async function flyForwardDistance(page, sprint) {
  await page.evaluate(() => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 16, y: 100, z: 16 },
      target: { x: 16, y: 100, z: -48 },
      lookAt: { x: 16, y: 100, z: -48 },
    });
  });
  const before = await page.evaluate(() => window.__synthTerrascapeDebug.cameraPose().camera);
  if (sprint) await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await page.waitForTimeout(220);
  await page.keyboard.up('w');
  if (sprint) await page.keyboard.up('Shift');
  const after = await page.evaluate(() => window.__synthTerrascapeDebug.cameraPose().camera);
  return Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
}

test('renders water materials and ignores removed shader water mode', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=7&chunkZ=-9&auto=false&mapTiles=true&water=shader');
  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 7, -9');
  await expect(page.locator('#water-mode')).toHaveValue('solid');
  await expect(page.locator('#water-mode option[value="shader"]')).toHaveCount(0);
  await expect(page.locator('#shader-effect')).toHaveCount(0);
  await expect(page.locator('#sun-lighting')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => {
    return window.__synthTerrascapeDebug.waterMaterialSummary().length;
  })).toBeGreaterThan(0);

  const waterMaterials = await page.evaluate(() => window.__synthTerrascapeDebug.waterMaterialSummary());
  expect(waterMaterials.every((material) => material.type === 'ShaderMaterial')).toBe(true);
  expect(waterMaterials.every((material) => material.toneMapped === false)).toBe(true);
  expect(waterMaterials.every((material) => material.fog === false)).toBe(true);
  expect(waterMaterials.every((material) => material.vertexColors === false)).toBe(true);
  expect(waterMaterials.every((material) => material.color?.b > material.color?.r)).toBe(true);
  expect(waterMaterials.every((material) => material.alpha === 1)).toBe(true);
  expect(waterMaterials.every((material) => material.shaderMix === 0)).toBe(true);

  const firstTime = waterMaterials[0].time;
  await page.waitForTimeout(250);
  const updatedTime = await page.evaluate(() => window.__synthTerrascapeDebug.waterMaterialSummary()[0]?.time);
  expect(updatedTime).toBeGreaterThan(firstTime);
});

test('map tiles serve PNGs, bind textures, and render map pixels', async ({ page }) => {
  await page.goto('/?radius=1&chunkX=0&chunkZ=0&auto=false&mapTiles=true&water=transparent&fog=false');
  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');

  const png = await page.request.get('/api/terrain/default/0/0.map.png');
  expect(png.status()).toBe(200);
  expect(png.headers()['content-type']).toContain('image/png');
  const body = await png.body();
  expect(body.byteLength).toBeGreaterThan(100);
  expect(body[0]).toBe(0x89);
  expect(body[1]).toBe(0x50);

  await expect.poll(async () => {
    const stats = await page.evaluate(() => window.__synthTerrascapeDebug.mapTileSceneStats());
    return stats.meshCount;
  }, { timeout: 45000 }).toBeGreaterThanOrEqual(9);

  const backdropY = await page.evaluate(() => window.__synthTerrascapeDebug.mapBackdropY());
  expect(backdropY).toBe(112);

  const audit = await page.evaluate(() => window.__synthTerrascapeDebug.auditMapTiles());
  expect(audit.count).toBeGreaterThanOrEqual(9);
  expect(audit.issues).toEqual([]);
  for (const tile of audit.tiles) {
    expect(tile.y).toBe(backdropY);
    expect(tile.inScene).toBe(true);
    expect(tile.hasTexture).toBe(true);
  }

  const centerProbe = await page.evaluate(() => window.__synthTerrascapeDebug.probeMapTilePixel(0, 0));
  expect(centerProbe.ok, JSON.stringify(centerProbe)).toBe(true);
  expect(centerProbe.sampled).toBeTruthy();
  expect(centerProbe.skyDistance).toBeGreaterThan(24);

  await expect.poll(async () => {
    const probe = await page.evaluate(() => window.__synthTerrascapeDebug.probeMapTilePixel(2, 0));
    return probe.ok;
  }, { timeout: 45000 }).toBe(true);
});

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
  await expect(page.locator('#shader-effect')).toHaveCount(0);
  await expect(page.locator('#sun-lighting')).toHaveCount(0);
  await expect(page.locator('#experimental-details-state')).toHaveCount(0);
  const experimentalDetailsEnabled = await page.evaluate(
    () => window.__synthTerrascapeDebug.experimentalDetailsEnabled(),
  );
  await expect(page.locator('#show-players')).toBeChecked();
  await expect(page.locator('#map-time')).not.toBeChecked();
  await expect(page.locator('#fog-enabled')).toBeChecked();
  await expect(page.locator('#fog-near')).toHaveValue('150');
  await expect(page.locator('#fog-far')).toHaveValue('620');
  await expect(page.locator('#fog-strength')).toHaveValue('0.9');
  await expect(page.locator('#fog-horizon')).toHaveValue('0.65');
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.cameraPose().fov)).toBe(70);
  await expect(page.locator('#height-grade')).toHaveCount(0);
  await expect(page.locator('#atmosphere-lighting')).toHaveCount(0);
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).toBeChecked();
  await expect(page.locator('#cosmetic-blocks-mode')).toHaveValue('split');
  await expect(page.locator('#visual-detail-mode')).toHaveValue('all');
  await setControlValue('#cosmetic-blocks-mode', 'baked');
  await expect(page.locator('#cosmetic-blocks-mode')).toHaveValue('baked');
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.viewState().cosmeticsMode)).toBe('baked');
  await setControlValue('#visual-detail-mode', 'basic');
  await expect(page.locator('#visual-detail-mode')).toHaveValue('basic');
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.viewState().visualDetailMode)).toBe('basic');
  await setControlValue('#visual-detail-mode', 'all');
  await expect(page.locator('#visual-detail-mode')).toHaveValue('all');
  await setControlValue('#cosmetic-blocks-mode', 'split');
  await expect(page.locator('#cosmetic-blocks-mode')).toHaveValue('split');
  await setControlValue('#cosmetic-blocks-mode', 'off');
  await expect(page.locator('#cosmetic-blocks-mode')).toHaveValue('off');
  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  if (await page.locator('#terrain-load-slots').count() > 0) {
    await expect(page.locator('#terrain-load-slots')).toHaveValue('4');
    await expect(page.locator('#terrain-load-slots-value')).toHaveValue('4');
    await expect(page.locator('#terrain-spawn-frame')).toHaveValue('2');
    await expect(page.locator('#terrain-spawn-frame-value')).toHaveValue('2');
    await expect(page.locator('#terrain-spawn-budget')).toHaveValue('4');
    await expect(page.locator('#terrain-spawn-budget-value')).toHaveValue('4');
    await setControlValue('#terrain-load-slots-value', '6', 'input');
    await setControlValue('#terrain-spawn-frame', '5', 'input');
    await setControlValue('#terrain-spawn-budget-value', '9', 'input');
    await expect(page.locator('#terrain-load-slots')).toHaveValue('6');
    await expect(page.locator('#terrain-spawn-frame-value')).toHaveValue('5');
    await expect(page.locator('#terrain-spawn-budget')).toHaveValue('9');
    expect(await page.evaluate(() => window.__synthTerrascapeDebug.terrainTuning())).toEqual({
      loadSlots: 6,
      spawnFrame: 5,
      spawnBudgetMs: 9,
    });
  }
  const mapTileFog = await page.evaluate(() => window.__synthTerrascapeDebug.skySummary());
  expect(mapTileFog.fogType).toBe(null);
  expect(mapTileFog.postFogEnabled).toBe(true);
  expect(mapTileFog.postFogNear).toBe(150);
  expect(mapTileFog.postFogFar).toBe(620);
  expect(typeof mapTileFog.postFogColor.r).toBe('number');
  let mapBackdrop = null;
  await expect.poll(async () => {
    mapBackdrop = await page.evaluate(() => window.__synthTerrascapeDebug.mapBackdropStats());
    return mapBackdrop.textureSize !== '';
  }).toBe(true);
  expect(mapBackdrop.radius).toBeLessThanOrEqual(108);
  expect(mapBackdrop.centerX).toBe(0);
  expect(mapBackdrop.centerZ).toBe(0);
  expect(mapBackdrop.chunks).toBe(mapBackdrop.radius * 2 + 1);
  expect(mapBackdrop.textureSize).toBe('32x32');
  await page.evaluate(() => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 80, y: 180, z: -40 },
      target: { x: 16, y: 122, z: 16 },
      lookAt: { x: 16, y: 122, z: 16 },
    });
  });
  await expect.poll(async () => page.evaluate(() => {
    const stats = window.__synthTerrascapeDebug.mapBackdropStats();
    return `${stats.loaded}:${stats.centerX}:${stats.centerZ}`;
  }), { timeout: 20000 }).toBe('1:0:0');
  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 0, 0');
  await expect(page.locator('#shade-size')).toHaveValue('1.85');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.85');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.4');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.4');
  await expect(page.locator('#show-mobs')).toBeChecked();
  await expect(page.locator('#mob-blocks')).toBeChecked();
  await expect(page.locator('.titlebar-actions #show-mobs')).toBeVisible();
  await expect(page.locator('.titlebar-actions #mob-blocks')).toBeVisible();
  await expect(page.locator('.hud #show-mobs')).toHaveCount(0);
  await expect(page.locator('#load')).toHaveCount(0);
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#metric-loaded')).toContainText('9 chunks');
  await expect(page.locator('#metric-resources')).toContainText('geo');
  await expect(page.locator('#metric-disposed')).toContainText('c');
  await expect(page.locator('#fps-value')).toBeVisible();
  await expect(page.locator('#fps-frame')).toBeVisible();
  await page.locator('#info-card-head').click();
  await expect(page.locator('.info-card')).toHaveClass(/collapsed/);
  await expect(page.locator('#fps-value')).toBeVisible();
  await expect(page.locator('#metric-loaded')).not.toBeVisible();
  await expect(page.locator('#info-card-head')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#info-card-head').click();
  await expect(page.locator('.info-card')).not.toHaveClass(/collapsed/);
  await expect(page.locator('#metric-loaded')).toBeVisible();
  await expect(page.locator('#info-card-head')).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => page.evaluate(() => {
    const counter = window.__synthTerrascapeDebug?.fpsCounter;
    return typeof counter?.fps === 'number' && typeof counter?.frameMs === 'number';
  })).toBe(true);
  const markerShape = await page.evaluate(async () => {
    const { createPlayerMarker, disposeObject } = await import('/dist/terrascape.js');
    const marker = createPlayerMarker({
      uuid: 'test-player',
      name: 'Avatar Tester',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000001.png?name=Avatar%20Tester',
    });
    const parts = [
      'player-legs',
      'player-body',
      'player-head',
      'player-face-glow',
      'player-look-light',
      'player-look-light-target',
      'player-card',
      'player-card-pointer',
    ];
    const result = {
      hasParts: parts.every((part) => marker.getObjectByName(part) !== undefined),
      hasBase: marker.getObjectByName('player-base') !== undefined,
      hasDiamond: marker.getObjectByName('player-overhead-diamond') !== undefined,
      sharedBadge: marker.userData.badge === marker.getObjectByName('player-card'),
      cardPlayerMode: marker.getObjectByName('player-card')?.userData.mob?.playerCard === true,
      cardIconUrl: marker.getObjectByName('player-card')?.userData.mob?.iconUrl,
      cardHideStats: marker.getObjectByName('player-card')?.userData.mob?.hideStats === true,
      headY: marker.getObjectByName('player-head')?.position.y,
      cardY: marker.getObjectByName('player-card')?.position.y,
      cardScaleY: marker.getObjectByName('player-card')?.scale.y,
      pointerScaleY: marker.getObjectByName('player-card-pointer')?.scale.y,
      pointerY: marker.getObjectByName('player-card-pointer')?.position.y,
      lightDistance: marker.getObjectByName('player-look-light')?.distance,
      lookTargetZ: marker.getObjectByName('player-look-light-target')?.position.z,
    };
    disposeObject(marker);
    return result;
  });
  expect(markerShape.hasParts).toBe(true);
  expect(markerShape.headY).toBeGreaterThan(2.35);
  expect(markerShape.headY).toBeLessThan(2.5);
  expect(markerShape.hasBase).toBe(false);
  expect(markerShape.hasDiamond).toBe(false);
  expect(markerShape.sharedBadge).toBe(true);
  expect(markerShape.cardPlayerMode).toBe(true);
  expect(markerShape.cardIconUrl).toContain('/api/player-avatar/');
  expect(markerShape.cardHideStats).toBe(true);
  expect(markerShape.cardScaleY).toBeGreaterThan(6);
  expect(markerShape.cardY).toBeGreaterThan(6.5);
  expect(markerShape.pointerScaleY).toBeGreaterThan(0.85);
  expect(markerShape.pointerY - markerShape.pointerScaleY / 2).toBeCloseTo(2.8, 2);
  expect(markerShape.cardY - markerShape.cardScaleY / 2).toBeGreaterThan(3.65);
  expect(markerShape.lightDistance).toBeGreaterThan(10);
  expect(markerShape.lookTargetZ).toBeLessThan(-4);

  const mobMarkerShape = await page.evaluate(async () => {
    const { createMobMarker, disposeObject, updateMobMarkerHeight } = await import('/dist/terrascape.js');
    const marker = createMobMarker({
      id: 'test-chicken',
      type: 'Chicken',
      label: 'Chicken',
      category: 'livestock',
      color: '#ffd36a',
      maxHealth: 29,
      attackDamage: 0,
      iconUrl: '/mob-icons/Chicken.png',
    });
    updateMobMarkerHeight(marker, 12);
    const block = marker.getObjectByName('mob-headshot-block');
    for (let i = 0; i < 120 && !block?.material?.[0]?.map; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const result = {
      hasCard: marker.getObjectByName('mob-card') !== undefined,
      hasGlow: marker.getObjectByName('mob-ground-glow') !== undefined,
      hasShadow: marker.getObjectByName('mob-ground-shadow') !== undefined,
      hasPointer: marker.getObjectByName('mob-pointer') !== undefined,
      hasHeadshotBlock: block !== undefined,
      cardY: marker.getObjectByName('mob-card')?.position.y,
      cardScaleX: marker.getObjectByName('mob-card')?.scale.x,
      cardScaleY: marker.getObjectByName('mob-card')?.scale.y,
      pointerScaleY: marker.getObjectByName('mob-pointer')?.scale.y,
      headshotScaleY: block?.scale.y,
      headshotScaleZ: block?.scale.z,
      headshotGeometryWidth: block?.geometry?.userData?.mobHeadshotSize?.width,
      headshotGeometryHeight: block?.geometry?.userData?.mobHeadshotSize?.height,
      headshotGeometryDepth: block?.geometry?.userData?.mobHeadshotSize?.depth,
      headshotImageOpacity: block?.material?.[0]?.opacity,
      headshotImageTransparent: block?.material?.[0]?.transparent,
      headshotImageTint: block?.material?.[0]?.color?.getHex(),
      headshotCapOpacity: block?.material?.[2]?.opacity,
      headshotCapTransparent: block?.material?.[2]?.transparent,
      headshotMaterialCount: Array.isArray(block?.material)
        ? block.material.length
        : 0,
      rightHasMap: block?.material?.[0]?.map?.isTexture === true,
      leftHasMap: block?.material?.[1]?.map?.isTexture === true,
      frontHasMap: block?.material?.[4]?.map?.isTexture === true,
      backHasMap: block?.material?.[5]?.map?.isTexture === true,
      topHasMap: block?.material?.[2]?.map?.isTexture === true,
      bottomHasMap: block?.material?.[3]?.map?.isTexture === true,
    };
    disposeObject(marker);
    return result;
  });
  expect(mobMarkerShape.hasCard).toBe(true);
  expect(mobMarkerShape.hasGlow).toBe(true);
  expect(mobMarkerShape.hasShadow).toBe(true);
  expect(mobMarkerShape.hasPointer).toBe(true);
  expect(mobMarkerShape.hasHeadshotBlock).toBe(true);
  expect(mobMarkerShape.cardY).toBe(12);
  expect(mobMarkerShape.cardScaleX).toBe(3.6);
  expect(mobMarkerShape.cardScaleY).toBe(4.8);
  expect(mobMarkerShape.pointerScaleY).toBeGreaterThan(10);
  expect(mobMarkerShape.headshotScaleY).toBe(1);
  expect(mobMarkerShape.headshotScaleZ).toBe(1);
  expect(mobMarkerShape.headshotGeometryHeight).toBeGreaterThan(0.2);
  expect(mobMarkerShape.headshotGeometryHeight).toBeLessThanOrEqual(2.3);
  expect(mobMarkerShape.headshotGeometryWidth).toBeGreaterThan(1);
  expect(mobMarkerShape.headshotGeometryDepth).toBeCloseTo(mobMarkerShape.headshotGeometryWidth, 4);
  expect(mobMarkerShape.headshotImageOpacity).toBe(1);
  expect(mobMarkerShape.headshotImageTransparent).toBe(true);
  expect(mobMarkerShape.headshotImageTint).toBe(0xffffff);
  expect(mobMarkerShape.headshotCapOpacity).toBe(1);
  expect(mobMarkerShape.headshotCapTransparent).toBe(false);
  expect(mobMarkerShape.headshotMaterialCount).toBe(6);
  expect(mobMarkerShape.rightHasMap).toBe(true);
  expect(mobMarkerShape.leftHasMap).toBe(true);
  expect(mobMarkerShape.frontHasMap).toBe(true);
  expect(mobMarkerShape.backHasMap).toBe(true);
  expect(mobMarkerShape.topHasMap).toBe(false);
  expect(mobMarkerShape.bottomHasMap).toBe(false);

  const paddedMobMarkerShape = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#48c2ff';
    ctx.fillRect(7, 4, 18, 24);
    const iconUrl = canvas.toDataURL('image/png');
    const { createMobMarker, disposeObject } = await import('/dist/terrascape.js');
    const marker = createMobMarker({
      id: 'test-padded-icon',
      type: 'PaddedIcon',
      label: 'PaddedIcon',
      color: '#48c2ff',
      iconUrl,
    });
    const block = marker.getObjectByName('mob-headshot-block');
    for (let i = 0; i < 120 && block?.geometry?.userData?.mobHeadshotSize?.cropWidth !== 20; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const size = block?.geometry?.userData?.mobHeadshotSize;
    const result = {
      cropX: size?.cropX,
      cropY: size?.cropY,
      cropWidth: size?.cropWidth,
      cropHeight: size?.cropHeight,
      width: size?.width,
      height: size?.height,
    };
    disposeObject(marker);
    return result;
  });
  expect(paddedMobMarkerShape.cropX).toBe(6);
  expect(paddedMobMarkerShape.cropY).toBe(3);
  expect(paddedMobMarkerShape.cropWidth).toBe(20);
  expect(paddedMobMarkerShape.cropHeight).toBe(26);
  expect(paddedMobMarkerShape.width).toBeCloseTo((20 * 2.3) / 32, 4);
  expect(paddedMobMarkerShape.height).toBeCloseTo((26 * 2.3) / 32, 4);
  expect(paddedMobMarkerShape.height).toBeLessThan(2.3);

  const testMobVisible = await page.evaluate(() => {
    window.__synthTerrascapeDebug.updateMobsForTest([{
      id: 'test-chicken',
      type: 'Chicken',
      label: 'Chicken',
      category: 'livestock',
      x: 8,
      y: 120,
      z: 8,
      color: '#ffd36a',
      source: 'test',
    }]);
    const marker = window.__synthTerrascapeDebug.mobMarkers.get('test-chicken');
    return {
      visible: marker?.visible === true,
      label: marker?.userData.mob?.label,
      hp: marker?.userData.mob?.hp,
      attackDamage: marker?.userData.mob?.attackDamage,
      iconUrl: marker?.userData.mob?.iconUrl,
      headshotVisible: marker?.userData.headshotBlock?.visible,
      headshotName: marker?.userData.headshotBlock?.name,
    };
  });
  expect(testMobVisible.visible).toBe(true);
  expect(testMobVisible.label).toBe('Chicken');
  expect(testMobVisible.hp).toBe(29);
  expect(testMobVisible.attackDamage).toBe(0);
  expect(testMobVisible.iconUrl).toBe('/mob-icons/Chicken.png');
  expect(testMobVisible.headshotVisible).toBe(true);
  expect(testMobVisible.headshotName).toBe('mob-headshot-block');

  const mobDistanceOpacity = await page.evaluate(async () => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 0, y: 120, z: 0 },
      target: { x: 32, y: 120, z: 32 },
      lookAt: { x: 32, y: 120, z: 32 },
    });
    window.__synthTerrascapeDebug.updateMobsForTest([
      {
        id: 'test-near-card',
        type: 'Chicken',
        label: 'Near',
        x: 10,
        y: 120,
        z: 10,
        color: '#80f2bd',
        source: 'test',
      },
      {
        id: 'test-far-card',
        type: 'Chicken',
        label: 'Far',
        x: 1200,
        y: 120,
        z: 10,
        color: '#80f2bd',
        source: 'test',
      },
    ]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const near = window.__synthTerrascapeDebug.mobMarkers.get('test-near-card');
    const far = window.__synthTerrascapeDebug.mobMarkers.get('test-far-card');
    return {
      nearCardOpacity: near?.userData.badge?.material?.opacity,
      farCardOpacity: far?.userData.badge?.material?.opacity,
      nearPointerOpacity: near?.userData.pointer?.material?.opacity,
      farPointerOpacity: far?.userData.pointer?.material?.opacity,
    };
  });
  expect(mobDistanceOpacity.nearCardOpacity).toBeCloseTo(1, 2);
  expect(mobDistanceOpacity.farCardOpacity).toBeGreaterThanOrEqual(0.33);
  expect(mobDistanceOpacity.farCardOpacity).toBeLessThan(0.45);
  expect(mobDistanceOpacity.farPointerOpacity).toBeLessThan(mobDistanceOpacity.nearPointerOpacity);

  await page.locator('#mob-blocks').uncheck();
  await expect(page.locator('#mob-blocks-panel')).not.toBeChecked();
  const mobBlocksHidden = await page.evaluate(() => {
    window.__synthTerrascapeDebug.updateMobsForTest([{
      id: 'test-chicken',
      type: 'Chicken',
      label: 'Chicken',
      category: 'livestock',
      x: 8,
      y: 120,
      z: 8,
      color: '#ffd36a',
      source: 'test',
    }]);
    const marker = window.__synthTerrascapeDebug.mobMarkers.get('test-chicken');
    return {
      markerCount: window.__synthTerrascapeDebug.mobMarkers.size,
      blockVisible: marker?.userData.headshotBlock?.visible,
      viewState: window.__synthTerrascapeDebug.viewState().mobBlocks,
    };
  });
  expect(mobBlocksHidden.markerCount).toBe(1);
  expect(mobBlocksHidden.blockVisible).toBe(false);
  expect(mobBlocksHidden.viewState).toBe(false);
  await page.locator('#mob-blocks').check();
  await expect(page.locator('#mob-blocks-panel')).toBeChecked();
  await expect(page.locator('#mob-blocks')).toBeChecked();
  await expect.poll(async () => page.evaluate(() => {
    const marker = window.__synthTerrascapeDebug.mobMarkers.get('test-chicken');
    return marker?.userData.headshotBlock?.visible;
  })).toBe(true);

  await page.locator('#show-mobs').uncheck();
  await expect.poll(async () => page.evaluate(() => {
    return window.__synthTerrascapeDebug.mobMarkers.size;
  })).toBe(0);
  await expect(page.locator('#metric-mobs')).toHaveText('hidden');
  await expect.poll(async () => page.evaluate(() => window.__synthTerrascapeDebug.entityStreamState().mobs)).toBe(false);
  await page.locator('#show-mobs').check();
  await expect.poll(async () => page.evaluate(() => {
    const state = window.__synthTerrascapeDebug.entityStreamState();
    return state.mobs === state.liveMobFeed;
  })).toBe(true);

  const predatorMobVisible = await page.evaluate(() => {
    window.__synthTerrascapeDebug.updateMobsForTest([{
      id: 'test-bear',
      type: 'Bear_Grizzly',
      label: 'Bear_Grizzly',
      category: 'passive',
      x: 9,
      y: 120,
      z: 9,
      color: '#a7e06f',
      source: 'test',
    }, {
      id: 'test-boar',
      type: 'Boar',
      label: 'Boar',
      category: 'livestock',
      x: 10,
      y: 120,
      z: 10,
      color: '#ffd36a',
      source: 'test',
    }, {
      id: 'test-skeleton',
      type: 'Skeleton_Fighter',
      label: 'Skeleton_Fighter',
      category: 'undead',
      x: 11,
      y: 120,
      z: 11,
      color: '#ff5c70',
      source: 'test',
    }]);
    return {
      bearAttack: window.__synthTerrascapeDebug.mobMarkers.get('test-bear')?.userData.mob?.attackDamage,
      bearHp: window.__synthTerrascapeDebug.mobMarkers.get('test-bear')?.userData.mob?.hp,
      boarAttack: window.__synthTerrascapeDebug.mobMarkers.get('test-boar')?.userData.mob?.attackDamage,
      skeletonAttack: window.__synthTerrascapeDebug.mobMarkers.get('test-skeleton')?.userData.mob?.attackDamage,
      skeletonHp: window.__synthTerrascapeDebug.mobMarkers.get('test-skeleton')?.userData.mob?.hp,
    };
  });
  expect(predatorMobVisible.bearAttack).toBe(38);
  expect(predatorMobVisible.bearHp).toBe(124);
  expect(predatorMobVisible.boarAttack).toBe(10);
  expect(predatorMobVisible.skeletonAttack).toBe(5);
  expect(predatorMobVisible.skeletonHp).toBe(36);

  const detailsResponse = await page.request.get('/npc-details.json');
  expect(detailsResponse.ok()).toBeTruthy();
  const detailsPayload = await detailsResponse.json();
  expect(detailsPayload.entries.Chicken.maxHealth).toBe(29);
  expect(detailsPayload.entries.Chicken.icon).toBe('mob-icons/Chicken.png');
  expect(detailsPayload.entries.Frog_Green.label).toBe('Frog');
  expect(detailsPayload.entries.Skeleton_Fighter.attackDamage).toBe(5);
  expect(detailsPayload.entries.Skeleton_Archer.attackDamage).toBe(20);
  expect(detailsPayload.entries.Wolf_Black.label).toBe('Black Wolf');
  expect(detailsPayload.entries.Wolf_Black.attackDamage).toBe(27);
  const iconResponse = await page.request.get('/mob-icons/Chicken.png');
  expect(iconResponse.ok()).toBeTruthy();
  expect(iconResponse.headers()['content-type']).toContain('image/png');

  const playersResponse = await page.request.get('/api/players/default');
  expect(playersResponse.ok()).toBeTruthy();
  const playersPayload = await playersResponse.json();
  expect(playersPayload.ok).toBeTruthy();
  expect(Array.isArray(playersPayload.players)).toBeTruthy();
  for (const player of playersPayload.players) {
    expect(typeof player.yaw).toBe('number');
    expect(typeof player.pitch).toBe('number');
    if (player.skin) {
      expect(typeof player.skin.key).toBe('string');
      expect(player.avatarUrl).toContain(`/api/player-avatar/${player.uuid}-${player.skin.key}.png`);
      expect(player.avatarUrl).not.toContain('skin=');
    } else {
      expect(player.avatarUrl).toContain(`/api/player-avatar/${player.uuid}.png`);
    }
  }
  await setControlChecked('#show-players', true);
  const avatarTesterTileState = await page.evaluate(() => {
    const uuid = '00000000-0000-0000-0000-000000000001';
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid,
      name: 'Avatar Tester',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000001.png?name=Avatar%20Tester',
      x: 0,
      y: 120,
      z: 0,
      yaw: 0,
    }]);
    const tile = window.__synthTerrascapeDebug.playerTiles.get(uuid);
    return {
      avatarText: tile?.avatar?.textContent ?? '',
      nameText: tile?.name?.textContent ?? '',
    };
  });
  expect(avatarTesterTileState.avatarText).toContain('AT');
  expect(avatarTesterTileState.nameText).toBe('Avatar Tester');
  const pitchedEyePose = await page.evaluate(() => {
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid: '00000000-0000-0000-0000-000000000001',
      name: 'Avatar Tester',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000001.png?name=Avatar%20Tester',
      x: 0,
      y: 120,
      z: 0,
      yaw: 0,
      pitch: 30,
    }]);
    window.__synthTerrascapeDebug.setPlayerEyeViewForTest('00000000-0000-0000-0000-000000000001');
    return window.__synthTerrascapeDebug.cameraPose();
  });
  expect(pitchedEyePose.target.y - pitchedEyePose.camera.y).toBeGreaterThan(5.8);
  expect(pitchedEyePose.target.z).toBeLessThan(pitchedEyePose.camera.z - 9);
  await page.evaluate(() => {
    window.__synthTerrascapeDebug.setPlayerEyeViewForTest(null);
  });
  const yawedEyePose = await page.evaluate(() => {
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid: '00000000-0000-0000-0000-000000000003',
      name: 'Left Turn',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000003.png?name=Left%20Turn',
      x: 0,
      y: 120,
      z: 0,
      yaw: -90,
      pitch: 0,
    }]);
    window.__synthTerrascapeDebug.setPlayerEyeViewForTest('00000000-0000-0000-0000-000000000003');
    return window.__synthTerrascapeDebug.cameraPose();
  });
  expect(yawedEyePose.target.x - yawedEyePose.camera.x).toBeGreaterThan(9);
  expect(Math.abs(yawedEyePose.target.z - yawedEyePose.camera.z)).toBeLessThan(1);
  const yawLerpSamples = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const player = {
      uuid: '00000000-0000-0000-0000-000000000004',
      name: 'Smooth Turn',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000004.png?name=Smooth%20Turn',
      x: 0,
      y: 120,
      z: 0,
      yaw: 0,
      pitch: 0,
    };
    window.__synthTerrascapeDebug.updatePlayersForTest([player]);
    window.__synthTerrascapeDebug.setPlayerEyeViewForTest(player.uuid);
    await frame();
    window.__synthTerrascapeDebug.updatePlayersForTest([{ ...player, yaw: -90 }]);
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      await frame();
      const pose = window.__synthTerrascapeDebug.cameraPose();
      samples.push(pose.target.x - pose.camera.x);
    }
    return samples;
  });
  const yawLerpMagnitudes = yawLerpSamples.map((sample) => Math.abs(sample));
  expect(yawLerpMagnitudes.at(-1)).toBeGreaterThan(5);
  expect(yawLerpMagnitudes.every((sample, index) => index === 0 || sample >= yawLerpMagnitudes[index - 1] - 0.05))
    .toBe(true);
  await page.evaluate(() => {
    window.__synthTerrascapeDebug.setPlayerEyeViewForTest(null);
  });
  const streamAnchor = await page.evaluate(() => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 976, y: 180, z: 976 },
      target: { x: 976, y: 120, z: 916 },
    });
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid: '00000000-0000-0000-0000-000000000001',
      name: 'Avatar Tester',
      avatarUrl: '/api/player-avatar/00000000-0000-0000-0000-000000000001.png?name=Avatar%20Tester',
      x: 96,
      y: 120,
      z: 64,
      yaw: 0,
    }]);
    return window.__synthTerrascapeDebug.streamAnchorChunk();
  });
  expect(streamAnchor).toEqual({ chunkX: 30, chunkZ: 30 });
  const playerAvatarReuse = await page.evaluate(() => {
    const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid: '00000000-0000-0000-0000-000000000002',
      name: 'Stable Avatar',
      avatarUrl: onePixelPng,
      x: 1,
      y: 120,
      z: 1,
      yaw: 0,
    }]);
    const tile = window.__synthTerrascapeDebug.playerTiles.get('00000000-0000-0000-0000-000000000002');
    const before = tile?.avatarImage;
    const beforeElement = tile?.element;
    window.__synthTerrascapeDebug.updatePlayersForTest([{
      uuid: '00000000-0000-0000-0000-000000000002',
      name: 'Stable Avatar',
      avatarUrl: onePixelPng,
      x: 2,
      y: 120,
      z: 2,
      yaw: 0,
    }]);
    const afterTile = window.__synthTerrascapeDebug.playerTiles.get('00000000-0000-0000-0000-000000000002');
    const after = afterTile?.avatarImage;
    return before instanceof HTMLImageElement && before === after && beforeElement === afterTile?.element;
  });
  expect(playerAvatarReuse).toBe(true);
  await page.evaluate((players) => {
    window.__synthTerrascapeDebug.updatePlayersForTest(players);
  }, playersPayload.players);

  const timeResponse = await page.request.get('/api/time/default');
  expect(timeResponse.ok()).toBeTruthy();
  const timePayload = await timeResponse.json();
  expect(timePayload.ok).toBeTruthy();
  expect(timePayload.hour).toBeGreaterThanOrEqual(0);
  expect(timePayload.hour).toBeLessThanOrEqual(23);
  expect(typeof timePayload.phase).toBe('string');
  expect(typeof timePayload.sunDirection?.x).toBe('number');
  await page.locator('#map-time').evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const afternoonSky = await page.evaluate(() => {
    window.__synthTerrascapeDebug.setWorldTimeForTest({
      dayProgress: 0.645,
      sunlightFactor: 0.2,
      phase: 'afternoon',
      sunDirection: { x: 0.35, y: -0.85, z: -0.2 },
    });
    return window.__synthTerrascapeDebug.skySummary();
  });
  expect(afternoonSky.starsVisible).toBe(false);
  expect(afternoonSky.background.b).toBeGreaterThan(afternoonSky.background.r);
  const mapDistanceFog = await page.evaluate(async () => {
    window.__synthTerrascapeDebug.setCameraPose({
      camera: { x: 80, y: 180, z: -40 },
      target: { x: 40, y: 122, z: 40 },
      lookAt: { x: 40, y: 122, z: 40 },
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return window.__synthTerrascapeDebug.skySummary();
  });
  expect(mapDistanceFog.fogType).toBe(null);
  expect(mapDistanceFog.postFogEnabled).toBe(true);
  expect(mapDistanceFog.postFogNear).toBe(150);
  expect(mapDistanceFog.postFogFar).toBe(620);
  const sunsetSky = await page.evaluate(() => {
    window.__synthTerrascapeDebug.setWorldTimeForTest({
      dayProgress: 0.758,
      sunlightFactor: 0,
      phase: 'sunset',
      sunDirection: { x: 0.58, y: -0.61, z: -0.13 },
    });
    return window.__synthTerrascapeDebug.skySummary();
  });
  expect(sunsetSky.starsVisible).toBe(false);
  const nightSky = await page.evaluate(() => {
    window.__synthTerrascapeDebug.setWorldTimeForTest({
      dayProgress: 0.04,
      sunlightFactor: 0,
      phase: 'midnight',
      sunDirection: { x: -0.2, y: 0.9, z: 0.2 },
    });
    return window.__synthTerrascapeDebug.skySummary();
  });
  expect(nightSky.starsVisible).toBe(true);
  const nightLighting = await page.evaluate(() => window.__synthTerrascapeDebug.lightingSummary());
  expect(nightLighting.ambientIntensity).toBeGreaterThan(0.65);
  expect(nightLighting.ambientIntensity).toBeLessThan(0.9);
  expect(nightLighting.sunIntensity).toBeLessThan(0.25);

  if (playersPayload.players.length > 0) {
    const player = playersPayload.players[0];
    await expect(page.locator('.player-tile-main').first()).toContainText(player.name);
    const coordinatesBeforeFocus = await page.locator('#coord-target').textContent();
    await page.locator('.player-tile-main').first().click();
    await expect(page.locator('#coord-target')).not.toHaveText(coordinatesBeforeFocus ?? '');
  }

  const mobsResponse = await page.request.get('/api/mobs/default');
  expect(mobsResponse.ok()).toBeTruthy();
  const mobsPayload = await mobsResponse.json();
  expect(mobsPayload.ok).toBeTruthy();
  expect(mobsPayload.world).toBe('default');
  expect(mobsPayload.max).toBe(256);
  expect(mobsPayload.radar).toBe(500);
  expect(Array.isArray(mobsPayload.mobs)).toBeTruthy();
  expect(typeof mobsPayload.sourceStats?.source).toBe('string');
  expect(typeof mobsPayload.sourceStats?.chunks).toBe('number');
  expect(typeof mobsPayload.sourceStats?.accepted).toBe('number');
  expect(typeof mobsPayload.sourceStats?.liveRoleMatches).toBe('number');
  for (const mob of mobsPayload.mobs) {
    expect(typeof mob.id).toBe('string');
    expect(typeof mob.type).toBe('string');
    expect(typeof mob.label).toBe('string');
    expect(typeof mob.category).toBe('string');
    expect(typeof mob.x).toBe('number');
    expect(typeof mob.y).toBe('number');
    expect(typeof mob.z).toBe('number');
    expect(typeof mob.color).toBe('string');
    expect(typeof mob.source).toBe('string');
    if (mob.yaw !== undefined) expect(typeof mob.yaw).toBe('number');
    if (mob.health !== undefined) expect(typeof mob.health).toBe('number');
    if (mob.maxHealth !== undefined) expect(typeof mob.maxHealth).toBe('number');
    if (mob.role !== undefined) expect(typeof mob.role).toBe('string');
    if (mob.npcTypeIndex !== undefined) expect(typeof mob.npcTypeIndex).toBe('number');
    if (mob.roleIndex !== undefined) expect(typeof mob.roleIndex).toBe('number');
    if (mob.modelAsset !== undefined) expect(typeof mob.modelAsset).toBe('string');
    if (mob.persistentModelAsset !== undefined) expect(typeof mob.persistentModelAsset).toBe('string');
    if (mob.liveRoleId !== undefined) expect(typeof mob.liveRoleId).toBe('string');
    if (mob.liveRoleCategory !== undefined) expect(typeof mob.liveRoleCategory).toBe('string');
    if (mob.liveRolePath !== undefined) expect(typeof mob.liveRolePath).toBe('string');
  }

  const npcIndexResponse = await page.request.get('/api/npc-index');
  expect(npcIndexResponse.ok()).toBeTruthy();
  const npcIndexPayload = await npcIndexResponse.json();
  expect(npcIndexPayload.ok).toBeTruthy();
  expect(typeof npcIndexPayload.loaded).toBe('boolean');
  expect(typeof npcIndexPayload.roles).toBe('number');

  const mobDebugResponse = await page.request.get('/api/mob-debug/default');
  expect(mobDebugResponse.ok()).toBeTruthy();
  const mobDebugPayload = await mobDebugResponse.json();
  expect(mobDebugPayload.ok).toBeTruthy();
  expect(typeof mobDebugPayload.players).toBe('number');
  expect(Array.isArray(mobDebugPayload.candidates)).toBeTruthy();
  for (const candidate of mobDebugPayload.candidates) {
    expect(typeof candidate.id).toBe('number');
    expect(typeof candidate.type).toBe('string');
    expect(typeof candidate.reason).toBe('string');
    expect(typeof candidate.distance).toBe('number');
  }

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
  const normalDetails = Number(normalDetailResponse.headers()['x-terrascape-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(normalDetails).toBeGreaterThan(0);
  } else {
    expect(normalDetails).toBe(0);
  }
  expect(['generated', 'disk', 'memory']).toContain(normalDetailResponse.headers()['x-terrascape-cache']);

  const detailResponse = await page.request.get('/api/terrain/default/0/-7.glb?details=1');
  expect(detailResponse.ok()).toBeTruthy();
  const overrideDetails = Number(detailResponse.headers()['x-terrascape-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(overrideDetails).toBeGreaterThan(0);
  } else {
    expect(overrideDetails).toBe(0);
  }
  expect(detailResponse.headers()['x-terrascape-cache']).toBe('memory');

  const cosmeticDetailResponse = await page.request.get('/api/terrain/default/0/-7.glb?cosmetics=1&visualDetail=all');
  expect(cosmeticDetailResponse.ok()).toBeTruthy();
  const cosmeticDetails = Number(cosmeticDetailResponse.headers()['x-terrascape-details'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(cosmeticDetails).toBeGreaterThanOrEqual(overrideDetails);
  } else {
    expect(cosmeticDetails).toBe(0);
  }
  expect(['generated', 'disk', 'memory']).toContain(cosmeticDetailResponse.headers()['x-terrascape-cache']);

  const cosmeticBasicResponse = await page.request.get('/api/terrain/default/0/-7.glb?cosmetics=1&visualDetail=basic');
  expect(cosmeticBasicResponse.ok()).toBeTruthy();
  expect(['generated', 'disk', 'memory']).toContain(cosmeticBasicResponse.headers()['x-terrascape-cache']);

  const cosmeticOnlyResponse = await page.request.get('/api/terrain/default/0/-7.glb?cosmetics=only&visualDetail=all');
  expect(cosmeticOnlyResponse.ok()).toBeTruthy();
  const cosmeticOnlyVertices = Number(cosmeticOnlyResponse.headers()['x-terrascape-vertices'] ?? 0);
  if (experimentalDetailsEnabled) {
    expect(cosmeticOnlyVertices).toBeGreaterThanOrEqual(0);
  } else {
    expect(cosmeticOnlyVertices).toBe(0);
  }
  expect(['generated', 'disk', 'memory']).toContain(cosmeticOnlyResponse.headers()['x-terrascape-cache']);

  const oldLodTerrain = await page.request.get('/api/terrain/default/1/-7/3.glb');
  expect(oldLodTerrain.status()).toBe(400);
  expect((await oldLodTerrain.json()).error).toBe('expected_/api/terrain/{world}/{chunkX}/{chunkZ}.glb_or_.map.png');

  await setControlValue('#water-mode', 'solid');
  await expect(page.locator('#water-mode')).toHaveValue('solid');
  await expect.poll(async () => page.evaluate(() => {
    return window.__synthTerrascapeDebug.waterMaterialSummary().every((material) => material.shaderMix === 0);
  })).toBe(true);
  await setControlValue('#water-mode', 'transparent');
  await expect(page.locator('#water-mode')).toHaveValue('transparent');
  await expect.poll(async () => page.evaluate(() => {
    return window.__synthTerrascapeDebug.waterMaterialSummary().every((material) => material.alpha === 0.48);
  })).toBe(true);
  await setControlValue('#water-mode', 'hidden');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await setControlChecked('#tree-shade', true);
  await setControlValue('#shade-size-value', '1.35', 'input');
  await setControlValue('#shade-darkness-value', '0.8', 'input');
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.35');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.35');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.8');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.8');
  await setControlValue('#shade-size', '1.6', 'input');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.6');
  await setControlChecked('#fog-enabled', false);
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.viewState().fog.enabled)).toBe(false);
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.skySummary().postFogEnabled)).toBe(false);
  await setControlChecked('#fog-enabled', true);
  await setControlValue('#fog-near-value', '240', 'input');
  await setControlValue('#fog-far', '900', 'input');
  await setControlValue('#fog-strength-value', '0.72', 'input');
  await setControlValue('#fog-horizon', '1.1', 'input');
  await expect(page.locator('#fog-near')).toHaveValue('240');
  await expect(page.locator('#fog-far-value')).toHaveValue('900');
  await expect(page.locator('#fog-strength')).toHaveValue('0.72');
  await expect(page.locator('#fog-horizon-value')).toHaveValue('1.1');
  expect(await page.evaluate(() => window.__synthTerrascapeDebug.viewState().fog)).toEqual({
    enabled: true,
    near: 240,
    far: 900,
    strength: 0.72,
    horizon: 1.1,
  });

  await setControlValue('#radius-range', '2', 'input');
  await expect(page.locator('#radius')).toHaveValue('2');
  await expect(page.locator('#radius-diameter')).toHaveText('5 x 5 chunks, 25 meshes');
  await expect(page.locator('#status')).toHaveText('Loaded 25 chunks around 0, 0');

  await setControlValue('#chunk-x', '2', 'input');

  await expect(page.locator('#status')).toHaveText('Loaded 25 chunks around 2, 0');
  await expect(page.locator('.info-card')).toContainText('25 chunks');
  await expect(page.locator('.info-card')).toContainText(/[1-9]\d*c/);

  await page.evaluate(() => {
    window.localStorage.setItem('synthborn-terrascape.viewState.v1', JSON.stringify({
      world: 'default',
      chunkX: 2,
      chunkZ: 3,
      radius: 1,
      auto: false,
      bounds: true,
      players: false,
      shade: true,
      mapTime: true,
      mapTiles: true,
      shadeSize: 1.45,
      shadeDarkness: 0.75,
      water: 'hidden',
      fog: true,
      fogNear: 260,
      fogFar: 940,
      fogStrength: 0.8,
      fogHorizon: 1.15,
      camera: { x: 120, y: 150, z: 160 },
      target: { x: 80, y: 122, z: 112 },
    }));
  });
  await page.goto('/?chunkX=2&chunkZ=3&radius=1&auto=false&bounds=true&players=false&water=hidden&shadeSize=1.45&shadeDarkness=0.75&fogNear=260&fogFar=940&fogStrength=0.8&fogHorizon=1.15');

  await expect(page.locator('#status')).toHaveText('Loaded 9 chunks around 2, 3');
  await expect(page.locator('#water-mode')).toHaveValue('hidden');
  await expect(page.locator('#shader-effect')).toHaveCount(0);
  await expect(page.locator('#auto-stream')).not.toBeChecked();
  await expect(page.locator('#debug-bounds')).toBeChecked();
  await expect(page.locator('#show-players')).not.toBeChecked();
  await expect(page.locator('#map-time')).toBeChecked();
  await expect(page.locator('#tree-shade')).toBeChecked();
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).toBeChecked();
  await expect(page.locator('#shade-size')).toHaveValue('1.45');
  await expect(page.locator('#shade-size-value')).toHaveValue('1.45');
  await expect(page.locator('#shade-darkness')).toHaveValue('0.75');
  await expect(page.locator('#shade-darkness-value')).toHaveValue('0.75');
  await expect(page.locator('#fog-enabled')).toBeChecked();
  await expect(page.locator('#fog-near')).toHaveValue('260');
  await expect(page.locator('#fog-far')).toHaveValue('940');
  await expect(page.locator('#fog-strength')).toHaveValue('0.8');
  await expect(page.locator('#fog-horizon')).toHaveValue('1.15');
  await expect(page.locator('#show-mobs')).toBeChecked();
  await expect(page.locator('#players')).toHaveText('Players hidden');
  await expect(page.locator('#coord-target')).toHaveText('80, 116, 112');
  await expect(page.locator('#coord-camera')).toHaveText(/-?\d+, -?\d+, -?\d+/);

  await page.goto('/?radius=1&chunkX=0&chunkZ=0&auto=false&mapTiles=false');
  await expect(page.locator('#lod-horizon')).toHaveCount(0);
  await expect(page.locator('#map-tiles')).not.toBeChecked();
});
