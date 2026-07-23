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
  mapToken: process.env.TERRASCAPE_MAP_TOKEN || "",
  consoleInput: process.env.TERRASCAPE_CONSOLE_SMOKE_INPUT || "/terrascape status",
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
    case "--map-token":
      options.mapToken = args[++i] || options.mapToken;
      break;
    case "--console-input":
      options.consoleInput = args[++i] || options.consoleInput;
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

  await step(results, "standalone RCON lists safe link metadata", async () => {
    const response = await rconCommand("terrascape tokens");
    assertOk(response.status === 200, `RCON tokens returned ${response.status}`);
    assertOk(response.json && response.json.ok === true, "RCON tokens did not return ok:true");
    return messageCount(response.json);
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

  await step(results, "web console rejects anonymous identity", async () => {
    const response = await requestJson(`${options.webUrl}/api/console/session`);
    assertOk(response.status === 401 || response.status === 403,
      `expected anonymous console rejection, got ${response.status}`);
    return response.json?.error || `HTTP ${response.status}`;
  });

  await step(results, "web console rejects invalid bearer", async () => {
    const response = await requestJson(`${options.webUrl}/api/console/session`, bearerInit("not-a-real-token"));
    assertOk(response.status === 401 || response.status === 403,
      `expected invalid-token console rejection, got ${response.status}`);
    return response.json?.error || `HTTP ${response.status}`;
  });

  if (options.mapToken) {
    await step(results, "web API worlds with personal map token", async () => {
      const response = await requestJson(`${options.webUrl}/api/worlds`, bearerInit(options.mapToken));
      assertOk(response.status === 200, `GET /api/worlds returned ${response.status}`);
      assertOk(Array.isArray(response.json?.worlds), "GET /api/worlds did not include worlds");
      return `${response.json.worlds.length} world(s)`;
    });
    await step(results, "identity-bound console session", async () => {
      const response = await consoleRequest("/api/console/session");
      assertOk(response.status === 200, `console session returned ${response.status}`);
      assertOk(response.json?.authenticated === true, "console session was not authenticated");
      assertOk(response.json?.player?.uuid && response.json?.player?.username,
        "console session omitted linked player identity");
      return `${response.json.player.username} (${response.json.online ? "online" : "offline"})`;
    });
    await step(results, "identity-bound console history", async () => {
      const response = await consoleRequest("/api/console/history?after=0");
      assertOk(response.status === 200, `console history returned ${response.status}`);
      assertOk(Array.isArray(response.json?.entries), "console history omitted entries");
      return `${response.json.entries.length} entr${response.json.entries.length === 1 ? "y" : "ies"}`;
    });
  } else {
    console.log("skip - authenticated console checks (pass --map-token or TERRASCAPE_MAP_TOKEN)");
  }

  if (options.mutating) {
    assertOk(options.mapToken, "--mutating requires an identity-bound --map-token");
    await step(results, "console submission as linked user", async () => {
      const response = await consoleRequest("/api/console/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: options.consoleInput }),
      });
      assertOk(response.status === 200, `console submit returned ${response.status}: ${response.text}`);
      return options.consoleInput.startsWith("/") ? "permission-checked command" : "chat";
    });
  }

  console.log("");
  console.log(`runtime smoke passed (${results.length} checks)`);
  console.log(`web:  ${options.webUrl}`);
  console.log(`rcon: ${options.rconUrl}`);
  console.log(`authenticated console: ${options.mapToken ? "checked" : "skipped"}`);
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

async function consoleRequest(path, init = {}) {
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${options.mapToken}` };
  return requestJson(`${options.webUrl}${path}`, { ...init, headers });
}

function bearerInit(bearerToken) {
  return {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  };
}

function assertMessage(messages, needle) {
  const found = (messages || []).some((message) => String(message).includes(needle));
  assertOk(found, `expected command output containing "${needle}"`);
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

Validates a live Terrascape dedicated server through HTTP and standalone RCON. Anonymous
and invalid console requests are always checked. Pass a real personal map token to check
the authenticated console; no synthetic tokens are minted.

Options:
  --url, --web-url <url>       Terrascape web/API base URL (default: ${DEFAULT_WEB_URL})
  --rcon-url <url>             Standalone RCON base URL
  --rcon-host <host>           RCON host when --rcon-url is not set (default: ${DEFAULT_RCON_HOST})
  --rcon-port <port>           RCON port when --rcon-url is not set (default: ${DEFAULT_RCON_PORT})
  --rcon-token <password>      RCON password (or TERRASCAPE_RCON_PASSWORD / SYNTH_RCON_PASSWORD / SYNTH_RCON_TOKEN)
  --map-token <token>          Real identity-bound map token (or TERRASCAPE_MAP_TOKEN)
  --console-input <text>       Input used with --mutating (default: /terrascape status)
  --timeout-ms <ms>            Per-request timeout (default: 30000)
  --mutating                   Submit --console-input through the linked user's console
  --help                       Show this help
`);
}
