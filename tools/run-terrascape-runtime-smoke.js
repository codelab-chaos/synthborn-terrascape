#!/usr/bin/env node

const DEFAULT_WEB_URL = "http://127.0.0.1:5960";
const DEFAULT_RCON_HOST = "127.0.0.1";
const DEFAULT_RCON_PORT = "25578";

const options = {
  webUrl: process.env.TERRASCAPE_URL || DEFAULT_WEB_URL,
  rconUrl: process.env.TERRASCAPE_RCON_URL || null,
  rconHost: process.env.TERRASCAPE_RCON_HOST || DEFAULT_RCON_HOST,
  rconPort: process.env.TERRASCAPE_RCON_PORT || DEFAULT_RCON_PORT,
  rconToken: process.env.TERRASCAPE_RCON_PASSWORD || process.env.SYNTH_RCON_PASSWORD || process.env.SYNTH_RCON_TOKEN || "",
  subject: process.env.TERRASCAPE_SMOKE_SUBJECT || `runtime-smoke-${Date.now()}`,
  timeoutMs: Number.parseInt(process.env.TERRASCAPE_SMOKE_TIMEOUT_MS || "30000", 10),
  mutating: false,
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--url":
    case "--web-url":
      options.webUrl = args[++i] || options.webUrl;
      break;
    case "--rcon-url":
      options.rconUrl = args[++i] || options.rconUrl;
      break;
    case "--rcon-host":
      options.rconHost = args[++i] || options.rconHost;
      break;
    case "--rcon-port":
      options.rconPort = args[++i] || options.rconPort;
      break;
    case "--rcon-token":
    case "--rcon-password":
      options.rconToken = args[++i] || options.rconToken;
      break;
    case "--subject":
      options.subject = args[++i] || options.subject;
      break;
    case "--timeout-ms":
      options.timeoutMs = Number.parseInt(args[++i] || String(options.timeoutMs), 10);
      break;
    case "--mutating":
      options.mutating = true;
      break;
    case "--help":
    case "-h":
      printHelp();
      process.exit(0);
      break;
    default:
      fail(`Unknown argument: ${arg}`);
  }
}

options.webUrl = stripTrailingSlash(options.webUrl);
options.rconUrl = stripTrailingSlash(options.rconUrl || `http://${options.rconHost}:${options.rconPort}`);
options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30000;

if (!options.rconToken) {
  fail("Missing RCON password. Set TERRASCAPE_RCON_PASSWORD, SYNTH_RCON_PASSWORD, SYNTH_RCON_TOKEN, or pass --rcon-token.");
}

