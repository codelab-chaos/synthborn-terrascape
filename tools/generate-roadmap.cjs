#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const dataPath = path.join(projectRoot, "docs", "roadmap.json");
const markdownPath = path.join(projectRoot, "docs", "roadmap.md");
const svgPath = path.join(projectRoot, "images", "terrascape-roadmap.svg");
const pngPath = path.join(projectRoot, "images", "terrascape-roadmap.png");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const WIDTH = 1800;
const MARGIN = 90;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;
const COLUMNS = 4;
const GAP = 22;
const CARD_WIDTH = (CONTENT_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;
const CARD_HEIGHT = 190;
const GROUP_HEADER_HEIGHT = 152;
const GROUP_PADDING_BOTTOM = 50;
const GROUP_GAP = 34;
const HEADER_HEIGHT = 250;
const FOOTER_HEIGHT = 105;

const groupHeights = data.releases.map((release) => {
  const rows = Math.ceil(release.items.length / COLUMNS);
  return GROUP_HEADER_HEIGHT + rows * CARD_HEIGHT + Math.max(0, rows - 1) * GAP + GROUP_PADDING_BOTTOM;
});
const HEIGHT = HEADER_HEIGHT + groupHeights.reduce((sum, height) => sum + height, 0)
  + GROUP_GAP * Math.max(0, data.releases.length - 1) + FOOTER_HEIGHT;

fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
fs.mkdirSync(path.dirname(svgPath), { recursive: true });
fs.writeFileSync(markdownPath, renderMarkdown(data));
fs.writeFileSync(svgPath, renderSvg(data));

const pngResult = renderPng(svgPath, pngPath, WIDTH, HEIGHT);
console.log(`roadmap markdown: ${path.relative(projectRoot, markdownPath)}`);
console.log(`roadmap SVG:      ${path.relative(projectRoot, svgPath)}`);
console.log(pngResult.ok
  ? `roadmap PNG:      ${path.relative(projectRoot, pngPath)}`
  : `roadmap PNG:      skipped (${pngResult.reason})`);

function renderMarkdown(roadmap) {
  const status = {
    shipped: "✅ Shipped",
    planned: "🛠 Planned",
    conditional: "◆ Demand-driven",
  };
  const releases = roadmap.releases.map((release) => {
    const items = release.items
      .map((item) => `- **${item.title}** — ${item.description} _${status[item.status] || item.status}_`)
      .join("\n");
    return `## ${release.version} — ${release.name}\n\n**${release.phase}**\n\n${release.summary}\n\n${items}`;
  }).join("\n\n");
  return `# ${roadmap.title}\n\n${roadmap.subtitle}\n\n![Terrascape roadmap](../images/terrascape-roadmap.png)\n\n${releases}\n\n---\n\n` +
    `Plans may change as the beta community tells us what matters most.\n`;
}

function renderSvg(roadmap) {
  let y = HEADER_HEIGHT;
  const groups = [];
  roadmap.releases.forEach((release, releaseIndex) => {
    const groupHeight = groupHeights[releaseIndex];
    groups.push(renderGroup(release, y, groupHeight, releaseIndex));
    y += groupHeight + GROUP_GAP;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title description">
  <title id="title">${xml(roadmap.title)}</title>
  <desc id="description">${xml(roadmap.subtitle)}</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071321"/>
      <stop offset="0.52" stop-color="#0c1c2d"/>
      <stop offset="1" stop-color="#11152b"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0" cy="0" r="1">
      <stop offset="0" stop-color="#28dfbc" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#28dfbc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0" cy="0" r="1">
      <stop offset="0" stop-color="#8d79ff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#8d79ff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#8ab6c9" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
    <filter id="shadow" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000714" flood-opacity="0.38"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#background)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
  <ellipse cx="80" cy="60" rx="700" ry="560" fill="url(#glowA)"/>
  <ellipse cx="1740" cy="${HEIGHT - 100}" rx="760" ry="620" fill="url(#glowB)"/>
  <g font-family="Inter, Segoe UI, Arial, sans-serif">
    <text x="${MARGIN}" y="82" fill="#51e6c1" font-size="24" font-weight="800" letter-spacing="5">SYNTHBORN / TERRASCAPE</text>
    <text x="${MARGIN}" y="143" fill="#f4fbff" font-size="54" font-weight="800">${xml(roadmap.title.replace("Synthborn: ", ""))}</text>
    <text x="${MARGIN}" y="190" fill="#a9bdca" font-size="24">${xml(roadmap.subtitle)}</text>
    <g transform="translate(${WIDTH - MARGIN - 245},62)">
      <rect width="245" height="56" rx="28" fill="#102b35" stroke="#51e6c1" stroke-opacity="0.55"/>
      <circle cx="29" cy="28" r="7" fill="#51e6c1"/>
      <text x="50" y="36" fill="#d8fff5" font-size="18" font-weight="700">UPDATED ${xml(roadmap.updated)}</text>
    </g>
    ${groups.join("\n")}
    ${renderLegend(HEIGHT - 67)}
  </g>
</svg>
`;
}

function renderGroup(release, y, height, index) {
  const cardY = y + GROUP_HEADER_HEIGHT;
  const titleLines = wrap(release.summary, 105, 2);
  const cards = release.items.map((item, itemIndex) => {
    const column = itemIndex % COLUMNS;
    const row = Math.floor(itemIndex / COLUMNS);
    const x = MARGIN + column * (CARD_WIDTH + GAP);
    const itemY = cardY + row * (CARD_HEIGHT + GAP);
    return renderCard(item, x, itemY, CARD_WIDTH, CARD_HEIGHT, release.accent);
  }).join("\n");
  const connector = index < data.releases.length - 1
    ? `<line x1="${MARGIN + 31}" y1="${y + height}" x2="${MARGIN + 31}" y2="${y + height + GROUP_GAP}" stroke="${release.accent}" stroke-opacity="0.55" stroke-width="4" stroke-dasharray="5 9"/>`
    : "";

  return `<g>
    <rect x="${MARGIN}" y="${y}" width="${CONTENT_WIDTH}" height="${height}" rx="34" fill="#0b1a29" fill-opacity="0.88" stroke="${release.accent}" stroke-opacity="0.32" filter="url(#shadow)"/>
    <rect x="${MARGIN}" y="${y}" width="10" height="${height}" rx="5" fill="${release.accent}"/>
    <circle cx="${MARGIN + 31}" cy="${y + 49}" r="15" fill="#071321" stroke="${release.accent}" stroke-width="6"/>
    <text x="${MARGIN + 66}" y="${y + 42}" fill="${release.accent}" font-size="19" font-weight="800" letter-spacing="3">${xml(release.phase)}</text>
    <text x="${MARGIN + 66}" y="${y + 91}" fill="#f6fbff" font-size="37" font-weight="800">${xml(release.version)} <tspan fill="#8196a6" font-weight="500">— ${xml(release.name)}</tspan></text>
    ${titleLines.map((line, lineIndex) => `<text x="${MARGIN + 66}" y="${y + 125 + lineIndex * 24}" fill="#9fb3c1" font-size="20">${xml(line)}</text>`).join("\n")}
    ${cards}
    ${connector}
  </g>`;
}

function renderCard(item, x, y, width, height, accent) {
  const state = {
    shipped: { label: "SHIPPED", color: "#51e6c1", fill: "#12332f" },
    planned: { label: "TO BUILD", color: "#ffcf67", fill: "#362d19" },
    conditional: { label: "BY REQUEST", color: "#bdadff", fill: "#292343" },
  }[item.status] || { label: String(item.status).toUpperCase(), color: accent, fill: "#172b38" };
  const descriptionLines = wrap(item.description, 40, 3);
  const glyphSize = item.glyph.length >= 4 ? 13 : item.glyph.length === 3 ? 15 : 19;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="#102334" stroke="#92b8c8" stroke-opacity="0.16"/>
    <rect x="${x + 20}" y="${y + 19}" width="56" height="56" rx="16" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-opacity="0.48"/>
    <text x="${x + 48}" y="${y + 54}" fill="${accent}" font-size="${glyphSize}" font-weight="900" text-anchor="middle" letter-spacing="0.5">${xml(item.glyph)}</text>
    <rect x="${x + width - 138}" y="${y + 23}" width="118" height="28" rx="14" fill="${state.fill}"/>
    <text x="${x + width - 79}" y="${y + 42}" fill="${state.color}" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1.2">${state.label}</text>
    <text x="${x + 20}" y="${y + 105}" fill="#f3f9fc" font-size="23" font-weight="800">${xml(item.title)}</text>
    ${descriptionLines.map((line, lineIndex) => `<text x="${x + 20}" y="${y + 137 + lineIndex * 20}" fill="#98adba" font-size="16">${xml(line)}</text>`).join("\n")}
  </g>`;
}

function renderLegend(y) {
  const entries = [
    ["#51e6c1", "SHIPPED"],
    ["#ffcf67", "TO BUILD"],
    ["#bdadff", "DEMAND-DRIVEN"],
  ];
  return `<g transform="translate(${MARGIN},${y})">
    <text x="0" y="0" fill="#718998" font-size="15" font-weight="700" letter-spacing="2">STATUS</text>
    ${entries.map(([color, label], index) => `<g transform="translate(${92 + index * 205},-13)"><circle cx="8" cy="8" r="7" fill="${color}"/><text x="25" y="14" fill="#aabdc8" font-size="15" font-weight="700">${label}</text></g>`).join("\n")}
    <text x="${CONTENT_WIDTH}" y="0" fill="#718998" font-size="15" text-anchor="end">Plans may change with community feedback</text>
  </g>`;
}

function renderPng(inputSvg, outputPng, width, height) {
  const chrome = findChrome();
  if (!chrome) return { ok: false, reason: "Chrome/Chromium not found; SVG was generated" };
  const profileDir = fs.mkdtempSync(path.join(projectRoot, ".tmp-roadmap-chrome-"));
  try {
    const isWindowsExe = chrome.toLowerCase().endsWith(".exe");
    const input = isWindowsExe ? toWindowsPath(inputSvg) : inputSvg;
    const output = isWindowsExe ? toWindowsPath(outputPng) : outputPng;
    const profile = isWindowsExe ? toWindowsPath(profileDir) : profileDir;
    const fileUrl = isWindowsExe
      ? `file:///${input.replace(/\\/g, "/")}`
      : `file://${input}`;
    const result = spawnSync(chrome, [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1200",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      `--screenshot=${output}`,
      fileUrl,
    ], { encoding: "utf8", timeout: 30_000 });
    if (result.status !== 0 || !fs.existsSync(outputPng)) {
      return { ok: false, reason: (result.stderr || result.stdout || `Chrome exited ${result.status}`).trim() };
    }
    return { ok: true };
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

function findChrome() {
  const playwrightChrome = findPlaywrightChrome();
  const candidates = [
    process.env.CHROME_PATH,
    playwrightChrome,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function findPlaywrightChrome() {
  const cacheRoot = path.join(os.homedir(), ".cache", "ms-playwright");
  if (!fs.existsSync(cacheRoot)) return null;
  const installs = fs.readdirSync(cacheRoot)
    .filter((entry) => entry.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();
  for (const install of installs) {
    const candidate = path.join(cacheRoot, install, "chrome-headless-shell-linux64", "chrome-headless-shell");
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function toWindowsPath(input) {
  const result = spawnSync("wslpath", ["-w", input], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Unable to translate WSL path: ${input}`);
  return result.stdout.trim();
}

function wrap(text, maxCharacters, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
  return clipped;
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
