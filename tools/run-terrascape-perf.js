#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_CONFIG_PATH,
  loadPerfSuiteConfig,
  buildScenariosPayload,
  runMeshProbe,
  readReportFile,
  compareRuns,
  analyzeFeatureIsolation,
  printRunSummary,
  printRunComparison,
  printFeatureIsolation,
} = require('./library/perf-suite');
const { resolveTerrascapeUrl } = require('../../../tools/library/remote-host');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);

const options = {
  mode: 'both',
  suite: 'default',
  runs: 1,
  build: false,
  deploy: false,
  clearServerCache: false,
  headed: false,
  enforce: false,
  threshold: null,
  centerX: null,
  centerZ: null,
  radius: null,
  steps: null,
  flyChunks: null,
  flySampleMs: null,
  configPath: DEFAULT_CONFIG_PATH,
  reportDir: path.join(projectRoot, 'perf-history'),
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--mode':
      options.mode = args[++i] ?? options.mode;
      break;
    case '--wet':
      options.mode = 'wet';
      break;
    case '--dry':
      options.mode = 'dry';
      break;
    case '--both':
      options.mode = 'both';
      break;
    case '--suite':
      options.suite = args[++i] ?? options.suite;
      break;
    case '--extensive':
      options.suite = 'extensive';
      break;
    case '--quick':
      options.suite = 'quick';
      break;
    case '--runs':
      options.runs = Math.max(1, Number.parseInt(args[++i] ?? '1', 10) || 1);
      break;
    case '--config':
      options.configPath = path.resolve(args[++i] ?? DEFAULT_CONFIG_PATH);
      break;
    case '--report-dir':
      options.reportDir = path.resolve(args[++i] ?? options.reportDir);
      break;
    case '--build':
      options.build = true;
      break;
    case '--deploy':
      options.deploy = true;
      break;
    case '--post-deploy':
      options.build = true;
      options.deploy = true;
      break;
    case '--clear-server-cache':
      options.clearServerCache = true;
      break;
    case '--headed':
      options.headed = true;
      break;
    case '--enforce':
      options.enforce = true;
      break;
    case '--threshold':
      options.threshold = args[++i] ?? null;
      break;
    case '--center-x':
      options.centerX = args[++i] ?? null;
      break;
    case '--center-z':
      options.centerZ = args[++i] ?? null;
      break;
    case '--radius':
      options.radius = args[++i] ?? null;
      break;
    case '--steps':
      options.steps = args[++i] ?? null;
      break;
    case '--fly-chunks':
      options.flyChunks = args[++i] ?? null;
      break;
    case '--fly-sample-ms':
      options.flySampleMs = args[++i] ?? null;
      break;
    case '--help':
      usage(0);
      break;
    default:
      console.error(`Unknown option: ${arg}`);
      usage(1);
  }
}

if (!['wet', 'dry', 'both'].includes(options.mode)) {
  console.error(`Invalid mode: ${options.mode}`);
  usage(1);
}

const isSuiteRun = options.suite === 'extensive' || options.suite === 'quick';
let suiteConfig = null;
let scenariosPayload = null;

if (isSuiteRun) {
  const configPath = options.suite === 'quick'
    ? path.join(projectRoot, 'tools', 'perf-suite-smoothness-gate.json')
    : options.configPath;
  const loaded = loadPerfSuiteConfig(configPath);
  suiteConfig = loaded.config;
  scenariosPayload = applyFlyOverrides(buildScenariosPayload(suiteConfig), options);
  console.log(`Perf suite: ${options.suite} (${scenariosPayload.length} scenarios from ${loaded.configPath})`);
} else {
  console.log('Perf suite: default (legacy single scenario)');
}

if (options.build) {
  run(isWindows ? '.\\gradlew.bat' : './gradlew', ['build'], projectRoot);
}
if (options.deploy) {
  run(isWindows ? '.\\gradlew.bat' : './gradlew', ['deploy'], projectRoot);
}

const baseUrl = resolveTerrascapeUrl();
const runReports = [];