main().catch((error) => {
  console.error(`runtime smoke failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  const results = [];
  let mapToken = null;
  let adminToken = null;

  await step(results, "standalone RCON health", async () => {
    const response = await requestJson(`${options.rconUrl}/health`);
    assertOk(response.status === 200, `/health returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "/health did not return ok:true");
    return response.json.service || "ok";
  });

  await step(results, "standalone RCON status command", async () => {
    const response = await rconCommand("terrascape status");
    assertOk(response.status === 200, `RCON status returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "RCON status did not return ok:true");
    assertMessage(response.json.messages, "Terrascape status");
    return messageCount(response.json);
  });

  await step(results, "mint map-only smoke token", async () => {
    const response = await rconCommand(`terrascape smoketoken map ${options.subject}-map`);
    assertOk(response.status === 200, `map token mint returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "map token mint did not return ok:true");
    mapToken = extractToken(response.json.messages);
    assertOk(mapToken, "map token mint did not print a token");
    return "token captured";
  });

  await step(results, "mint admin smoke token", async () => {
    const response = await rconCommand(`terrascape smoketoken admin ${options.subject}-admin`);
    assertOk(response.status === 200, `admin token mint returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "admin token mint did not return ok:true");
    adminToken = extractToken(response.json.messages);
    assertOk(adminToken, "admin token mint did not print a token");
    return "token captured";
  });

  await step(results, "web API access-mode probe", async () => {
    const response = await requestJson(`${options.webUrl}/api/worlds`);
    assertOk(response.status === 200 || response.status === 401,
      `expected public 200 or restricted 401, got ${response.status}`);
    if (response.status === 200) {
      assertOk(response.json && response.json.ok === true, "public /api/worlds did not return ok:true");
      return "public";
    }
    assertOk(response.json?.error === "access_required",
      `expected access_required, got ${response.json?.error || "no error"}`);
    return "restricted";
  });

  await step(results, "web API worlds with map token", async () => {
    const response = await requestJson(`${options.webUrl}/api/worlds`, bearerInit(mapToken));
    assertOk(response.status === 200, `GET /api/worlds returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "GET /api/worlds did not return ok:true");
    assertOk(Array.isArray(response.json.worlds), "GET /api/worlds did not include a worlds array");
    assertOk(response.json.worlds.length >= 1, "GET /api/worlds did not return any visible worlds");
    return `${response.json.worlds.length} world(s)`;
  });

  await step(results, "map command proxy rejects missing token", async () => {
    const response = await mapCommand("terrascape status");
    assertOk(response.status === 401 || response.status === 403, `expected 401/403, got ${response.status}`);
    return response.json?.error || `HTTP ${response.status}`;
  });

  await step(results, "map command proxy rejects wrong token", async () => {
    const response = await mapCommand("terrascape status", "not-a-real-token");
    assertOk(response.status === 401 || response.status === 403, `expected 401/403, got ${response.status}`);
    return response.json?.error || `HTTP ${response.status}`;
  });

  await step(results, "map command proxy rejects map-only token", async () => {
    const response = await mapCommand("terrascape status", mapToken);
    assertOk(response.status === 403, `expected 403, got ${response.status}`);
    assertOk(response.json?.error === "admin_user_token_required",
      `expected admin_user_token_required, got ${response.json?.error || "no error"}`);
    return response.json.error;
  });

  await step(results, "map command proxy accepts admin token", async () => {
    const response = await mapCommand("terrascape status", adminToken);
    assertOk(response.status === 200, `expected 200, got ${response.status}`);
    assertOk(response.json && response.json.ok === true, "map command did not return ok:true");
    assertMessage(response.json.messages, "Terrascape status");
    return messageCount(response.json);
  });

  if (options.mutating) {
    await step(results, "mutating console smoke: clear tile cache", async () => {
      const response = await mapCommand("terrascape clearcache tiles", adminToken);
      assertOk(response.status === 200, `expected 200, got ${response.status}`);
      assertOk(response.json && response.json.ok === true, "clearcache did not return ok:true");
      assertMessage(response.json.messages, "Terrascape clearcache");
      return messageCount(response.json);
    });
  }

  console.log("");
  console.log(`runtime smoke passed (${results.length} checks)`);
  console.log(`web:  ${options.webUrl}`);
  console.log(`rcon: ${options.rconUrl}`);
  console.log(`subject: ${options.subject}`);
}

async function step(results, name, fn) {
  try {
    const detail = await fn();
    results.push({ name, detail });
    console.log(`ok - ${name}${detail ? ` (${detail})` : ""}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

async function rconCommand(command) {
  return requestJson(`${options.rconUrl}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SynthRCON-Token": options.rconToken,
    },
    body: JSON.stringify({ command }),
  });
}

async function mapCommand(command, bearerToken = null) {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  };
  if (bearerToken) {
    init.headers.Authorization = `Bearer ${bearerToken}`;
  }
  return requestJson(`${options.webUrl}/api/rcon/command`, init);
}

function bearerInit(bearerToken) {
  return {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  };
}

async function requestJson(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(`${url} returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
      }
    }
    return { status: response.status, json, text };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`${url} timed out after ${options.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractToken(messages) {
  for (const message of messages || []) {
    const match = String(message).match(/\btoken\s*:\s*([A-Za-z0-9_-]{16,})\b/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function assertMessage(messages, needle) {
  const found = (messages || []).some((message) => String(message).includes(needle));
  assertOk(found, `expected command output containing "${needle}"`);
}

function messageCount(json) {
  const count = Array.isArray(json.messages) ? json.messages.length : 0;
  return `${count} message(s)`;
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function fail(message) {
  console.error(`runtime smoke failed: ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: npm run runtime:smoke -- [options]

Validates a live Terrascape dedicated server through HTTP, standalone RCON, and the
map command proxy. The server must have rcon.enabled=true and a configured RCON password.
The server must also set validation.smokeTokensEnabled=true for smoke-token minting.

Options:
  --url, --web-url <url>       Terrascape web/API base URL (default: ${DEFAULT_WEB_URL})
  --rcon-url <url>             Standalone RCON base URL
  --rcon-host <host>           RCON host when --rcon-url is not set (default: ${DEFAULT_RCON_HOST})
  --rcon-port <port>           RCON port when --rcon-url is not set (default: ${DEFAULT_RCON_PORT})
  --rcon-token <password>      RCON password (or TERRASCAPE_RCON_PASSWORD / SYNTH_RCON_PASSWORD / SYNTH_RCON_TOKEN)
  --subject <label>            Synthetic smoke subject label
  --timeout-ms <ms>            Per-request timeout (default: 30000)
  --mutating                   Also run a cache-clearing command through the map proxy
  --help                       Show this help
`);
}
