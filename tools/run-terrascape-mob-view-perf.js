#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..', '..');
const isWindows = process.platform === 'win32';

const CHUNK_LOADER = {
  save: 'synth-worldview-mvp',
  chunkX: -9,
  chunkZ: 19,
  radius: 2,
};

tryPlaceChunkLoader();

run('node', [
  'tools/run-terrascape-perf.js',
  '--extensive',
  '--config',
  'tools/perf-suite-mob-view.json',
  '--dry',
  '--runs',
  '1',
], projectRoot);

function tryPlaceChunkLoader() {
  const rconScript = path.join(repoRoot, 'tools', 'rcon', 'synth-rcon.js');
  const args = [
    rconScript,
    '--save',
    CHUNK_LOADER.save,
    '--remote',
    'synth',
    'chunk',
    'load',
    String(CHUNK_LOADER.chunkX),
    String(CHUNK_LOADER.chunkZ),
    String(CHUNK_LOADER.radius),
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status === 0 && !/Command not found/i.test(output)) {
    console.log(output || `Placed chunk loader at ${CHUNK_LOADER.chunkX},${CHUNK_LOADER.chunkZ}.`);
    return;
  }
  console.warn(
    `Chunk loader command unavailable on ${CHUNK_LOADER.save}; `
    + 'continuing with synthetic mob overlay perf.',
  );
  if (output) {
    console.warn(output);
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
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
