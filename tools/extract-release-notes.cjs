#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const tag = process.argv[2];
const changelogPath = process.argv[3] || path.join(process.cwd(), 'CHANGELOG.md');

if (!tag) {
  console.error('Usage: node tools/extract-release-notes.cjs <version-or-tag> [changelog]');
  process.exit(2);
}

const version = tag.startsWith('v') ? tag.slice(1) : tag;
const lines = fs.readFileSync(changelogPath, 'utf8').split(/\r?\n/);
const headingPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\](?: - \\d{4}-\\d{2}-\\d{2})?\\s*$`);
const start = lines.findIndex((line) => headingPattern.test(line));

if (start === -1) {
  console.error(`CHANGELOG.md has no release section for ${version}`);
  process.exit(1);
}

let end = lines.findIndex(
  (line, index) => index > start && (line.startsWith('## ') || /^\[[^\]]+\]:\s+/.test(line)),
);
if (end === -1) end = lines.length;

const notes = lines.slice(start + 1, end).join('\n').trim();
if (!notes || !/^###\s+/m.test(notes)) {
  console.error(`CHANGELOG.md release section for ${version} has no categorized notes`);
  process.exit(1);
}

process.stdout.write(`${notes}\n`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
