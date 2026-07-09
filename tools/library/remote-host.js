"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_TERRASCAPE_PORT = 5960;
const DEFAULT_TERRASCAPE_URL = `http://127.0.0.1:${DEFAULT_TERRASCAPE_PORT}`;
const repoRoot = path.resolve(__dirname, "..", "..");

function resolveTerrascapeUrl(options = {}) {
  const root = options.repoRoot || repoRoot;
  if (options.loadEnv !== false) loadRemoteEnv(root);

  const explicit = firstValue(
    process.env.TERRASCAPE_URL,
    process.env.WORLDVIEW_URL,
    process.env.HOSTING_TERRASCAPE_PUBLIC_BASE_URL,
    process.env.TERRASCAPE_PUBLIC_BASE_URL,
  );
  if (explicit) return stripTrailingSlash(explicit);

  const port = firstInteger(
    process.env.TERRASCAPE_WEB_PORT,
    process.env.HOSTING_TERRASCAPE_WEB_PORT,
    process.env.TERRASCAPE_PORT,
    options.port,
    DEFAULT_TERRASCAPE_PORT,
  );
  const host = firstValue(
    process.env.TERRASCAPE_WEB_HOST,
    process.env.HOSTING_PUBLIC_HOST,
    process.env.SYNTH_RCON_HOST,
    process.env.HYTALE_REMOTE_HOST,
    process.env.TERRASCAPE_HOST,
  );

  if (!host) return `http://127.0.0.1:${port}`;
  return `http://${normalizeHost(host)}:${port}`;
}

function loadRemoteEnv(root = repoRoot) {
  const loaded = [];
  for (const file of [path.join(root, "remote-host.env")]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed && process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
    loaded.push(file);
  }
  return loaded;
}

function parseEnvLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) return null;
  const eq = line.indexOf("=");
  if (eq <= 0) return null;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function firstValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function firstInteger(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) return parsed;
  }
  return DEFAULT_TERRASCAPE_PORT;
}

function stripTrailingSlash(url) {
  return String(url).trim().replace(/\/+$/, "");
}

function normalizeHost(rawHost) {
  let host = stripTrailingSlash(rawHost)
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .trim();

  if (host.startsWith("[") && host.includes("]")) {
    return host.slice(1, host.indexOf("]"));
  }
  if (host === "0.0.0.0" || host === "::" || host === "") {
    return "127.0.0.1";
  }
  return host.split(":")[0];
}

module.exports = {
  DEFAULT_TERRASCAPE_URL,
  DEFAULT_TERRASCAPE_PORT,
  loadRemoteEnv,
  parseEnvLine,
  resolveTerrascapeUrl,
};
