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

test.describe.configure({ timeout: 15 * 60_000 });

test('worldview mesh and map backdrop navigation performance', async ({ page }, testInfo) => {
  const runModes = MODE === 'both' ? ['wet', 'dry'] : [MODE];
  const results = [];
  let browserCacheWarmed = false;

  for (const mode of runModes) {
    if (mode === 'wet') {
      await clearBrowserMeshCache(page);
    }
    if (mode === 'dry' && !browserCacheWarmed) {
      await clearBrowserMeshCache(page);
      await runPerfRoute(page, 'dry-warmup');
      browserCacheWarmed = true;
    }
    const result = await runPerfRoute(page, mode);
    if (mode === 'wet') {
      browserCacheWarmed = true;
    }
    results.push(result);
    await appendHistory(result);
    const comparison = compareWithHistory(result);
    await logPerfEvent(page, 'perf_history_compare', {
      mode,
      totalMs: result.totalMs,
      previousMedianMs: comparison.previousMedianMs,
      ratio: comparison.ratio,
      samples: comparison.samples,
    });

    if (comparison.isRegression) {
      const message = `Worldview perf regression: ${mode} total ${result.totalMs}ms vs history median ${comparison.previousMedianMs}ms (${comparison.ratio.toFixed(2)}x)`;
      testInfo.annotations.push({ type: 'perf', description: message });
      if (ENFORCE) {
        expect(comparison.isRegression, message).toBe(false);
      }
    }
  }

  await testInfo.attach('worldview-perf-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
});

async function runPerfRoute(page, mode) {
  const centerX = numberOr(DEFAULT_CENTER_X, 0);
  const centerZ = numberOr(DEFAULT_CENTER_Z, 0);
  const radius = Math.max(0, numberOr(DEFAULT_RADIUS, 10));
  const steps = Math.max(1, numberOr(ROUTE_STEPS, 4));
  const route = buildRoute(centerX, centerZ, steps);
  const started = Date.now();
  const stepResults = [];

  await page.goto(`/?world=default&chunkX=${centerX}&chunkZ=${centerZ}&radius=${radius}&auto=false&players=true&mapTiles=true&water=solid`);
  await waitForReady(page, centerX, centerZ, radius);
  await logPerfEvent(page, 'perf_route_start', { mode, centerX, centerZ, radius, steps, route: route.length });

  for (const step of route) {
    const stepStarted = Date.now();
    await page.evaluate(({ x, z }) => {
      return window.__synthWorldviewDebug.loadGrid({ centerX: x, centerZ: z });
    }, { x: step.x, z: step.z });
    await waitForReady(page, step.x, step.z, radius);
    await page.waitForTimeout(250);
    const stats = await collectStats(page, step.x, step.z, radius);
    stepResults.push({
      label: step.label,
      centerX: step.x,
      centerZ: step.z,
      ms: Date.now() - stepStarted,
      ...stats,
    });
  }

  const result = {
    kind: 'worldview-perf',
    timestamp: new Date().toISOString(),
    mode,
    baseURL: process.env.WORLDVIEW_URL ?? 'http://127.0.0.1:5960',
    centerX,
    centerZ,
    radius,
    routeSteps: steps,
    routeLength: route.length,
    totalMs: Date.now() - started,
    maxStepMs: Math.max(...stepResults.map((step) => step.ms)),
    averageStepMs: Math.round(stepResults.reduce((sum, step) => sum + step.ms, 0) / stepResults.length),
    minFps: Math.min(...stepResults.map((step) => step.fps).filter(Number.isFinite)),
    maxFrameMs: Math.max(...stepResults.map((step) => step.frameMs).filter(Number.isFinite)),
    finalLoadedChunks: stepResults.at(-1)?.loadedChunks ?? 0,
    finalMapBackdrop: stepResults.at(-1)?.mapBackdrop ?? null,
    stepResults,
  };
  await logPerfEvent(page, 'perf_route_end', {
    mode,
    totalMs: result.totalMs,
    averageStepMs: result.averageStepMs,
    maxStepMs: result.maxStepMs,
    minFps: result.minFps,
    routeLength: route.length,
  });
  return result;
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

async function waitForReady(page, centerX, centerZ, radius) {
  const expectedChunks = (radius * 2 + 1) ** 2;
  await expect(page.locator('#status')).toHaveText(`Loaded ${expectedChunks} chunks around ${centerX}, ${centerZ}`, {
    timeout: 120_000,
  });
  await expect.poll(async () => page.evaluate(() => window.__synthWorldviewDebug.loadedChunks.size), {
    timeout: 30_000,
  }).toBe(expectedChunks);
  await expect.poll(async () => page.evaluate(() => window.__synthWorldviewDebug.mapBackdropStats().loaded), {
    timeout: 60_000,
  }).toBe(1);
}

async function collectStats(page, centerX, centerZ, radius) {
  return await page.evaluate(({ centerX, centerZ, radius }) => {
    const debug = window.__synthWorldviewDebug;
    const mapBackdrop = debug.mapBackdropStats();
    const counter = debug.fpsCounter;
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
      loadedText: document.querySelector('#metric-loaded')?.textContent ?? '',
      resourcesText: document.querySelector('#metric-resources')?.textContent ?? '',
      gpuText: document.querySelector('#metric-gpu')?.textContent ?? '',
    };
  }, { centerX, centerZ, radius });
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
      && entry.mode === result.mode
      && entry.radius === result.radius
      && entry.routeSteps === result.routeSteps
      && entry.routeLength === result.routeLength)
    .slice(-20);
  if (entries.length < 3) {
    return { samples: entries.length, previousMedianMs: null, ratio: 1, isRegression: false };
  }
  const previousMedianMs = median(entries.map((entry) => entry.totalMs));
  const ratio = previousMedianMs > 0 ? result.totalMs / previousMedianMs : 1;
  return {
    samples: entries.length,
    previousMedianMs,
    ratio,
    isRegression: ratio > REGRESSION_FACTOR,
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
  return Number.isFinite(value) ? value : fallback;
}
