#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const terrascapeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(terrascapeRoot, '..', '..');
const outputDir = path.join(terrascapeRoot, 'tools', 'mob-feed-samples');

const options = parseArgs(process.argv.slice(2));
const baseUrl = options.url ?? 'http://127.0.0.1:5960';
const save = options.save ?? 'synth-worldview-mvp';
const count = options.count ?? 5;
const intervalMs = options.intervalMs ?? 3000;
const restarts = options.restarts ?? 0;

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonlPath = path.join(outputDir, `${stamp}.jsonl`);
  console.log(`Writing ${slash(path.relative(repoRoot, jsonlPath))}`);

  for (let restartIndex = 0; restartIndex <= restarts; restartIndex += 1) {
    if (restartIndex > 0) {
      restartServer(save);
      await waitForWorlds(baseUrl);
    }
    for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
      const sample = await collectSample({ baseUrl, restartIndex, sampleIndex });
      fs.appendFileSync(jsonlPath, `${JSON.stringify(sample)}\n`, 'utf8');
      printSample(sample);
      if (sampleIndex + 1 < count) {
        await delay(intervalMs);
      }
    }
  }
}

async function collectSample({ baseUrl, restartIndex, sampleIndex }) {
  const [playersPayload, mobsPayload] = await Promise.all([
    fetchJson(`${baseUrl}/api/players/default`),
    fetchJson(`${baseUrl}/api/mobs/default`),
  ]);
  const mobs = mobsPayload.mobs ?? [];
  return {
    at: new Date().toISOString(),
    restartIndex,
    sampleIndex,
    players: playersPayload.players ?? [],
    count: mobs.length,
    sourceStats: mobsPayload.sourceStats ?? null,
    byType: summarize(mobs, 'type'),
    byCategory: summarize(mobs, 'category'),
    bySource: summarize(mobs, 'source'),
    nearest: nearestMobs(mobs, playersPayload.players ?? [], 20),
    mobs,
  };
}

function printSample(sample) {
  const player = sample.players[0];
  const where = player ? `${round(player.x)},${round(player.y)},${round(player.z)}` : 'no-player';
  console.log(
    `[${sample.restartIndex}.${sample.sampleIndex}] mobs=${sample.count} player=${where}`
      + ` types=${summaryText(sample.byType)}`
      + ` categories=${summaryText(sample.byCategory)}`
      + ` sources=${summaryText(sample.bySource)}`,
  );
}

function nearestMobs(mobs, players, max) {
  if (players.length === 0) return [];
  return mobs
    .map((mob) => ({
      id: mob.id,
      type: mob.type,
      category: mob.category,
      source: mob.source,
      x: mob.x,
      y: mob.y,
      z: mob.z,
      distance: Math.sqrt(Math.min(...players.map((player) => distanceSq(mob, player)))),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max)
    .map((mob) => ({ ...mob, distance: round(mob.distance) }));
}

function summarize(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = String(item[key] ?? 'unknown');
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function summaryText(summary) {
  return Object.entries(summary)
    .slice(0, 8)
    .map(([key, value]) => `${key}=${value}`)
    .join('|') || 'none';
}

function restartServer(saveName) {
  console.log(`Restarting ${saveName}`);
  runNodeTool('tools/server/stop-server.js', ['--save', saveName, '--timeout', '30000']);
  sleep(5000);
  const savePath = path.join(process.env.APPDATA ?? '', 'Hytale', 'UserData', 'Saves', saveName);
  runNodeTool('tools/server/start-server.js', ['--save', savePath, '--background']);
}

function runNodeTool(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit ${result.status}`);
  }
}

async function waitForWorlds(base) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const data = await fetchJson(`${base}/api/worlds`);
      if (data.ok) return;
    } catch {
      // Keep waiting.
    }
    await delay(2000);
  }
  throw new Error('Timed out waiting for /api/worlds');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => args[++index];
    if (arg === '--url') parsed.url = next();
    else if (arg === '--save') parsed.save = next();
    else if (arg === '--count') parsed.count = Number.parseInt(next(), 10);
    else if (arg === '--interval-ms') parsed.intervalMs = Number.parseInt(next(), 10);
    else if (arg === '--restarts') parsed.restarts = Number.parseInt(next(), 10);
    else if (arg === '--help') {
      console.log('Usage: node tools/sample-mob-feed.js [--count 5] [--interval-ms 3000] [--restarts 0]');
      process.exit(0);
    }
  }
  return parsed;
}

function distanceSq(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function slash(value) {
  return value.replace(/\\/g, '/');
}
