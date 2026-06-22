#!/usr/bin/env node
// Whole-codebase TS unit coverage in the Jest/istanbul table format.
//
// 1. Best-effort compile of ALL web sources (not just the tested ones) so c8 can report
//    every file. DOM/three-coupled files emit JS but fail type-checking — that is expected
//    and harmless here; we only need the emitted JS, and c8's --all lists never-loaded files
//    as 0% so the headline number reflects the real codebase, not a hand-picked slice.
// 2. Run the node:test unit suite under c8 with the text (Jest-style) reporter.
const { spawnSync } = require('node:child_process');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const src = 'build/web-cov/web/src';

spawnSync(npx, ['tsc', '-p', 'tests/tsconfig.web-cov.json'], { stdio: 'inherit' });

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