for (let runIndex = 1; runIndex <= options.runs; runIndex++) {
  const runId = `run-${runIndex}`;
  const reportFile = path.join(options.reportDir, `terrascape-perf-${runId}.json`);
  const meshProbeFile = path.join(options.reportDir, `mesh-probe-${runId}.json`);

  if (options.clearServerCache) {
    clearServerCache();
  }

  let meshProbe = null;
  if (isSuiteRun && suiteConfig?.serverMeshProbe?.enabled) {
    const probe = suiteConfig.serverMeshProbe;
    if (probe.clearCacheBefore) {
      clearServerCache();
    }
    console.log(`\n== mesh probe ${runId}`);
    meshProbe = runMeshProbe(projectRoot, {
      url: baseUrl,
      world: probe.world ?? 'default',
      centerX: probe.centerX ?? 0,
      centerZ: probe.centerZ ?? 0,
      radius: probe.radius ?? 3,
      concurrency: probe.concurrency ?? 8,
      jsonOut: meshProbeFile,
    });
  }

  console.log(`\n== browser perf ${runId} (${baseUrl})`);
  runPlaywright({
    runId,
    reportFile,
    scenariosPayload,
  });

  const report = readReportFile(reportFile) ?? { runId, results: [] };
  if (meshProbe) {
    report.meshProbe = meshProbe;
    fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  runReports.push(report);
  if (suiteConfig) {
    printRunSummary(report, suiteConfig);
    if (suiteConfig.featureIsolation) {
      const analysis = analyzeFeatureIsolation(report, suiteConfig);
      printFeatureIsolation(analysis);
      const analysisFile = path.join(options.reportDir, 'feature-isolation-analysis.json');
      fs.writeFileSync(analysisFile, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
      console.log(`\nFeature analysis written: ${analysisFile}`);
    }
  } else {
    printRunSummary(report, { thresholds: {} });
  }
}

if (runReports.length === 2 && suiteConfig) {
  const comparisons = compareRuns(runReports[0], runReports[1]);
  printRunComparison(comparisons);
  const comparisonFile = path.join(options.reportDir, 'terrascape-perf-run-comparison.json');
  fs.mkdirSync(options.reportDir, { recursive: true });
  fs.writeFileSync(comparisonFile, `${JSON.stringify({
    kind: 'terrascape-perf-comparison',
    timestamp: new Date().toISOString(),
    run1: runReports[0].runId,
    run2: runReports[1].runId,
    comparisons,
  }, null, 2)}\n`, 'utf8');
  console.log(`\nComparison written: ${comparisonFile}`);
}

function runPlaywright({ runId, reportFile, scenariosPayload }) {
  const playwright = path.join(projectRoot, 'node_modules', '.bin', isWindows ? 'playwright.cmd' : 'playwright');
  const playwrightArgs = ['test', 'tests/terrascape-perf.spec.js'];
  if (options.headed) {
    playwrightArgs.push('--headed');
  }

  const env = {
    ...process.env,
    TERRASCAPE_URL: baseUrl,
    TERRASCAPE_PERF_MODE: options.mode,
    TERRASCAPE_PERF_ENFORCE: options.enforce ? '1' : (process.env.TERRASCAPE_PERF_ENFORCE ?? ''),
    TERRASCAPE_PERF_RUN_ID: runId,
    TERRASCAPE_PERF_REPORT_FILE: reportFile,
  };
  if (options.threshold) env.TERRASCAPE_PERF_REGRESSION_FACTOR = options.threshold;
  if (options.centerX) env.TERRASCAPE_PERF_CENTER_X = options.centerX;
  if (options.centerZ) env.TERRASCAPE_PERF_CENTER_Z = options.centerZ;
  if (options.radius) env.TERRASCAPE_PERF_RADIUS = options.radius;
  if (options.steps) env.TERRASCAPE_PERF_STEPS = options.steps;
  if (options.flyChunks) env.TERRASCAPE_PERF_FLY_CHUNKS = options.flyChunks;
  if (options.flySampleMs) env.TERRASCAPE_PERF_FLY_SAMPLE_MS = options.flySampleMs;
  if (scenariosPayload) {
    env.TERRASCAPE_PERF_SCENARIOS = JSON.stringify(scenariosPayload);
  }

  run(playwright, playwrightArgs, projectRoot, env);
}

function applyFlyOverrides(scenarios, opts) {
  const flyChunks = opts.flyChunks != null ? Number.parseInt(opts.flyChunks, 10) : null;
  const flySampleMs = opts.flySampleMs != null ? Number.parseInt(opts.flySampleMs, 10) : null;
  if (!Number.isFinite(flyChunks) && !Number.isFinite(flySampleMs)) {
    return scenarios;
  }
  return scenarios.map((scenario) => ({
    ...scenario,
    ...(Number.isFinite(flyChunks) ? { flyChunks } : {}),
    ...(Number.isFinite(flySampleMs) ? { flySampleMs } : {}),
  }));
}

function clearServerCache() {
  run('node', [
    'tools/rcon/synth-rcon.js',
    '--save',
    'synth-worldview-mvp',
    'terrascape',
    'clearcache',
  ], repoRoot);
}

function run(command, commandArgs, cwd, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env,
    stdio: 'inherit',
    shell: isWindows && (command.endsWith('.cmd') || command.endsWith('.bat')),
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function usage(exitCode) {
  console.log(`Usage: node tools/run-terrascape-perf.js [options]

Options:
  --wet                  Clear browser mesh cache, then measure server/network load.
  --dry                  Measure warm browser-cache loading.
  --both                 Run wet then dry in the same browser session. Default.
  --suite default        Legacy single-scenario route. Default.
  --suite extensive      Run the scenario matrix from tools/perf-suite-config.json.
  --extensive            Alias for --suite extensive.
  --quick                One fast dry pass at default settings (smoothness-gate).
  --suite quick          Same as --quick.
  --runs N               Repeat the suite N times and compare (default 1).
  --config PATH          Perf suite config JSON (default tools/perf-suite-config.json).
  --report-dir PATH      Where run JSON reports are written (default perf-history/).
  --build                Run Gradle build before the browser perf test.
  --deploy               Run Gradle deploy before the browser perf test.
  --post-deploy          Alias for --build --deploy.
  --clear-server-cache   Run /terrascape clearcache through SynthRCON before each run.
  --headed               Show the browser.
  --enforce              Fail when history comparison exceeds the threshold.
  --threshold N          Regression factor. Default 1.5 (per-scenario overrides in config).
  --center-x N           Legacy route center chunk X. Default 0.
  --center-z N           Legacy route center chunk Z. Default 0.
  --radius N             Legacy mesh radius. Default 10.
  --steps N              Legacy chunks to navigate in each direction. Default 4.
  Fly movement (also in perf-suite-config.json defaults):
  --fly-chunks N         WASD fly distance per leg. Default 6 chunks.
  --fly-sample-ms N      FPS poll interval during fly legs. Default 100.

Thresholds and scenario matrix live in tools/perf-suite-config.json.
Edit regressionFactor per scenario and thresholds.totalMs / minFps / mapBackdropLoadMs there.
`);
  process.exit(exitCode);
}
