#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.url ?? 'http://127.0.0.1:5960';
const world = args.world ?? 'default';
const centerX = numberArg(args.x ?? args.chunkX, 0);
const centerZ = numberArg(args.z ?? args.chunkZ, 0);
const radius = numberArg(args.radius, 1);
const concurrency = Math.max(1, numberArg(args.concurrency, 4));

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});

async function main() {
  const requests = grid(centerX, centerZ, radius);
  const started = performance.now();
  const results = [];
  let cursor = 0;

  console.log('SynthTerrascape terrain grid scale test');
  console.log(`  url        : ${baseUrl}`);
  console.log(`  world      : ${world}`);
  console.log(`  center     : ${centerX}, ${centerZ}`);
  console.log(`  radius     : ${radius} (${requests.length} chunks)`);
  console.log(`  concurrency: ${concurrency}`);
  console.log('');

  await Promise.all(Array.from({ length: Math.min(concurrency, requests.length) }, async () => {
    while (cursor < requests.length) {
      const request = requests[cursor++];
      const result = await fetchChunk(request.chunkX, request.chunkZ);
      results.push(result);
      const marker = result.ok ? 'ok ' : 'ERR';
      console.log(`${marker} ${request.chunkX},${request.chunkZ} ${result.status} ${result.bytes}b ${result.ms.toFixed(0)}ms`);
    }
  }));

  const elapsed = performance.now() - started;
  const ok = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const bytes = sum(ok, (result) => result.bytes);
  const vertices = sum(ok, (result) => result.vertices);
  const triangles = sum(ok, (result) => result.triangles);
  const timings = ok.map((result) => result.ms).sort((a, b) => a - b);

  console.log('');
  console.log('Summary');
  console.log(`  ok / failed: ${ok.length} / ${failed.length}`);
  console.log(`  elapsed    : ${elapsed.toFixed(0)}ms`);
  console.log(`  bytes      : ${bytes}`);
  console.log(`  vertices   : ${vertices}`);
  console.log(`  triangles  : ${triangles}`);
  if (timings.length > 0) {
    console.log(`  min/median/max ms: ${timings[0].toFixed(0)} / ${percentile(timings, 0.5).toFixed(0)} / ${timings[timings.length - 1].toFixed(0)}`);
  }
  const jsonOut = args['json-out'] ?? args.jsonOut;
  if (jsonOut) {
    const report = {
      kind: 'terrascape-mesh-probe',
      timestamp: new Date().toISOString(),
      url: baseUrl,
      world,
      centerX,
      centerZ,
      radius,
      concurrency,
      total: requests.length,
      ok: ok.length,
      failed: failed.length,
      elapsedMs: Math.round(elapsed),
      bytes,
      vertices,
      triangles,
      minMs: timings.length > 0 ? Math.round(timings[0]) : 0,
      medianMs: timings.length > 0 ? Math.round(percentile(timings, 0.5)) : 0,
      maxMs: timings.length > 0 ? Math.round(timings[timings.length - 1]) : 0,
      chunks: ok.map((result) => ({
        chunkX: result.chunkX,
        chunkZ: result.chunkZ,
        bytes: result.bytes,
        vertices: result.vertices,
        triangles: result.triangles,
        ms: Math.round(result.ms),
      })),
      failures: failed.map((result) => ({
        chunkX: result.chunkX,
        chunkZ: result.chunkZ,
        status: result.status,
        ms: Math.round(result.ms),
      })),
    };
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonOut), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function grid(cx, cz, r) {
  const out = [];
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      out.push({ chunkX: cx + dx, chunkZ: cz + dz, distance: Math.abs(dx) + Math.abs(dz) });
    }
  }
  return out.sort((a, b) => a.distance - b.distance || a.chunkZ - b.chunkZ || a.chunkX - b.chunkX);
}

function fetchChunk(chunkX, chunkZ) {
  const path = `/api/terrain/${encodeURIComponent(world)}/${chunkX}/${chunkZ}.glb`;
  const url = new URL(path, baseUrl);
  const started = performance.now();

  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
      });
      res.on('end', () => {
        resolve({
          chunkX,
          chunkZ,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          bytes,
          vertices: numberHeader(res.headers['x-terrascape-vertices']),
          triangles: numberHeader(res.headers['x-terrascape-triangles']),
          ms: performance.now() - started,
        });
      });
    });
    req.on('error', (error) => {
      resolve({
        chunkX,
        chunkZ,
        status: 'ERR',
        ok: false,
        bytes: 0,
        vertices: 0,
        triangles: 0,
        ms: performance.now() - started,
        error,
      });
    });
    req.setTimeout(30000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function parseArgs(values) {
  const parsed = {};
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = values[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i++;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function numberArg(value, fallback) {
  if (value === undefined || value === true) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numberHeader(value) {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(first ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values, selector) {
  return values.reduce((total, value) => total + selector(value), 0);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[index];
}
