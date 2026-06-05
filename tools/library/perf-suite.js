const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'perf-suite-config.json');

function loadPerfSuiteConfig(configPath = DEFAULT_CONFIG_PATH) {
  const resolved = path.resolve(configPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.scenarios) || config.scenarios.length === 0) {
    throw new Error(`Perf suite config has no scenarios: ${resolved}`);
  }
  return { config, configPath: resolved };
}

function resolveScenario(config, scenario) {
  const defaults = config.defaults ?? {};
  return {
    id: scenario.id,
    label: scenario.label ?? scenario.id,
    centerX: numberOr(scenario.centerX, defaults.centerX, 0),
    centerZ: numberOr(scenario.centerZ, defaults.centerZ, 0),
    radius: Math.max(0, numberOr(scenario.radius, defaults.radius, 10)),
    steps: Math.max(1, numberOr(scenario.steps, defaults.steps, 4)),
    modes: Array.isArray(scenario.modes) && scenario.modes.length > 0
      ? scenario.modes
      : (defaults.modes ?? ['wet', 'dry']),
    regressionFactor: numberOr(scenario.regressionFactor, defaults.regressionFactor, 1.5),
    stepSettleMs: Math.max(0, numberOr(scenario.stepSettleMs, defaults.stepSettleMs, 250)),
    world: scenario.world ?? defaults.world ?? 'default',
    features: {
      mapTiles: featureBool(scenario.features?.mapTiles, true),
      players: featureBool(scenario.features?.players, true),
      mobs: featureBool(scenario.features?.mobs, false),
      water: scenario.features?.water ?? 'solid',
      auto: featureBool(scenario.features?.auto, false),
    },
    esp: scenario.esp ?? null,
    thresholds: scenario.thresholds ?? {},
  };
}

function buildScenariosPayload(config) {
  return config.scenarios.map((scenario) => resolveScenario(config, scenario));
}

function thresholdFor(config, category, scenarioId, fallback) {
  const table = config.thresholds?.[category] ?? {};
  if (Number.isFinite(table[scenarioId])) return table[scenarioId];
  if (Number.isFinite(table.default)) return table.default;
  return fallback;
}

