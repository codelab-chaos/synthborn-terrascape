#!/usr/bin/env node
// Whole-codebase TS unit coverage in the Jest/istanbul table format.
//
// 1. Type-check production sources, then compile all unit-test sources. A type error is a
//    hard failure: coverage must never make a broken browser build look healthy.
// 2. Run the node:test unit suite under c8 with the text (Jest-style) reporter.
const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const src = 'build/web-cov/web/src';

const typecheck = spawnSync(npx, ['tsc', '-p', 'tsconfig.json', '--noEmit'], { stdio: 'inherit' });
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1);

rmSync('build/web-cov', { recursive: true, force: true });
const compile = spawnSync(npx, ['tsc', '-p', 'tests/tsconfig.web-cov.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const result = spawnSync(npx, [
  'c8',
  '--all',
  '--reporter=text',
  '--reporter=text-summary',
  `--src=${src}`,
  `--include=${src}/**/*.js`,
  // Keep c8's temp + report output under the already-ignored build/ dir.
  '--temp-directory=build/web-cov/.c8-tmp',
  '--reports-dir=build/web-cov/c8-report',
  'node', '--import', './tests/web-unit-setup.mjs', '--test', 'build/web-cov/tests/web-unit/**/*.test.js',
], { stdio: 'inherit' });

process.exit(result.status ?? 1);
