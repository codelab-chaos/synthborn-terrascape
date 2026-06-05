const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const HISTORY_DIR = path.join(__dirname, '..', 'perf-history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'worldview-perf-history.jsonl');
const DEFAULT_CENTER_X = Number.parseInt(process.env.WORLDVIEW_PERF_CENTER_X ?? '0', 10);
const DEFAULT_CENTER_Z = Number.parseInt(process.env.WORLDVIEW_PERF_CENTER_Z ?? '0', 10);
const DEFAULT_RADIUS = Number.parseInt(process.env.WORLDVIEW_PERF_RADIUS ?? '10', 10);
const ROUTE_STEPS = Number.parseInt(process.env.WORLDVIEW_PERF_STEPS ?? '4', 10);
const MODE = process.env.WORLDVIEW_PERF_MODE ?? 'both';
const ENFORCE = process.env.WORLDVIEW_PERF_ENFORCE === '1';
const REGRESSION_FACTOR = Number.parseFloat(process.env.WORLDVIEW_PERF_REGRESSION_FACTOR ?? '1.5');
const RUN_ID = process.env.WORLDVIEW_PERF_RUN_ID ?? 'single';
const REPORT_FILE = process.env.WORLDVIEW_PERF_REPORT_FILE ?? '';
const SUITE_SCENARIOS = parseScenarioPayload(process.env.WORLDVIEW_PERF_SCENARIOS);

test.describe.configure({ timeout: 45 * 60_000 });

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
  const steps = Math.max(1, numberOr(scenario.steps, 4));
  const stepSettleMs = Math.max(0, numberOr(scenario.stepSettleMs, 250));
  const world = scenario.world ?? 'default';
  const features = scenario.features ?? {};
  const route = buildRoute(centerX, centerZ, steps);
  const started = Date.now();
  const stepResults = [];

  await page.goto(buildPerfUrl({
    world,
    centerX,
    centerZ,
    radius,
    features,
  }));
  await waitForReady(page, { centerX, centerZ, radius, features });
  await logPerfEvent(page, 'perf_route_start', {
    scenarioId: scenario.id,
    mode,
    centerX,
    centerZ,
    radius,
    steps,
    route: route.length,
    features,
  });

  for (const step of route) {
    const stepStarted = Date.now();
    await page.evaluate(({ x, z }) => {
      return window.__synthWorldviewDebug.loadGrid({ centerX: x, centerZ: z });
    }, { x: step.x, z: step.z });
    await waitForReady(page, { centerX: step.x, centerZ: step.z, radius, features });
    if (scenario.esp) {
      await injectEspLoad(page, scenario.esp, step.x, step.z);
    }
    if (stepSettleMs > 0) {
      await page.waitForTimeout(stepSettleMs);
    }
    const stats = await collectStats(page, step.x, step.z, radius, features, scenario.esp);
    stepResults.push({
      label: step.label,
      centerX: step.x,
      centerZ: step.z,
      ms: Date.now() - stepStarted,
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
    features,
    esp: scenario.esp ?? null,
    totalMs: Date.now() - started,
    maxStepMs: Math.max(...stepResults.map((step) => step.ms)),
    averageStepMs: Math.round(stepResults.reduce((sum, step) => sum + step.ms, 0) / stepResults.length),
    minFps: Math.min(...stepResults.map((step) => step.fps).filter(Number.isFinite)),
    maxFrameMs: Math.max(...stepResults.map((step) => step.frameMs).filter(Number.isFinite)),
    finalLoadedChunks: stepResults.at(-1)?.loadedChunks ?? 0,
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
    water: features.water ?? 'solid',
  });
  return `/?${params.toString()}`;
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
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (showMobs) {
      const input = document.querySelector('#show-mobs');
      if (input) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (players.length > 0) {
      window.__synthWorldviewDebug.updatePlayersForTest(players);
    }
    if (mobs.length > 0) {
      window.__synthWorldviewDebug.updateMobsForTest(mobs);
    }
  }, {
    players,
    mobs,
    showPlayers: esp.showPlayers === true || playerCount > 0,
    showMobs: esp.showMobs === true || mobCount > 0,
  });
  await page.waitForTimeout(400);
}

function buildRoute(centerX, centerZ, steps) {
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

async function waitForReady(page, { centerX, centerZ, radius, features }) {
  const expectedChunks = (radius * 2 + 1) ** 2;
  await expect(page.locator('#status')).toHaveText(`Loaded ${expectedChunks} chunks around ${centerX}, ${centerZ}`, {
    timeout: 180_000,
  });
  await expect.poll(async () => page.evaluate(() => window.__synthWorldviewDebug.loadedChunks.size), {
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
    const rendererMatch = resourcesText.match(/(\d+)\s+geometries,\s*(\d+)\s+textures,\s*([\d.]+)\s+MB/i);
    return {
      centerX,
      centerZ,
      radius,
      loadedChunks: debug.loadedChunks.size,
      activeCenterId: debug.activeCenterId(),
      requestedCenterId: debug.requestedCenterId(),
      fps: Math.round(counter?.fps ?? 0),
      frameMs: Math.round((counter?.frameMs ?? 0) * 10) / 10,
      mapBackdrop,
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
      rendererSummary: rendererMatch
        ? {
          geometries: Number.parseInt(rendererMatch[1], 10),
          textures: Number.parseInt(rendererMatch[2], 10),
          memoryMb: Number.parseFloat(rendererMatch[3]),
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
      && entry.routeLength === result.routeLength)
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
