#!/usr/bin/env node
"use strict";

// Baseline load measurement: mesh generation and tile generation, measured in isolation,
// cold (server cache cleared) then warm (served from cache), while sampling server CPU/heap.
//
// Usage:
//   node tools/run-terrascape-baseline.js [--url http://host:5961] [--world default]
//                                         [--radius 8] [--concurrency 8] [--no-clear]
//
// Output: perf-history/baseline-<runId>.json

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    url: process.env.TERRASCAPE_URL || process.env.WORLDVIEW_URL || "http://127.0.0.1:5960",
    world: "default",
    radius: 8,
    concurrency: 8,
    clear: true,
    target: "combined",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") opts.url = argv[++i];
    else if (arg === "--world") opts.world = argv[++i];
    else if (arg === "--radius") opts.radius = Number(argv[++i]);
    else if (arg === "--concurrency") opts.concurrency = Number(argv[++i]);
    else if (arg === "--target") opts.target = argv[++i];
    else if (arg === "--no-clear") opts.clear = false;
  }
  opts.url = opts.url.replace(/\/+$/, "");
  return opts;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clearServerCache(target, kind) {
  try {
    execFileSync("node", ["tools/deploy.js", "--target", target, "rcon", "--", "terrascape", "clearcache", kind], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.warn(`! could not clear server cache (${error.message}); measuring without clear`);
    return false;
  }
}

// Polls /api/metrics until stopped; returns aggregated CPU/heap stats.
function startSampler(baseUrl, intervalMs = 200) {
  const samples = [];
  let running = true;
  const loop = (async () => {
    while (running) {
      try {
        const res = await fetch(`${baseUrl}/api/metrics`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) samples.push(await res.json());
      } catch {
        /* ignore transient sampling errors */
      }
      await sleep(intervalMs);
    }
  })();
  return {
    async stop() {
      running = false;
      await loop;
      return summarize(samples);
    },
  };
}

function summarize(samples) {
  const cpu = samples.map((s) => s.processCpuLoad).filter((v) => Number.isFinite(v) && v >= 0);
  const heap = samples.map((s) => s.heapUsedBytes).filter((v) => Number.isFinite(v) && v >= 0);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const max = (xs) => (xs.length ? Math.max(...xs) : null);
  return {
    samples: samples.length,
    cpuAvg: round(avg(cpu)),
    cpuPeak: round(max(cpu)),
    heapAvgMb: toMb(avg(heap)),
    heapPeakMb: toMb(max(heap)),
  };
}

const round = (v) => (v == null ? null : Math.round(v * 1000) / 1000);
const toMb = (v) => (v == null ? null : Math.round(v / (1024 * 1024)));

// Fetches all chunk meshes within the radius, returns timing + byte total.
async function driveMesh(baseUrl, world, radius, concurrency) {
  const chunks = [];
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) chunks.push([x, z]);
  }
  let bytes = 0;
  let failures = 0;
  let next = 0;
  const started = Date.now();
  async function worker() {
    while (next < chunks.length) {
      const [cx, cz] = chunks[next++];
      try {
        const res = await fetch(`${baseUrl}/api/terrain/${enc(world)}/${cx}/${cz}.glb`, {
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) bytes += (await res.arrayBuffer()).byteLength;
        else failures++;
      } catch {
        failures++;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { elapsedMs: Date.now() - started, requested: chunks.length, failures, bytes };
}

// Fetches the whole map region tile image for the radius, returns timing + byte total.
async function driveTiles(baseUrl, world, radius) {
  const started = Date.now();
  let bytes = 0;
  let failures = 0;
  try {
    const res = await fetch(`${baseUrl}/api/mapregion/${enc(world)}/0/0/${radius}.png`, {
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) bytes = (await res.arrayBuffer()).byteLength;
    else failures++;
  } catch {
    failures++;
  }
  return { elapsedMs: Date.now() - started, requested: 1, failures, bytes };
}

async function measure(opts, label, phase, drive) {
  if (phase === "cold" && opts.clear) clearServerCache(opts.target, label === "tile" ? "tiles" : "mesh");
  const sampler = startSampler(opts.url);
  const result = await drive();
  const server = await sampler.stop();
  const row = { target: label, phase, ...result, server };
  console.log(
    `  ${label}/${phase}: ${result.elapsedMs}ms · ${toMb(result.bytes)}MB · ${result.failures} fail · ` +
      `cpu peak ${pct(server.cpuPeak)} avg ${pct(server.cpuAvg)} · heap peak ${server.heapPeakMb}MB`,
  );
  return row;
}

const enc = (s) => encodeURIComponent(s);
const pct = (v) => (v == null ? "n/a" : `${Math.round(v * 100)}%`);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  console.log(`Terrascape baseline ${runId}`);
  console.log(`  url=${opts.url} world=${opts.world} radius=${opts.radius} concurrency=${opts.concurrency}`);

  const rows = [];
  // Mesh and tiles, each cold (generate) then warm (cached), in isolation.
  rows.push(await measure(opts, "mesh", "cold", () => driveMesh(opts.url, opts.world, opts.radius, opts.concurrency)));
  rows.push(await measure(opts, "mesh", "warm", () => driveMesh(opts.url, opts.world, opts.radius, opts.concurrency)));
  rows.push(await measure(opts, "tile", "cold", () => driveTiles(opts.url, opts.world, opts.radius)));
  rows.push(await measure(opts, "tile", "warm", () => driveTiles(opts.url, opts.world, opts.radius)));

  const reportDir = path.join(projectRoot, "perf-history");
  fs.mkdirSync(reportDir, { recursive: true });
  const outFile = path.join(reportDir, `baseline-${runId}.json`);
  fs.writeFileSync(
    outFile,
    `${JSON.stringify({ runId, settings: { radius: opts.radius, concurrency: opts.concurrency, allOptions: true }, url: opts.url, rows }, null, 2)}\n`,
  );
  console.log(`\nWrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
