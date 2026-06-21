#!/usr/bin/env node
// Renders the JaCoCo XML report as a Jest/istanbul-style coverage table so the Java and TS
// readouts look the same. Columns: % Stmts (instructions), % Branch, % Funcs (methods),
// % Lines, and Uncovered Line #s. JaCoCo already measures every class, so this is whole-codebase.
const fs = require('node:fs');
const path = require('node:path');

const XML = path.join('build', 'reports', 'jacoco', 'test', 'jacocoTestReport.xml');
const BASE = 'com/codelabchaos/terrascape/';

if (!fs.existsSync(XML)) {
  console.error(`No JaCoCo report at ${XML} — run ./gradlew test jacocoTestReport first.`);
  process.exit(1);
}
const xml = fs.readFileSync(XML, 'utf8');

const pct = (covered, missed) => {
  const total = covered + missed;
  return total === 0 ? 100 : (100 * covered) / total;
};

function counters(block) {
  const out = {};
  for (const m of block.matchAll(/<counter type="([A-Z]+)" missed="(\d+)" covered="(\d+)"\/>/g)) {
    out[m[1]] = { missed: Number(m[2]), covered: Number(m[3]) };
  }
  return out;
}

function uncoveredRanges(sourcefileBlock) {
  const lines = [];
  for (const m of sourcefileBlock.matchAll(/<line nr="(\d+)" mi="(\d+)" ci="(\d+)"/g)) {
    if (Number(m[2]) > 0) lines.push(Number(m[1]));
  }
  lines.sort((a, b) => a - b);
  const ranges = [];
  for (const n of lines) {
    const last = ranges[ranges.length - 1];
    if (last && n === last.end + 1) last.end = n;
    else ranges.push({ start: n, end: n });
  }
  return ranges.map((r) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)).join(',');
}

// Collect rows grouped by package.
const rows = [];
const totals = { INSTRUCTION: { c: 0, m: 0 }, BRANCH: { c: 0, m: 0 }, METHOD: { c: 0, m: 0 }, LINE: { c: 0, m: 0 } };

for (const pkg of xml.matchAll(/<package name="([^"]+)">([\s\S]*?)<\/package>/g)) {
  const pkgName = pkg[1].replace(BASE, '');
  const pkgBody = pkg[2];
  const files = [];
  const pkgAgg = { INSTRUCTION: { c: 0, m: 0 }, BRANCH: { c: 0, m: 0 }, METHOD: { c: 0, m: 0 }, LINE: { c: 0, m: 0 } };

  for (const sf of pkgBody.matchAll(/<sourcefile name="([^"]+)">([\s\S]*?)<\/sourcefile>/g)) {
    const name = sf[1];
    const body = sf[2];
    const c = counters(body);
    const get = (t) => c[t] ?? { missed: 0, covered: 0 };
    for (const t of ['INSTRUCTION', 'BRANCH', 'METHOD', 'LINE']) {
      pkgAgg[t].c += get(t).covered;
      pkgAgg[t].m += get(t).missed;
      totals[t].c += get(t).covered;
      totals[t].m += get(t).missed;
    }
    files.push({
      name,
      stmts: pct(get('INSTRUCTION').covered, get('INSTRUCTION').missed),
      branch: pct(get('BRANCH').covered, get('BRANCH').missed),
      funcs: pct(get('METHOD').covered, get('METHOD').missed),
      lines: pct(get('LINE').covered, get('LINE').missed),
      uncovered: uncoveredRanges(body),
    });
  }

  rows.push({
    pkg: pkgName,
    agg: {
      stmts: pct(pkgAgg.INSTRUCTION.c, pkgAgg.INSTRUCTION.m),
      branch: pct(pkgAgg.BRANCH.c, pkgAgg.BRANCH.m),
      funcs: pct(pkgAgg.METHOD.c, pkgAgg.METHOD.m),
      lines: pct(pkgAgg.LINE.c, pkgAgg.LINE.m),
    },
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
  });
}
rows.sort((a, b) => a.pkg.localeCompare(b.pkg));

// Render.
const nameWidth = Math.max(
  10,
  ...rows.map((r) => r.pkg.length + 1),
  ...rows.flatMap((r) => r.files.map((f) => f.name.length + 2)),
);
const f1 = (n) => n.toFixed(2).padStart(7);
const sep = `${'-'.repeat(nameWidth)}|---------|----------|---------|---------|-------------------`;
const header = `${'File'.padEnd(nameWidth)}| % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s`;

const line = (label, m, uncovered = '') =>
  `${label.padEnd(nameWidth)}|${f1(m.stmts)}  |${f1(m.branch)}   |${f1(m.funcs)}  |${f1(m.lines)}  | ${uncovered}`;

console.log(sep);
console.log(header);
console.log(sep);
console.log(line('All files', {
  stmts: pct(totals.INSTRUCTION.c, totals.INSTRUCTION.m),
  branch: pct(totals.BRANCH.c, totals.BRANCH.m),
  funcs: pct(totals.METHOD.c, totals.METHOD.m),
  lines: pct(totals.LINE.c, totals.LINE.m),
}));
for (const r of rows) {
  console.log(line(` ${r.pkg}`, r.agg));
  for (const f of r.files) {
    console.log(line(`  ${f.name}`, f, f.uncovered));
  }
}
console.log(sep);