function runMeshProbe(projectRoot, options = {}) {
  const script = path.join(projectRoot, 'tools', 'generate-grid.js');
  const args = [
    script,
    '--radius', String(options.radius ?? 3),
    '--x', String(options.centerX ?? 0),
    '--z', String(options.centerZ ?? 0),
    '--concurrency', String(options.concurrency ?? 8),
    '--world', options.world ?? 'default',
    '--json-out', options.jsonOut,
  ];
  if (options.url) {
    args.push('--url', options.url);
  }
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Mesh probe failed (${result.status}): ${detail || 'unknown error'}`);
  }
  if (!options.jsonOut || !fs.existsSync(options.jsonOut)) {
    throw new Error('Mesh probe did not write JSON output');
  }
  return JSON.parse(fs.readFileSync(options.jsonOut, 'utf8'));
}

function readReportFile(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) return null;
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function compareRuns(runA, runB) {
  const byKey = (run) => {
    const map = new Map();
    for (const result of run.results ?? []) {
      map.set(`${result.scenarioId}:${result.mode}`, result);
    }
    return map;
  };
  const a = byKey(runA);
  const b = byKey(runB);
  const comparisons = [];
  for (const [key, left] of a.entries()) {
    const right = b.get(key);
    if (!right) continue;
    comparisons.push({
      key,
      scenarioId: left.scenarioId,
      mode: left.mode,
      run1TotalMs: left.totalMs,
      run2TotalMs: right.totalMs,
      deltaMs: right.totalMs - left.totalMs,
      ratio: left.totalMs > 0 ? right.totalMs / left.totalMs : 1,
      run1MinFps: left.minFps,
      run2MinFps: right.minFps,
      run1MapBackdropMs: left.finalMapBackdrop?.loadMs ?? null,
      run2MapBackdropMs: right.finalMapBackdrop?.loadMs ?? null,
      run1EspPlayers: left.entityOverlay?.players ?? null,
      run1EspMobs: left.entityOverlay?.mobs ?? null,
    });
  }
  return comparisons;
}

function analyzeRun(run, config) {
  const findings = [];
  for (const result of run.results ?? []) {
    const scenarioId = result.scenarioId ?? 'unknown';
    const totalLimit = thresholdFor(config, 'totalMs', scenarioId, null);
    const fpsLimit = thresholdFor(
      config,
      'minFps',
      scenarioId,
      thresholdFor(config, 'minFps', 'default', null),
    );
    const mapLimit = thresholdFor(
      config,
      'mapBackdropLoadMs',
      scenarioId,
      thresholdFor(config, 'mapBackdropLoadMs', 'default', null),
    );
    const stepLimit = thresholdFor(config, 'maxStepMs', scenarioId, thresholdFor(config, 'maxStepMs', 'default', null));

    if (Number.isFinite(totalLimit) && result.totalMs > totalLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'total',
        message: `total ${result.totalMs}ms exceeds threshold ${totalLimit}ms`,
      });
    }
    if (Number.isFinite(fpsLimit) && Number.isFinite(result.minFps) && result.minFps < fpsLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'esp-client',
        message: `min FPS ${result.minFps} below threshold ${fpsLimit}`,
      });
    }
    if (Number.isFinite(mapLimit) && result.finalMapBackdrop?.loadMs > mapLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'image-gen',
        message: `map backdrop ${result.finalMapBackdrop.loadMs}ms exceeds threshold ${mapLimit}ms`,
      });
    }
    if (Number.isFinite(stepLimit) && result.maxStepMs > stepLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'mesh-gen',
        message: `slowest step ${result.maxStepMs}ms exceeds threshold ${stepLimit}ms`,
      });
    }

    const slowSteps = (result.stepResults ?? []).filter((step) => step.ms > (stepLimit ?? 60000));
    for (const step of slowSteps) {
      findings.push({
        severity: 'info',
        scenarioId,
        mode: result.mode,
        area: 'mesh-gen',
        message: `step ${step.label} took ${step.ms}ms (chunks=${step.loadedChunks}, mapMs=${step.mapBackdrop?.loadMs ?? 0})`,
      });
    }

    if (result.features?.mapTiles === false && result.finalMapBackdrop?.loaded) {
      findings.push({
        severity: 'info',
        scenarioId,
        mode: result.mode,
        area: 'feature-seam',
        message: 'map tiles disabled but backdrop still loaded — check toggle seam',
      });
    }
    if (result.features?.mapTiles === true && !result.finalMapBackdrop?.loaded) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'image-gen',
        message: 'map tiles enabled but backdrop never loaded',
      });
    }
  }

  if (run.meshProbe?.failed > 0) {
    findings.push({
      severity: 'warn',
      area: 'mesh-gen',
      message: `server mesh probe: ${run.meshProbe.failed} failed chunk fetches`,
    });
  }

  return findings;
}

function printRunSummary(run, config) {
  console.log('');
  console.log(`=== Worldview perf run ${run.runId ?? '?'} ===`);
  console.log(`  baseURL : ${run.baseURL ?? 'unknown'}`);
  console.log(`  started : ${run.startedAt ?? 'unknown'}`);
  if (run.meshProbe) {
    const probe = run.meshProbe;
    console.log(`  mesh probe: ${probe.ok}/${probe.total} ok, median ${probe.medianMs}ms, ${probe.bytes} bytes`);
  }
  for (const result of run.results ?? []) {
    const flags = [
      result.features?.mapTiles ? 'map' : 'no-map',
      result.features?.players ? 'players' : 'no-players',
      result.features?.mobs ? 'mobs' : 'no-mobs',
    ].join(', ');
    console.log(`  [${result.scenarioId}/${result.mode}] total=${result.totalMs}ms avgStep=${result.averageStepMs}ms minFps=${result.minFps} (${flags})`);
    if (result.finalMapBackdrop?.loadMs) {
      console.log(`    map backdrop: ${result.finalMapBackdrop.loadMs}ms ${result.finalMapBackdrop.bytes}b ${result.finalMapBackdrop.textureSize}`);
    }
    if (result.entityOverlay) {
      console.log(`    ESP: players=${result.entityOverlay.players} mobs=${result.entityOverlay.mobs} tiles=${result.entityOverlay.playerTiles}`);
    }
  }

  const findings = analyzeRun(run, config);
  if (findings.length > 0) {
    console.log('  findings:');
    for (const finding of findings) {
      const prefix = finding.scenarioId ? `${finding.scenarioId}/${finding.mode ?? '-'}` : finding.area;
      console.log(`    - [${finding.severity}] ${prefix}: ${finding.message}`);
    }
  }
}

function printRunComparison(comparisons) {
  if (comparisons.length === 0) return;
  console.log('');
  console.log('=== Run 1 vs Run 2 comparison ===');
  for (const row of comparisons) {
    const direction = row.deltaMs > 0 ? 'slower' : 'faster';
    console.log(`  ${row.key}: run1=${row.run1TotalMs}ms run2=${row.run2TotalMs}ms (${direction} ${Math.abs(row.deltaMs)}ms, ${row.ratio.toFixed(2)}x)`);
    if (row.run1MapBackdropMs != null || row.run2MapBackdropMs != null) {
      console.log(`    map: ${row.run1MapBackdropMs ?? '-'}ms -> ${row.run2MapBackdropMs ?? '-'}ms`);
    }
    if (row.run1MinFps != null || row.run2MinFps != null) {
      console.log(`    minFps: ${row.run1MinFps ?? '-'} -> ${row.run2MinFps ?? '-'}`);
    }
  }

  const regressions = comparisons.filter((row) => row.ratio > 1.25);
  const improvements = comparisons.filter((row) => row.ratio < 0.85);
  if (regressions.length > 0) {
    console.log('  patterns (run2 slower than run1):');
    for (const row of regressions) {
      console.log(`    - ${row.key}: +${row.deltaMs}ms (${row.ratio.toFixed(2)}x) — likely warm server/browser cache benefit in run1 or contention in run2`);
    }
  }
  if (improvements.length > 0) {
    console.log('  patterns (run2 faster than run1):');
    for (const row of improvements) {
      console.log(`    - ${row.key}: ${row.deltaMs}ms (${row.ratio.toFixed(2)}x) — warm caches helping run2`);
    }
  }
}

function featureBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function numberOr(...values) {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  loadPerfSuiteConfig,
  resolveScenario,
  buildScenariosPayload,
  thresholdFor,
  runMeshProbe,
  readReportFile,
  compareRuns,
  analyzeRun,
  printRunSummary,
  printRunComparison,
};
