const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const HISTORY_DIR = path.join(__dirname, '..', 'perf-history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'worldview-perf-history.jsonl');
const DEFAULT_CENTER_X = Number.parseInt(process.env.WORLDVIEW_PERF_CENTER_X ?? '0', 10);
const DEFAULT_CENTER_Z = Number.parseInt(process.env.WORLDVIEW_PERF_CENTER_Z ?? '0', 10);
const DEFAULT_RADIUS = Number.parseInt(process.env.WORLDVIEW_PERF_RADIUS ?? '10', 10);
const ROUTE_STEPS = Number.parseInt(process.env.WORLDVIEW_PERF_STEPS ?? '4', 10);
const DEFAULT_FLY_CHUNKS = Number.parseInt(process.env.WORLDVIEW_PERF_FLY_CHUNKS ?? '6', 10);
const DEFAULT_FLY_SAMPLE_MS = Number.parseInt(process.env.WORLDVIEW_PERF_FLY_SAMPLE_MS ?? '100', 10);
const MODE = process.env.WORLDVIEW_PERF_MODE ?? 'both';
const ENFORCE = process.env.WORLDVIEW_PERF_ENFORCE === '1';
const REGRESSION_FACTOR = Number.parseFloat(process.env.WORLDVIEW_PERF_REGRESSION_FACTOR ?? '1.5');
const RUN_ID = process.env.WORLDVIEW_PERF_RUN_ID ?? 'single';
const REPORT_FILE = process.env.WORLDVIEW_PERF_REPORT_FILE ?? '';
const SUITE_SCENARIOS = parseScenarioPayload(process.env.WORLDVIEW_PERF_SCENARIOS);
const CHUNK_SIZE = 32;
const FLY_MOVE_SPEED = 72;
const FLY_SPRINT_MULTIPLIER = 3;
const FLY_DIRECTION_CATALOG = {
  north: { id: 'north', label: 'fly-up', key: 'w', dx: 0, dz: -1 },
  west: { id: 'west', label: 'fly-west', key: 'a', dx: -1, dz: 0 },
  east: { id: 'east', label: 'fly-east', key: 'd', dx: 1, dz: 0 },
  south: { id: 'south', label: 'fly-down', key: 's', dx: 0, dz: 1 },
};
const FLY_DIRECTION_PRESETS = {
  all: ['north', 'west', 'east', 'south'],
  'east-west': ['east', 'west'],
};
const FLY_DIRECTIONS = FLY_DIRECTION_PRESETS.all.map((id) => FLY_DIRECTION_CATALOG[id]);

test.describe.configure({ timeout: 60 * 60_000 });

test('worldview performance suite', async ({ page }, testInfo) => {
  const scenarios = SUITE_SCENARIOS ?? [legacyScenario()];
  const runResults = [];
  let browserCacheWarmed = false;

  for (const scenario of scenarios) {
    const runModes = scenario.modes ?? (MODE === 'both' ? ['wet', 'dry'] : [MODE]);
    for (const mode of runModes) {
      if (mode === 'wet') {
        await clearBrowserMeshCache(page);
      }
      if (mode === 'dry' && !browserCacheWarmed) {
        await clearBrowserMeshCache(page);
        await runPerfRoute(page, scenario, 'dry-warmup');
        browserCacheWarmed = true;
      }

      const result = await runPerfRoute(page, scenario, mode);
      if (mode === 'wet') {
        browserCacheWarmed = true;
      }
      runResults.push(result);
      await appendHistory(result);

      const comparison = compareWithHistory(result);
      await logPerfEvent(page, 'perf_history_compare', {
        scenarioId: scenario.id,
        mode,
        totalMs: result.totalMs,
        previousMedianMs: comparison.previousMedianMs,
        ratio: comparison.ratio,
        samples: comparison.samples,
      });

      const regressionFactor = scenario.regressionFactor ?? REGRESSION_FACTOR;
      if (comparison.isRegression(regressionFactor)) {
        const message = `Worldview perf regression [${scenario.id}/${mode}]: total ${result.totalMs}ms vs history median ${comparison.previousMedianMs}ms (${comparison.ratio.toFixed(2)}x)`;
        testInfo.annotations.push({ type: 'perf', description: message });
        if (ENFORCE) {
          expect(comparison.isRegression(regressionFactor), message).toBe(false);
        }
      }
    }
  }

  const report = {
    kind: 'worldview-perf-run',
    runId: RUN_ID,
    startedAt: runResults[0]?.timestamp ?? new Date().toISOString(),
    baseURL: process.env.WORLDVIEW_URL ?? 'http://127.0.0.1:5960',
    results: runResults,
  };

  if (REPORT_FILE) {
    await fs.promises.mkdir(path.dirname(path.resolve(REPORT_FILE)), { recursive: true });
    await fs.promises.writeFile(path.resolve(REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  await testInfo.attach('worldview-perf-results', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
});

function legacyScenario() {
  return {
    id: 'legacy-default',
    label: 'Legacy single-scenario perf route',
    centerX: numberOr(DEFAULT_CENTER_X, 0),
    centerZ: numberOr(DEFAULT_CENTER_Z, 0),
    radius: Math.max(0, numberOr(DEFAULT_RADIUS, 10)),
    steps: Math.max(1, numberOr(ROUTE_STEPS, 4)),
    modes: MODE === 'both' ? ['wet', 'dry'] : [MODE],
    regressionFactor: REGRESSION_FACTOR,
    stepSettleMs: 250,
    flyChunks: Math.max(1, numberOr(DEFAULT_FLY_CHUNKS, 6)),
    flyLegs: true,
    flySprint: false,
    flySampleMs: Math.max(50, numberOr(DEFAULT_FLY_SAMPLE_MS, 100)),
    world: 'default',
    features: {
      mapTiles: true,
      players: true,
      mobs: false,
      water: 'solid',
      auto: false,
    },
    esp: null,
  };
}

function parseScenarioPayload(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function runPerfRoute(page, scenario, mode) {
  const centerX = numberOr(scenario.centerX, 0);
  const centerZ = numberOr(scenario.centerZ, 0);
  const radius = Math.max(0, numberOr(scenario.radius, 10));
  const steps = Math.max(0, numberOr(scenario.steps, 4));
  const stepSettleMs = Math.max(0, numberOr(scenario.stepSettleMs, 250));
  const flyChunks = Math.max(1, numberOr(scenario.flyChunks, 6));
  const flyLegsEnabled = scenario.flyLegs !== false;
  const flySprint = scenario.flySprint === true;
  const flySampleMs = Math.max(50, numberOr(scenario.flySampleMs, 100));
  const flyDirections = resolveFlyDirections(scenario.flyDirections);
  const world = scenario.world ?? 'default';
  const features = scenario.features ?? {};
  const route = buildRoute(centerX, centerZ, steps);
  const started = Date.now();
  const stepResults = [];
  let flyCanvasFocused = false;

  await page.goto(buildPerfUrl({
    world,
    centerX,
    centerZ,
    radius,
    features,
  }));
  await page.evaluate(() => window.__synthWorldviewDebug.resetGridLoadCount());
  await page.evaluate(() => window.__synthWorldviewDebug.loadGrid({ focus: true }));
  await waitForReady(page, { centerX, centerZ, radius, features, world });
  await logPerfEvent(page, 'perf_route_start', {
    scenarioId: scenario.id,
    mode,
    centerX,
    centerZ,
    radius,
    steps,
    route: route.length,
    flyChunks,
    flyLegs: flyLegsEnabled,
    features,
  });

  for (const step of route) {
    const stepStarted = Date.now();
    const skipGridReload = steps === 0 && step.label === 'center';
    if (!skipGridReload) {
      await page.evaluate(({ x, z }) => {
        return window.__synthWorldviewDebug.loadGrid({ centerX: x, centerZ: z });
      }, { x: step.x, z: step.z });
      await waitForReady(page, { centerX: step.x, centerZ: step.z, radius, features, world });
    }
    if (scenario.esp) {
      await injectEspLoad(page, scenario.esp, step.x, step.z);
    }

    const flyLegResults = [];
    if (flyLegsEnabled) {
      flyCanvasFocused = await focusFlyCanvas(page, flyCanvasFocused);
      await setAutoStream(page, true);
      for (const direction of flyDirections) {
        const flyLeg = await runFlyLeg(page, {
          direction,
          flyChunks,
          flySprint,
          flySampleMs,
          radius,
          features,
        });
        flyLegResults.push(flyLeg);
      }
      if (!features.auto) {
        await setAutoStream(page, false);
      }
    }

    if (stepSettleMs > 0) {
      await page.waitForTimeout(stepSettleMs);
    }
    const stats = await collectStats(page, step.x, step.z, radius, features, scenario.esp);
    const flyMs = flyLegResults.reduce((sum, leg) => sum + leg.flyMs, 0);
    stepResults.push({
      label: step.label,
      centerX: step.x,
      centerZ: step.z,
      ms: Date.now() - stepStarted,
      flyMs,
      flyLegs: flyLegResults,
      minFpsDuringFly: flyLegResults.length > 0
        ? Math.min(...flyLegResults.map((leg) => leg.fpsMin).filter(Number.isFinite))
        : null,
      ...stats,
    });
  }

  const entityOverlay = stepResults.at(-1)?.entityOverlay ?? null;
  const result = {
    kind: 'worldview-perf',
    timestamp: new Date().toISOString(),
    runId: RUN_ID,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label ?? scenario.id,
    mode,
    baseURL: process.env.WORLDVIEW_URL ?? 'http://127.0.0.1:5960',
    world,
    centerX,
    centerZ,
    radius,
    routeSteps: steps,
    routeLength: route.length,
    flyChunks,
    flyLegs: flyLegsEnabled,
    flyDirectionCount: flyDirections.length,
    features,
    esp: scenario.esp ?? null,
    totalMs: Date.now() - started,
    totalFlyMs: stepResults.reduce((sum, step) => sum + (step.flyMs ?? 0), 0),
    maxStepMs: Math.max(...stepResults.map((step) => step.ms)),
    averageStepMs: Math.round(stepResults.reduce((sum, step) => sum + step.ms, 0) / stepResults.length),
    minFps: Math.min(...stepResults.map((step) => step.fps).filter(Number.isFinite)),
    minFpsDuringFly: Math.min(...stepResults.map((step) => step.minFpsDuringFly).filter(Number.isFinite)),
    maxFrameMs: Math.max(...stepResults.map((step) => step.frameMs).filter(Number.isFinite)),
    maxFrameMsDuringFly: Math.max(...stepResults.flatMap((step) => (step.flyLegs ?? []).map((leg) => leg.frameMsMax)).filter(Number.isFinite)),
    p95FrameMsDuringFly: Math.max(...stepResults.flatMap((step) => (step.flyLegs ?? []).map((leg) => leg.jank?.p95FrameMs)).filter(Number.isFinite)),
    hitchCount50DuringFly: sumFinite(stepResults.flatMap((step) => (step.flyLegs ?? []).map((leg) => leg.jank?.hitchCount50))),
    longestHitchMsDuringFly: Math.max(...stepResults.flatMap((step) => (step.flyLegs ?? []).map((leg) => leg.jank?.longestHitchMs)).filter(Number.isFinite)),
    maxGridLoadMs: Math.max(...stepResults.flatMap((step) => (step.flyLegs ?? []).map((leg) => leg.lastGridLoad?.ms)).filter(Number.isFinite)),
    finalLoadedChunks: stepResults.at(-1)?.loadedChunks ?? 0,
    gridLoadCount: stepResults.at(-1)?.gridLoadCount ?? 0,
    finalMapBackdrop: stepResults.at(-1)?.mapBackdrop ?? null,
    entityOverlay,
    stepResults,
  };

  await logPerfEvent(page, 'perf_route_end', {
    scenarioId: scenario.id,
    mode,
    totalMs: result.totalMs,
    averageStepMs: result.averageStepMs,
    maxStepMs: result.maxStepMs,
    minFps: result.minFps,
    minFpsDuringFly: result.minFpsDuringFly,
    totalFlyMs: result.totalFlyMs,
    routeLength: route.length,
    mapBackdropMs: result.finalMapBackdrop?.loadMs ?? null,
    espPlayers: entityOverlay?.players ?? 0,
    espMobs: entityOverlay?.mobs ?? 0,
  });

  return result;
}

function buildPerfUrl({ world, centerX, centerZ, radius, features }) {
  const params = new URLSearchParams({
    world,
    chunkX: String(centerX),
    chunkZ: String(centerZ),
    radius: String(radius),
    auto: String(features.auto === true),
    players: String(features.players !== false),
    mobs: String(features.mobs === true),
    mapTiles: String(features.mapTiles !== false),
    sun: String(features.sun !== false),
    shade: String(features.shade !== false),
    mapTime: String(features.mapTime === true),
    bounds: String(features.bounds === true),
    perfTelemetry: 'true',
    water: features.water ?? 'solid',
    shader: features.shader ?? 'none',
  });
  return `/?${params.toString()}`;
}

function resolveFlyDirections(selection) {
  if (Array.isArray(selection) && selection.length > 0) {
    return selection.map((id) => FLY_DIRECTION_CATALOG[id]).filter(Boolean);
  }
  if (typeof selection === 'string' && FLY_DIRECTION_PRESETS[selection]) {
    return FLY_DIRECTION_PRESETS[selection].map((id) => FLY_DIRECTION_CATALOG[id]);
  }
  return FLY_DIRECTIONS;
}

async function injectEspLoad(page, esp, centerX, centerZ) {
  const players = [];
  const mobs = [];
  const playerCount = Math.max(0, numberOr(esp.players, 0));
  const mobCount = Math.max(0, numberOr(esp.mobs, 0));

  for (let i = 0; i < playerCount; i++) {
    const angle = (i / Math.max(1, playerCount)) * Math.PI * 2;
    const distance = 16 + (i % 8) * 12;
    players.push({
      uuid: `perf-player-${String(i).padStart(4, '0')}`,
      name: `Perf Player ${i + 1}`,
      avatarUrl: `/api/player-avatar/perf-player-${String(i).padStart(4, '0')}.png?name=Perf%20Player%20${i + 1}`,
      x: centerX * 32 + Math.cos(angle) * distance,
      y: 120 + (i % 3),
      z: centerZ * 32 + Math.sin(angle) * distance,
      yaw: (i * 37) % 360,
    });
  }

  for (let i = 0; i < mobCount; i++) {
    const angle = (i / Math.max(1, mobCount)) * Math.PI * 2;
    const distance = 8 + (i % 10) * 10;
    mobs.push({
      id: `perf-mob-${String(i).padStart(4, '0')}`,
      type: i % 2 === 0 ? 'Chicken' : 'Bear_Grizzly',
      label: i % 2 === 0 ? 'Chicken' : 'Bear_Grizzly',
      category: i % 2 === 0 ? 'livestock' : 'passive',
      x: centerX * 32 + Math.cos(angle) * distance,
      y: 120,
      z: centerZ * 32 + Math.sin(angle) * distance,
      color: i % 2 === 0 ? '#ffd36a' : '#c97d4d',
      source: 'perf',
    });
  }

  await page.evaluate(({ players, mobs, showPlayers, showMobs }) => {
    if (showPlayers) {
      const input = document.querySelector('#show-players');
      if (input) {
        input.checked = true;
      }
    }
    if (showMobs) {
      const input = document.querySelector('#show-mobs');
      if (input) {
        input.checked = true;
      }
    }
    if (players.length > 0) {
      window.__synthWorldviewDebug.updatePlayersForTest(players);
    }
    if (mobs.length > 0) {
      window.__synthWorldviewDebug.scheduleMobsForTest?.(mobs);
    }
  }, {
    players,
    mobs,
    showPlayers: esp.showPlayers === true || playerCount > 0,
    showMobs: esp.showMobs === true || mobCount > 0,
  });
  if (mobCount > 0) {
    await expect.poll(async () => {
      return page.evaluate(() => window.__synthWorldviewDebug.mobMarkers.size);
    }, { timeout: 15_000 }).toBe(mobCount);
  }
  await page.waitForTimeout(400);
}

function buildRoute(centerX, centerZ, steps) {
  if (steps <= 0) {
    return [{ x: centerX, z: centerZ, label: 'center' }];
  }
  const route = [];
  const addLine = (dx, dz, label) => {
    for (let i = 1; i <= steps; i++) {
      route.push({ x: centerX + dx * i, z: centerZ + dz * i, label: `${label}-${i}` });
    }
    for (let i = steps - 1; i >= 0; i--) {
      route.push({ x: centerX + dx * i, z: centerZ + dz * i, label: `${label}-return-${i}` });
    }
  };
  addLine(1, 0, 'east');
  addLine(-1, 0, 'west');
  addLine(0, 1, 'south');
  addLine(0, -1, 'north');
  return route;
}

async function focusFlyCanvas(page, alreadyFocused) {
  if (alreadyFocused) return true;
  await page.locator('canvas').click({ position: { x: 220, y: 220 } });
  return true;
}

async function setAutoStream(page, enabled) {
  await page.evaluate((value) => {
    window.__synthWorldviewDebug.setAutoStream(value);
  }, enabled);
}

function flyHoldMs(chunks, sprint) {
  const distance = chunks * CHUNK_SIZE;
  const speed = FLY_MOVE_SPEED * (sprint ? FLY_SPRINT_MULTIPLIER : 1);
  return Math.ceil((distance / speed) * 1000) + 500;
}

async function runFlyLeg(page, { direction, flyChunks, flySprint, flySampleMs, radius, features }) {
  const holdMs = flyHoldMs(flyChunks, flySprint);
  const started = Date.now();
  const before = await page.evaluate(() => ({
    camera: window.__synthWorldviewDebug.cameraPose().camera,
    chunk: window.__synthWorldviewDebug.streamAnchorChunk(),
  }));

  await page.evaluate(({ dx, dz }) => {
    const pose = window.__synthWorldviewDebug.cameraPose().camera;
    const y = pose.y;
    window.__synthWorldviewDebug.setCameraPose({
      camera: { x: pose.x, y, z: pose.z },
      target: { x: pose.x + dx * 64, y, z: pose.z + dz * 64 },
    });
  }, { dx: direction.dx, dz: direction.dz });
  await page.evaluate(() => window.__synthWorldviewDebug.resetJankStats());

  const fpsSamples = [];
  if (flySprint) await page.keyboard.down('Shift');
  await page.keyboard.down(direction.key);
  const endAt = Date.now() + holdMs;
  while (Date.now() < endAt) {
    await page.waitForTimeout(flySampleMs);
    fpsSamples.push(await page.evaluate(() => ({
      fps: Math.round(window.__synthWorldviewDebug.fpsCounter?.fps ?? 0),
      frameMs: window.__synthWorldviewDebug.fpsCounter?.frameMs ?? 0,
    })));
  }
  await page.keyboard.up(direction.key);
  if (flySprint) await page.keyboard.up('Shift');

  await waitForCameraChunkReady(page, { radius, features });

  const after = await page.evaluate(() => ({
    camera: window.__synthWorldviewDebug.cameraPose().camera,
    chunk: window.__synthWorldviewDebug.streamAnchorChunk(),
    perf: window.__synthWorldviewDebug.lastPerfTimings(),
    mapBackdrop: window.__synthWorldviewDebug.mapBackdropStats(),
    jank: window.__synthWorldviewDebug.jankStats(),
    chunkPlaceholders: window.__synthWorldviewDebug.chunkPlaceholderWaiting(),
  }));
  const distance = Math.hypot(
    after.camera.x - before.camera.x,
    after.camera.z - before.camera.z,
  );

  return {
    label: direction.label,
    direction: direction.id,
    key: direction.key,
    targetChunks: flyChunks,
    holdMs,
    flyMs: Date.now() - started,
    distanceBlocks: Math.round(distance),
    chunkBefore: before.chunk,
    chunkAfter: after.chunk,
    fpsMin: fpsSamples.length > 0 ? Math.min(...fpsSamples.map((s) => s.fps)) : null,
    fpsMax: fpsSamples.length > 0 ? Math.max(...fpsSamples.map((s) => s.fps)) : null,
    frameMsMax: fpsSamples.length > 0 ? Math.max(...fpsSamples.map((s) => s.frameMs)) : null,
    fpsSamples: fpsSamples.length,
    lastGridLoad: after.perf?.gridLoad ?? null,
    lastTerrainBatch: after.perf?.terrainBatch ?? null,
    mapBackdrop: after.mapBackdrop,
    jank: after.jank ?? null,
    chunkPlaceholders: after.chunkPlaceholders ?? 0,
  };
}

function sumFinite(values) {
  const filtered = values.filter(Number.isFinite);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0);
}

async function waitForCameraChunkReady(page, { radius, features }) {
  await page.waitForTimeout(350);
  const chunk = await page.evaluate(() => window.__synthWorldviewDebug.streamAnchorChunk());
  await waitForReady(page, {
    centerX: chunk.chunkX,
    centerZ: chunk.chunkZ,
    radius,
    features,
    world: await page.evaluate(() => document.querySelector('#world')?.value ?? 'default'),
  });
}

async function waitForReady(page, { centerX, centerZ, radius, features, world = 'default' }) {
  const expectedChunks = (radius * 2 + 1) ** 2;
  await expect(page.locator('#status')).toHaveText(`Loaded ${expectedChunks} chunks around ${centerX}, ${centerZ}`, {
    timeout: 180_000,
  });
  await expect.poll(async () => page.evaluate(({ centerX, centerZ, radius, world }) => {
    let count = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const id = `${world}:${centerX + dx}:${centerZ + dz}`;
        if (window.__synthWorldviewDebug.loadedChunks.has(id)) count++;
      }
    }
    return count;
  }, { centerX, centerZ, radius, world }), {
    timeout: 60_000,
  }).toBe(expectedChunks);

  if (features.mapTiles !== false) {
    await expect.poll(async () => page.evaluate(() => window.__synthWorldviewDebug.mapBackdropStats().loaded), {
      timeout: 90_000,
    }).toBe(1);
  }
}

async function collectStats(page, centerX, centerZ, radius, features, esp) {
  return await page.evaluate(({ centerX, centerZ, radius, features, esp }) => {
    const debug = window.__synthWorldviewDebug;
    const mapBackdrop = debug.mapBackdropStats();
    const counter = debug.fpsCounter;
    const gpuText = document.querySelector('#metric-gpu')?.textContent ?? '';
    const resourcesText = document.querySelector('#metric-resources')?.textContent ?? '';
    const resourceMatch = resourcesText.match(/(\d+)\s+geo\s*·\s*(\d+)\s+mat\s*·\s*(\d+)\s+tex/);
    const gpuMatch = gpuText.match(/(\d+)\s+geo\s*·\s*(\d+)\s+tex/);
    const perfTimings = debug.lastPerfTimings();
    const cameraChunk = debug.cameraChunk();
    const streamChunk = debug.streamAnchorChunk();
    const gridLoads = debug.gridLoadCount();
    const renderFeatures = debug.viewState?.() ?? null;
    return {
      centerX,
      centerZ,
      radius,
      loadedChunks: debug.loadedChunks.size,
      activeCenterId: debug.activeCenterId(),
      requestedCenterId: debug.requestedCenterId(),
      cameraChunk,
      streamChunk,
      fps: Math.round(counter?.fps ?? 0),
      frameMs: Math.round((counter?.frameMs ?? 0) * 10) / 10,
      mapBackdrop,
      lastGridLoad: perfTimings?.gridLoad ?? null,
      lastTerrainBatch: perfTimings?.terrainBatch ?? null,
      gridLoadCount: gridLoads,
      renderFeatures,
      entityOverlay: {
        players: debug.playerMarkers?.size ?? 0,
        mobs: debug.mobMarkers?.size ?? 0,
        playerTiles: debug.playerTiles?.size ?? 0,
        entityStream: debug.entityStreamState(),
        playersEnabled: features.players !== false || esp?.showPlayers === true || (esp?.players ?? 0) > 0,
        mobsEnabled: features.mobs === true || esp?.showMobs === true || (esp?.mobs ?? 0) > 0,
        mapTilesEnabled: features.mapTiles !== false,
        syntheticEsp: esp ?? null,
      },
      loadedText: document.querySelector('#metric-loaded')?.textContent ?? '',
      resourcesText,
      gpuText,
      rendererSummary: resourceMatch
        ? {
          geometries: Number.parseInt(resourceMatch[1], 10),
          materials: Number.parseInt(resourceMatch[2], 10),
          textures: Number.parseInt(resourceMatch[3], 10),
        }
        : null,
      gpuSummary: gpuMatch
        ? {
          geometries: Number.parseInt(gpuMatch[1], 10),
          textures: Number.parseInt(gpuMatch[2], 10),
        }
        : null,
    };
  }, { centerX, centerZ, radius, features, esp: esp ?? null });
}

async function clearBrowserMeshCache(page) {
  await page.goto('/?world=default&chunkX=0&chunkZ=0&radius=0&auto=false&mapTiles=false');
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.open('synthworldview-cache', 1);
      request.onerror = () => resolve();
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('terrainMeshes')) {
          db.createObjectStore('terrainMeshes', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('terrainMeshes', 'readwrite');
        transaction.objectStore('terrainMeshes').clear();
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          resolve();
        };
      };
    });
  });
}

