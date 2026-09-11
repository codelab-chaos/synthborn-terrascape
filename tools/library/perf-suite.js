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

function resolveFeatureSet(scenario, defaults) {
  const featureDefaults = defaults.features ?? {};
  const features = scenario.features ?? {};
  return {
    mapTiles: featureBool(features.mapTiles, featureBool(featureDefaults.mapTiles, true)),
    mapTileRadius: features.mapTileRadius ?? featureDefaults.mapTileRadius,
    players: featureBool(features.players, featureBool(featureDefaults.players, true)),
    mobs: featureBool(features.mobs, featureBool(featureDefaults.mobs, false)),
    sun: featureBool(features.sun, featureBool(featureDefaults.sun, true)),
    shade: featureBool(features.shade, featureBool(featureDefaults.shade, true)),
    syncTime: featureBool(features.syncTime, featureBool(featureDefaults.syncTime, false)),
    bounds: featureBool(features.bounds, featureBool(featureDefaults.bounds, false)),
    water: features.water ?? featureDefaults.water ?? 'solid',
    shader: features.shader ?? featureDefaults.shader ?? 'none',
    auto: featureBool(features.auto, featureBool(featureDefaults.auto, false)),
  };
}

function resolveScenario(config, scenario) {
  const defaults = config.defaults ?? {};
  return {
    id: scenario.id,
    label: scenario.label ?? scenario.id,
    centerX: numberOr(scenario.centerX, defaults.centerX, 0),
    centerZ: numberOr(scenario.centerZ, defaults.centerZ, 0),
    radius: Math.max(0, numberOr(scenario.radius, defaults.radius, 10)),
    steps: Math.max(0, numberOr(scenario.steps, defaults.steps, 4)),
    modes: Array.isArray(scenario.modes) && scenario.modes.length > 0
      ? scenario.modes
      : (defaults.modes ?? ['wet', 'dry']),
    regressionFactor: numberOr(scenario.regressionFactor, defaults.regressionFactor, 1.5),
    stepSettleMs: Math.max(0, numberOr(scenario.stepSettleMs, defaults.stepSettleMs, 250)),
    flyChunks: Math.max(1, numberOr(scenario.flyChunks, defaults.flyChunks, 6)),
    flyLegs: scenario.flyLegs !== false && defaults.flyLegs !== false,
    flySprint: scenario.flySprint === true || defaults.flySprint === true,
    flySampleMs: Math.max(50, numberOr(scenario.flySampleMs, defaults.flySampleMs, 100)),
    flyDirections: scenario.flyDirections ?? defaults.flyDirections ?? 'all',
    world: scenario.world ?? defaults.world ?? 'default',
    features: resolveFeatureSet(scenario, defaults),
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
      run1MinFpsDuringFly: left.minFpsDuringFly ?? null,
      run2MinFpsDuringFly: right.minFpsDuringFly ?? null,
      run1TotalFlyMs: left.totalFlyMs ?? null,
      run2TotalFlyMs: right.totalFlyMs ?? null,
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
    const flyFpsLimit = thresholdFor(
      config,
      'minFpsDuringFly',
      scenarioId,
      thresholdFor(config, 'minFpsDuringFly', 'default', null),
    );
    if (Number.isFinite(flyFpsLimit) && Number.isFinite(result.minFpsDuringFly) && result.minFpsDuringFly < flyFpsLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'movement',
        message: `min FPS during fly ${result.minFpsDuringFly} below threshold ${flyFpsLimit}`,
      });
    }
    const p95FrameLimit = thresholdFor(
      config,
      'p95FrameMsDuringFly',
      scenarioId,
      thresholdFor(config, 'p95FrameMsDuringFly', 'default', null),
    );
    if (Number.isFinite(p95FrameLimit) && Number.isFinite(result.p95FrameMsDuringFly) && result.p95FrameMsDuringFly > p95FrameLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'movement',
        message: `p95 frame time during fly ${result.p95FrameMsDuringFly}ms exceeds threshold ${p95FrameLimit}ms`,
      });
    }
    const hitchCountLimit = thresholdFor(
      config,
      'hitchCount50DuringFly',
      scenarioId,
      thresholdFor(config, 'hitchCount50DuringFly', 'default', null),
    );
    if (Number.isFinite(hitchCountLimit) && Number.isFinite(result.hitchCount50DuringFly) && result.hitchCount50DuringFly > hitchCountLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'movement',
        message: `hitch count (>50ms) during fly ${result.hitchCount50DuringFly} exceeds threshold ${hitchCountLimit}`,
      });
    }
    const longestHitchLimit = thresholdFor(
      config,
      'longestHitchMsDuringFly',
      scenarioId,
      thresholdFor(config, 'longestHitchMsDuringFly', 'default', null),
    );
    if (Number.isFinite(longestHitchLimit) && Number.isFinite(result.longestHitchMsDuringFly) && result.longestHitchMsDuringFly > longestHitchLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'movement',
        message: `longest hitch during fly ${result.longestHitchMsDuringFly}ms exceeds threshold ${longestHitchLimit}ms`,
      });
    }
    const gridLoadLimit = thresholdFor(
      config,
      'gridLoadMs',
      scenarioId,
      thresholdFor(config, 'gridLoadMs', 'default', null),
    );
    if (Number.isFinite(gridLoadLimit) && Number.isFinite(result.maxGridLoadMs) && result.maxGridLoadMs > gridLoadLimit) {
      findings.push({
        severity: 'warn',
        scenarioId,
        mode: result.mode,
        area: 'mesh-gen',
        message: `slowest grid load during fly ${result.maxGridLoadMs}ms exceeds threshold ${gridLoadLimit}ms`,
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
  console.log(`=== Terrascape perf run ${run.runId ?? '?'} ===`);
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
    const flyLegCount = result.flyDirectionCount ?? 4;
    const flyTag = result.flyLegs
      ? ` fly=${result.flyChunks}ch×${flyLegCount} totalFly=${result.totalFlyMs ?? 0}ms minFpsFly=${result.minFpsDuringFly ?? '-'} p95=${result.p95FrameMsDuringFly ?? '-'}ms hitches=${result.hitchCount50DuringFly ?? '-'} gridLoad=${result.maxGridLoadMs ?? '-'}ms`
      : '';
    console.log(`  [${result.scenarioId}/${result.mode}] total=${result.totalMs}ms avgStep=${result.averageStepMs}ms hudMinFps=${result.minFps}${flyTag} (${flags})`);
    for (const step of result.stepResults ?? []) {
      const frames = step.stationaryFrames;
      if (frames) {
        console.log(`    stationary: ${frames.averageFps.toFixed(1)} FPS, p95=${frames.p95FrameMs.toFixed(1)}ms, longest=${frames.longestFrameMs.toFixed(1)}ms, hitches>50ms=${frames.hitchesOver50Ms}, frames=${frames.frames}`);
      }
    }
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

function resultByScenario(run, scenarioId, mode = 'dry') {
  return (run.results ?? []).find((result) => result.scenarioId === scenarioId && result.mode === mode) ?? null;
}

function featureCostRow(baseline, result, label) {
  if (!baseline || !result) return null;
  const deltaMs = result.totalMs - baseline.totalMs;
  const deltaFlyMs = (result.totalFlyMs ?? 0) - (baseline.totalFlyMs ?? 0);
  const fpsDelta = Number.isFinite(result.minFpsDuringFly) && Number.isFinite(baseline.minFpsDuringFly)
    ? result.minFpsDuringFly - baseline.minFpsDuringFly
    : null;
  const mapMs = result.finalMapBackdrop?.loadMs ?? 0;
  return {
    label,
    scenarioId: result.scenarioId,
    totalMs: result.totalMs,
    totalFlyMs: result.totalFlyMs ?? null,
    minFpsDuringFly: result.minFpsDuringFly ?? null,
    mapBackdropLoadMs: result.finalMapBackdrop?.loadMs ?? null,
    deltaTotalMs: deltaMs,
    deltaTotalPct: baseline.totalMs > 0 ? Math.round((deltaMs / baseline.totalMs) * 1000) / 10 : null,
    deltaFlyMs,
    deltaMinFpsDuringFly: fpsDelta,
  };
}

function analyzeFeatureIsolation(run, config) {
  const isolation = config.featureIsolation ?? {};
  const baselineId = isolation.baselineId ?? 'minimum';
  const referenceId = isolation.referenceId ?? 'full-default';
  const mode = isolation.mode ?? 'dry';
  const baseline = resultByScenario(run, baselineId, mode);
  const reference = resultByScenario(run, referenceId, mode);
  if (!baseline) {
    throw new Error(`Feature isolation baseline scenario not found: ${baselineId}/${mode}`);
  }

  const additions = [];
  const removals = [];
  for (const scenario of config.scenarios ?? []) {
    const result = resultByScenario(run, scenario.id, mode);
    if (!result || result.scenarioId === baselineId) continue;
    const row = featureCostRow(baseline, result, scenario.label ?? scenario.id);
    if (!row) continue;
    if (scenario.id.startsWith('plus-')) {
      additions.push(row);
    } else if (scenario.id.startsWith('full-no-') && reference) {
      removals.push({
        ...featureCostRow(reference, result, scenario.label ?? scenario.id),
        savingsVsFullMs: reference.totalMs - result.totalMs,
        savingsVsFullPct: reference.totalMs > 0
          ? Math.round(((reference.totalMs - result.totalMs) / reference.totalMs) * 1000) / 10
          : null,
      });
    } else if (scenario.id === referenceId) {
      additions.push({
        ...row,
        label: `${scenario.label ?? scenario.id} (reference stack)`,
      });
    }
  }

  additions.sort((a, b) => (b.deltaTotalMs ?? 0) - (a.deltaTotalMs ?? 0));
  removals.sort((a, b) => (b.savingsVsFullMs ?? 0) - (a.savingsVsFullMs ?? 0));

  return {
    kind: 'terrascape-feature-isolation',
    timestamp: new Date().toISOString(),
    runId: run.runId,
    mode,
    baseline: {
      scenarioId: baseline.scenarioId,
      totalMs: baseline.totalMs,
      totalFlyMs: baseline.totalFlyMs ?? null,
      minFpsDuringFly: baseline.minFpsDuringFly ?? null,
    },
    reference: reference
      ? {
        scenarioId: reference.scenarioId,
        totalMs: reference.totalMs,
        totalFlyMs: reference.totalFlyMs ?? null,
        minFpsDuringFly: reference.minFpsDuringFly ?? null,
      }
      : null,
    additions,
    removals,
  };
}

function printFeatureIsolation(analysis) {
  console.log('');
  console.log('=== Feature isolation savings ===');
  console.log(`  baseline (${analysis.baseline.scenarioId}): ${analysis.baseline.totalMs}ms fly=${analysis.baseline.totalFlyMs ?? '-'}ms minFpsFly=${analysis.baseline.minFpsDuringFly ?? '-'}`);
  if (analysis.reference) {
    console.log(`  reference (${analysis.reference.scenarioId}): ${analysis.reference.totalMs}ms fly=${analysis.reference.totalFlyMs ?? '-'}ms minFpsFly=${analysis.reference.minFpsDuringFly ?? '-'}`);
  }
  if (analysis.additions.length > 0) {
    console.log('  cost to enable (vs minimum):');
    for (const row of analysis.additions) {
      const pct = Number.isFinite(row.deltaTotalPct) ? ` (+${row.deltaTotalPct}%)` : '';
      const map = row.mapBackdropLoadMs > 0 ? ` map=${row.mapBackdropLoadMs}ms` : '';
      console.log(`    - ${row.label}: +${row.deltaTotalMs}ms${pct} fly+${row.deltaFlyMs}ms minFpsFly=${row.minFpsDuringFly ?? '-'}${map}`);
    }
  }
  if (analysis.removals.length > 0) {
    console.log('  savings when disabled (vs full default):');
    for (const row of analysis.removals) {
      if ((row.savingsVsFullMs ?? 0) > 0) {
        const pct = Number.isFinite(row.savingsVsFullPct) ? ` (−${row.savingsVsFullPct}%)` : '';
        console.log(`    - ${row.label}: saves ${row.savingsVsFullMs}ms${pct} → ${row.totalMs}ms`);
      } else {
        console.log(`    - ${row.label}: no savings (${Math.abs(row.savingsVsFullMs ?? 0)}ms slower, within run variance) → ${row.totalMs}ms`);
      }
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
  analyzeFeatureIsolation,
  printRunSummary,
  printRunComparison,
  printFeatureIsolation,
};
