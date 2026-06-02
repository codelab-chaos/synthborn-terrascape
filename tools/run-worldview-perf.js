#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);

const options = {
  mode: 'both',
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

if (options.build) {
  run(isWindows ? '.\\gradlew.bat' : './gradlew', ['build'], projectRoot);
}
if (options.deploy) {
  run(isWindows ? '.\\gradlew.bat' : './gradlew', ['deploy'], projectRoot);
}
if (options.clearServerCache) {
  run('node', [
    'tools/rcon/synth-rcon.js',
    '--save',
    'synth-worldview-mvp',
    'worldview',
    'clearcache',
  ], repoRoot);
}

const playwright = path.join(projectRoot, 'node_modules', '.bin', isWindows ? 'playwright.cmd' : 'playwright');
const playwrightArgs = ['test', 'tests/worldview-perf.spec.js'];
if (options.headed) {
  playwrightArgs.push('--headed');
}

const env = {
  ...process.env,
  WORLDVIEW_PERF_MODE: options.mode,
  WORLDVIEW_PERF_ENFORCE: options.enforce ? '1' : (process.env.WORLDVIEW_PERF_ENFORCE ?? ''),
};
if (options.threshold) env.WORLDVIEW_PERF_REGRESSION_FACTOR = options.threshold;
if (options.centerX) env.WORLDVIEW_PERF_CENTER_X = options.centerX;
if (options.centerZ) env.WORLDVIEW_PERF_CENTER_Z = options.centerZ;
if (options.radius) env.WORLDVIEW_PERF_RADIUS = options.radius;
if (options.steps) env.WORLDVIEW_PERF_STEPS = options.steps;

run(playwright, playwrightArgs, projectRoot, env);

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
  console.log(`Usage: node tools/run-worldview-perf.js [options]

Options:
  --wet                  Clear browser mesh cache, then measure server/network load.
  --dry                  Measure warm browser-cache loading.
  --both                 Run wet then dry in the same browser session. Default.
  --build                Run Gradle build before the browser perf test.
  --deploy               Run Gradle deploy before the browser perf test.
  --post-deploy          Alias for --build --deploy.
  --clear-server-cache   Run /worldview clearcache through SynthRCON first.
  --headed               Show the browser.
  --enforce              Fail when history comparison exceeds the threshold.
  --threshold N          Regression factor. Default 1.5.
  --center-x N           Perf route center chunk X. Default 0.
  --center-z N           Perf route center chunk Z. Default 0.
  --radius N             Mesh radius. Default 10.
  --steps N              Chunks to navigate in each direction. Default 4.
`);
  process.exit(exitCode);
}