async function logPerfEvent(page, type, fields) {
  await page.request.post('/api/client-log', {
    data: {
      perfTelemetry: true,
      events: [{
        type,
        source: 'playwright-perf',
        ...fields,
      }],
    },
  }).catch(() => {});
}

async function appendHistory(result) {
  await fs.promises.mkdir(HISTORY_DIR, { recursive: true });
  await fs.promises.appendFile(HISTORY_FILE, `${JSON.stringify(result)}\n`, 'utf8');
}

function compareWithHistory(result) {
  const entries = readHistory()
    .filter((entry) => entry.kind === result.kind
      && entry.scenarioId === result.scenarioId
      && entry.mode === result.mode
      && entry.radius === result.radius
      && entry.routeSteps === result.routeSteps
      && entry.routeLength === result.routeLength
      && entry.flyChunks === result.flyChunks
      && entry.flyLegs === result.flyLegs)
    .slice(-20);
  if (entries.length < 3) {
    return {
      samples: entries.length,
      previousMedianMs: null,
      ratio: 1,
      isRegression: () => false,
    };
  }
  const previousMedianMs = median(entries.map((entry) => entry.totalMs));
  const ratio = previousMedianMs > 0 ? result.totalMs / previousMedianMs : 1;
  return {
    samples: entries.length,
    previousMedianMs,
    ratio,
    isRegression: (factor) => ratio > factor,
  };
}

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return fs.readFileSync(HISTORY_FILE, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function numberOr(value, fallback) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
