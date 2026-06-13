"use strict";

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const IS_WINDOWS = process.platform === "win32";

function runCli(config, argv) {
  const opts = parseArgs(argv);
  loadRemoteEnv(config.repoRoot);

  const target = resolveTarget(config, opts.target);
  const mode = opts.local ? "local" : "remote";
  const ctx = { root: config, target, mode };

  if (opts.help) {
    usage(config, target);
    return;
  }

  const command = opts.command || "deploy";
  switch (command) {
    case "build":
      buildAll(ctx);
      break;
    case "deploy":
      deployAll(ctx);
      if (opts.restart) restartServer(ctx, opts, { deployAlreadyDone: true });
      else if (opts.verify) verify(ctx);
      break;
    case "restart":
      restartServer(ctx, opts);
      break;
    case "start":
      startServer(ctx, opts);
      if (opts.wait) waitForHealth(ctx);
      break;
    case "stop":
      stopServer(ctx, { force: opts.force, tolerateDown: opts.tolerateDown });
      break;
    case "status":
      status(ctx);
      break;
    case "verify":
      verify(ctx);
      break;
    case "list":
      status(ctx);
      break;
    case "targets":
      listTargets(config);
      break;
    case "logs":
    case "tail":
      tailLogs(ctx, opts.lines);
      break;
    case "grep":
      grepLogs(ctx, opts.pattern, opts.lines);
      break;
    case "newest":
      console.log(newestLog(ctx));
      break;
    case "rcon":
      if (!opts.rconCommand) throw new Error("rcon requires a command after --");
      console.log(rconCommand(ctx, opts.rconCommand));
      break;
    default:
      usage(config, target);
      throw new Error(`Unknown command: ${command}`);
  }
}

function usage(config, target) {
  const targetNames = Object.keys(config.targets || { default: config });
  console.log(`Usage:
  node tools/deploy.js [--target ${target.id}] [--remote|--local] [deploy] [--restart] [--verify] [--max-ram N]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] build
  node tools/deploy.js [--target ${target.id}] [--remote|--local] restart [--max-ram N] [--min-ram N] [--skip-running-check]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] start [--wait] [--max-ram N] [--min-ram N]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] stop [--force]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] status
  node tools/deploy.js [--target ${target.id}] [--remote|--local] verify
  node tools/deploy.js [--target ${target.id}] [--remote|--local] logs [-n N]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] grep <pattern> [-n N]
  node tools/deploy.js [--target ${target.id}] [--remote|--local] newest
  node tools/deploy.js [--target ${target.id}] [--remote|--local] rcon -- <command>
  node tools/deploy.js targets

Targets: ${targetNames.join(", ")}

Selected:
  target=${target.id}
  save=${target.saveName}
  rcon=${target.rconPort}
  bind=${target.bind}
  artifacts=${artifactsFor(target).map((artifact) => artifact.jarBaseName).join(", ")}

Config:
  cp remote-host.env.example remote-host.env
`);
}

function parseArgs(argv) {
  const commands = new Set(["build", "deploy", "restart", "start", "stop", "status", "list", "targets", "verify", "logs", "tail", "grep", "newest", "rcon"]);
  const opts = {
    command: null,
    target: null,
    local: false,
    remote: true,
    verify: false,
    restart: false,
    wait: false,
    force: false,
    noVerify: false,
    tolerateDown: true,
    skipRunningCheck: false,
    maxRamGB: null,
    minRamGB: null,
    lines: 80,
    pattern: null,
    rconCommand: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      opts.rconCommand = argv.slice(i + 1).join(" ").trim();
      break;
    }
    switch (arg) {
      case "-h":
      case "--help":
        opts.help = true;
        return opts;
      case "--target":
      case "-t":
        opts.target = stringValue(argv, ++i, arg);
        break;
      case "--local":
        opts.local = true;
        opts.remote = false;
        break;
      case "--remote":
        opts.local = false;
        opts.remote = true;
        break;
      case "--verify":
        opts.verify = true;
        break;
      case "--no-verify":
        opts.verify = false;
        opts.noVerify = true;
        break;
      case "--restart":
        opts.restart = true;
        opts.verify = true;
        break;
      case "--wait":
        opts.wait = true;
        break;
      case "--force":
        opts.force = true;
        opts.tolerateDown = false;
        break;
      case "--skip-running-check":
        opts.skipRunningCheck = true;
        break;
      case "--max-ram":
        opts.maxRamGB = numberValue(argv, ++i, arg);
        break;
      case "--min-ram":
        opts.minRamGB = numberValue(argv, ++i, arg);
        break;
      case "-n":
      case "--lines":
        opts.lines = numberValue(argv, ++i, arg);
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
        if (!opts.command && commands.has(arg)) {
          opts.command = arg;
        } else if ((opts.command === "grep" || opts.command == null) && !opts.pattern) {
          opts.pattern = arg;
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
    }
  }
  return opts;
}

function stringValue(argv, index, flag) {
  const raw = argv[index];
  if (raw == null || raw.startsWith("-")) throw new Error(`${flag} requires a value`);
  return raw;
}

function numberValue(argv, index, flag) {
  const value = Number(stringValue(argv, index, flag));
  if (!Number.isFinite(value)) throw new Error(`${flag} requires a number`);
  return value;
}

function resolveTarget(config, targetId) {
  if (!config.targets) {
    return normalizeTarget({ ...config, id: "default" }, config);
  }
  const id = targetId || config.defaultTarget || "default";
  const target = config.targets[id];
  if (!target) {
    throw new Error(`Unknown target "${id}". Known targets: ${Object.keys(config.targets).join(", ")}`);
  }
  return normalizeTarget({ ...target, id }, config);
}

function normalizeTarget(target, config) {
  return {
    ...target,
    repoRoot: target.repoRoot || config.repoRoot,
    rconDir: target.rconDir || config.rconDir,
    minRamGB: target.minRamGB || config.minRamGB || 2,
    maxRamGB: target.maxRamGB || config.maxRamGB || 6,
    localSavesRoot: target.localSavesRoot || config.localSavesRoot,
    localInstall: target.localInstall || config.localInstall,
  };
}

function listTargets(config) {
  const targets = config.targets || { default: config };
  console.log("target".padEnd(12) + "save".padEnd(24) + "game".padEnd(18) + "rcon".padEnd(8) + "artifacts");
  console.log("-".repeat(12) + "-".repeat(24) + "-".repeat(18) + "-".repeat(8) + "-".repeat(24));
  for (const [id, rawTarget] of Object.entries(targets)) {
    const target = normalizeTarget({ ...rawTarget, id }, config);
    console.log(
      id.padEnd(12)
      + target.saveName.padEnd(24)
      + String(target.bind).padEnd(18)
      + String(target.rconPort).padEnd(8)
      + artifactsFor(target).map((artifact) => artifact.jarBaseName).join(", "),
    );
  }
}

function loadRemoteEnv(repoRoot) {
  for (const file of [path.join(repoRoot, "remote-host.env")]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed && process.env[parsed.key] === undefined) process.env[parsed.key] = parsed.value;
    }
  }
}

function parseEnvLine(raw) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return null;
  const eq = line.indexOf("=");
  if (eq <= 0) return null;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function requireRemoteConfig() {
  const ssh = process.env.HYTALE_REMOTE_SSH;
  const host = process.env.HYTALE_REMOTE_HOST;
  const user = process.env.HYTALE_REMOTE_USER;
  const saves = process.env.HYTALE_REMOTE_SAVES;
  const install = process.env.HYTALE_REMOTE_INSTALL;
  if (!ssh && (!host || !user)) {
    throw new Error("Set HYTALE_REMOTE_SSH or HYTALE_REMOTE_HOST + HYTALE_REMOTE_USER in remote-host.env");
  }
  if (!saves || !install) {
    throw new Error("Set HYTALE_REMOTE_SAVES and HYTALE_REMOTE_INSTALL in remote-host.env");
  }
}

function sshTarget() {
  if (process.env.HYTALE_REMOTE_SSH) return process.env.HYTALE_REMOTE_SSH.trim();
  return `${process.env.HYTALE_REMOTE_USER}@${process.env.HYTALE_REMOTE_HOST}`;
}

function sshConfigArgs() {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  return fs.existsSync(configPath) ? ["-F", configPath] : [];
}

function runChecked(label, command, args, options = {}) {
  console.log(`\n== ${label}`);
  console.log(`$ ${[command, ...args].join(" ")}`);
  const res = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
    env: process.env,
  });
  if (res.status !== 0) {
    const detail = options.capture ? `\n${res.stdout || ""}${res.stderr || ""}`.trimEnd() : "";
    throw new Error(`${label} failed with exit code ${res.status}${detail}`);
  }
  return res.stdout || "";
}

function sshRun(command, options = {}) {
  requireRemoteConfig();
  const args = [...sshConfigArgs(), sshTarget(), command];
  const res = spawnSync("ssh", args, {
    stdio: options.silent ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
    env: process.env,
  });
  if (res.status !== 0) {
    const detail = [res.stderr, res.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`ssh ${sshTarget()} failed with exit code ${res.status}${detail ? `:\n${detail}` : ""}`);
  }
  return res.stdout || "";
}

function scpToRemote(localPath, remoteDest) {
  requireRemoteConfig();
  const tmpName = `/tmp/synthborn-deploy-${process.pid}-${Date.now()}-${path.basename(localPath)}`;
  const finalDest = remoteDest.endsWith("/") ? `${remoteDest}${path.basename(localPath)}` : remoteDest;
  runChecked("scp", "scp", [...sshConfigArgs(), localPath, `${sshTarget()}:${tmpName}`]);
  sshRun(`mkdir -p ${remoteShellQuote(path.posix.dirname(finalDest))} && mv ${remoteShellQuote(tmpName)} ${remoteShellQuote(finalDest)}`);
}

function buildGradleProject(projectDir, label) {
  if (IS_WINDOWS) {
    runChecked(`${label} build`, "cmd.exe", ["/d", "/s", "/c", "gradlew.bat", "build"], { cwd: projectDir });
  } else {
    runChecked(`${label} build`, "./gradlew", ["build"], { cwd: projectDir });
  }
}

function artifactsFor(target) {
  if (Array.isArray(target.artifacts)) return target.artifacts;
  return [
    { projectDir: target.rconDir, moduleName: "SynthRCON", jarBaseName: "SynthRCON" },
    { projectDir: target.repoRoot, moduleName: target.moduleName, jarBaseName: target.jarBaseName, extraFiles: target.extraFiles || [] },
  ];
}

function buildAll(ctx) {
  const seen = new Set();
  for (const artifact of artifactsFor(ctx.target)) {
    const projectDir = path.resolve(artifact.projectDir);
    if (seen.has(projectDir)) continue;
    seen.add(projectDir);
    buildGradleProject(projectDir, artifact.moduleName || artifact.jarBaseName);
  }
}

function deployAll(ctx) {
  buildAll(ctx);
  if (ctx.mode === "local") deployLocal(ctx);
  else deployRemote(ctx);
}

function deployRemote(ctx) {
  const modsDir = `${remoteSaveDir(ctx.target)}/mods`;
  sshRun(`mkdir -p ${remoteShellQuote(modsDir)}`);
  for (const artifact of artifactsFor(ctx.target)) {
    scpToRemote(findJar(artifact.projectDir, artifact.jarBaseName), `${modsDir}/`);
    deployExtraFilesRemote(artifact, modsDir);
  }
}

function deployExtraFilesRemote(artifact, modsDir) {
  for (const entry of artifact.extraFiles || []) {
    const local = path.join(artifact.projectDir, entry.local);
    if (!fs.existsSync(local)) {
      if (!entry.optional) throw new Error(`Missing required extra file: ${entry.local}`);
      continue;
    }
    const remote = `${modsDir}/${entry.remote}`.replace(/\\/g, "/");
    sshRun(`mkdir -p ${remoteShellQuote(path.posix.dirname(remote))}`);
    scpToRemote(local, remote);
  }
}

function deployLocal(ctx) {
  const modsDir = path.join(localSaveDir(ctx.target), "mods");
  fs.mkdirSync(modsDir, { recursive: true });
  for (const artifact of artifactsFor(ctx.target)) {
    const jar = findJar(artifact.projectDir, artifact.jarBaseName);
    fs.copyFileSync(jar, path.join(modsDir, path.basename(jar)));
    console.log(`copied ${jar} -> ${modsDir}`);
    deployExtraFilesLocal(artifact, modsDir);
  }
}

function deployExtraFilesLocal(artifact, modsDir) {
  for (const entry of artifact.extraFiles || []) {
    const local = path.join(artifact.projectDir, entry.local);
    if (!fs.existsSync(local)) {
      if (!entry.optional) throw new Error(`Missing required extra file: ${entry.local}`);
      continue;
    }
    const dest = path.join(modsDir, entry.remote);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(local, dest);
    console.log(`copied ${local} -> ${dest}`);
  }
}

function findJar(projectDir, jarBaseName) {
  const dir = path.join(projectDir, "build", "libs");
  const matches = fs.readdirSync(dir)
    .filter((name) => name.startsWith(`${jarBaseName}-`) && name.endsWith(".jar") && !name.endsWith("-plain.jar"))
    .map((name) => {
      const full = path.join(dir, name);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  if (!matches.length) throw new Error(`No ${jarBaseName} fat jar found in ${dir}`);
  return matches[0].full;
}

function restartServer(ctx, opts, state = {}) {
  stopServer(ctx, { force: true, tolerateDown: true });
  pause(4000);
  if (!state.deployAlreadyDone) deployAll(ctx);
  startServer(ctx, opts);
  waitForHealth(ctx);
  if (!opts.noVerify) verify(ctx);
}

function startServer(ctx, opts = {}) {
  if (ctx.mode === "local") startServerLocal(ctx, opts);
  else startServerRemote(ctx, opts);
}

function startServerRemote(ctx, opts = {}) {
  const target = ctx.target;
  requireRemoteConfig();
  const minRam = opts.minRamGB || target.minRamGB || 2;
  const maxRam = opts.maxRamGB || target.maxRamGB || 6;
  const install = remotePathForShell(process.env.HYTALE_REMOTE_INSTALL);
  const save = remotePathForShell(remoteSaveDir(target));
  const bind = target.bind.replace(/'/g, "'\\''");
  const port = bindPort(target.bind);
  const skipCheck = opts.skipRunningCheck ? "true" : "false";
  const terrascapePort = target.terrascapeHttpPort ? ` -Dterrascape.http.port=${target.terrascapeHttpPort}` : "";
  const cmd = [
    `INSTALL=${install}`,
    `SAVE=${save}`,
    `BIND='${bind}'`,
    'JAVA="$INSTALL/jre/latest/Contents/Home/bin/java"',
    'if [ ! -x "$JAVA" ]; then JAVA="$INSTALL/jre/latest/bin/java"; fi',
    'JAR="$INSTALL/game/latest/Server/HytaleServer.jar"',
    'ASSETS="$INSTALL/game/latest/Assets.zip"',
    'test -x "$JAVA" || { echo "java not found under $INSTALL/jre/latest"; exit 1; }',
    'test -f "$JAR" || { echo "missing $JAR"; exit 1; }',
    'test -f "$ASSETS" || { echo "missing $ASSETS"; exit 1; }',
    port ? `if [ "${skipCheck}" != "true" ] && lsof -i UDP:${port} >/dev/null 2>&1; then echo "UDP port ${port} already in use"; exit 1; fi` : null,
    'mkdir -p "$SAVE/logs"',
    'cd "$SAVE"',
    `nohup "$JAVA" -Xms${minRam}G -Xmx${maxRam}G -Dsynthrcon.host=0.0.0.0 -Dsynthrcon.port=${target.rconPort} -Dsynthrcon.allowRemote=true -Dterrascape.http.host=0.0.0.0${terrascapePort} -jar "$JAR" --assets "$ASSETS" --auth-mode authenticated --bind "$BIND" >>"$SAVE/logs/dev-server.out" 2>&1 & echo $! > "$SAVE/.dev-server.pid"`,
    'echo "started detached pid=$(cat "$SAVE/.dev-server.pid")"',
  ].filter(Boolean).join(" && ");
  sshRun(cmd);
}

function startServerLocal(ctx, opts = {}) {
  const target = ctx.target;
  const install = localInstallDir(target);
  const save = localSaveDir(target);
  const java = resolveLocalJava(install);
  const serverJar = path.join(install, "game", "latest", "Server", "HytaleServer.jar");
  const assets = path.join(install, "game", "latest", "Assets.zip");
  mustExist(java, "java");
  mustExist(serverJar, "HytaleServer.jar");
  mustExist(assets, "Assets.zip");
  fs.mkdirSync(path.join(save, "logs"), { recursive: true });
  if (!opts.skipRunningCheck) assertUdpPortFree(bindPort(target.bind));

  const minRam = opts.minRamGB || target.minRamGB || 2;
  const maxRam = opts.maxRamGB || target.maxRamGB || 6;
  const terrascapePort = target.terrascapeHttpPort ? `-Dterrascape.http.port=${target.terrascapeHttpPort}` : null;
  const args = [
    `-Xms${minRam}G`,
    `-Xmx${maxRam}G`,
    "-Dsynthrcon.host=0.0.0.0",
    `-Dsynthrcon.port=${target.rconPort}`,
    "-Dsynthrcon.allowRemote=true",
    "-Dterrascape.http.host=0.0.0.0",
    terrascapePort,
    "-jar",
    serverJar,
    "--assets",
    assets,
    "--auth-mode",
    "authenticated",
    "--bind",
    target.bind,
  ].filter(Boolean);
  const out = fs.openSync(path.join(save, "logs", "dev-server.out"), "a");
  const child = spawn(java, args, {
    cwd: save,
    detached: true,
    stdio: ["ignore", out, out],
    env: process.env,
  });
  child.unref();
  fs.writeFileSync(path.join(save, ".dev-server.pid"), String(child.pid));
  console.log(`started detached pid=${child.pid}`);
}

function stopServer(ctx, options = {}) {
  try {
    rconCommand(ctx, "stop");
  } catch (err) {
    if (!options.force && !options.tolerateDown) throw err;
    if (options.force) {
      console.error(`RCON stop failed (${err.message}); trying ${ctx.mode} fallback`);
      if (ctx.mode === "local") stopServerViaLocalPid(ctx);
      else stopServerViaSsh(ctx);
    } else {
      console.error(`stop skipped (${err.message})`);
    }
  }
}

function stopServerViaSsh(ctx) {
  const target = ctx.target;
  const save = remotePathForShell(remoteSaveDir(target));
  const port = bindPort(target.bind);
  const parts = [
    `SAVE=${save}`,
    'if [ -f "$SAVE/.dev-server.pid" ]; then PID=$(cat "$SAVE/.dev-server.pid" 2>/dev/null); if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then kill "$PID" && echo "killed pid $PID"; fi; fi',
  ];
  if (port) parts.push(`PIDS=$(lsof -ti UDP:${port} 2>/dev/null || true)`, 'if [ -n "$PIDS" ]; then kill $PIDS && echo "killed UDP server ($PIDS)"; fi');
  parts.push('rm -f "$SAVE/.dev-server.pid"', 'echo "ssh stop complete"');
  sshRun(parts.join("; "));
}

function stopServerViaLocalPid(ctx) {
  const pidFile = path.join(localSaveDir(ctx.target), ".dev-server.pid");
  if (!fs.existsSync(pidFile)) {
    console.log("local stop fallback: no pid file");
    return;
  }
  const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid);
      console.log(`killed pid ${pid}`);
    } catch (err) {
      console.error(`pid ${pid} kill skipped (${err.message})`);
    }
  }
  fs.rmSync(pidFile, { force: true });
}

function rconCommand(ctx, command) {
  if (ctx.mode === "local") return httpCommand("127.0.0.1", ctx.target.rconPort, command);
  return remoteRconCommand(ctx.target, command);
}

function remoteRconCommand(target, command) {
  const token = process.env.SYNTH_RCON_TOKEN || "";
  const tokenArg = token ? ` -H ${remoteShellQuote(`X-SynthRCON-Token: ${token}`)}` : "";
  const payload = JSON.stringify({ command });
  return sshRun(
    `curl -fsS -X POST ${remoteShellQuote(`http://127.0.0.1:${target.rconPort}/command`)}`
    + ` -H ${remoteShellQuote("Content-Type: application/json")}${tokenArg}`
    + ` -d ${remoteShellQuote(payload)}`,
    { silent: true },
  ).trim();
}

function httpCommand(host, port, command) {
  const script = `
const http = require("node:http");
const payload = JSON.stringify({ command: process.env.DEPLOY_RCON_COMMAND });
const req = http.request({
  host: process.env.DEPLOY_RCON_HOST,
  port: Number(process.env.DEPLOY_RCON_PORT),
  path: "/command",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  timeout: 30000,
}, (res) => {
  let body = "";
  res.setEncoding("utf8");
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    process.stdout.write(body);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});
req.on("timeout", () => req.destroy(new Error("request timed out")));
req.on("error", (err) => { console.error(err.message); process.exit(1); });
req.end(payload);
`;
  const res = spawnSync(process.execPath, ["-e", script], {
    env: { ...process.env, DEPLOY_RCON_HOST: host, DEPLOY_RCON_PORT: String(port), DEPLOY_RCON_COMMAND: command },
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(`RCON ${host}:${port} failed with exit code ${res.status}: ${(res.stderr || res.stdout || "").trim()}`);
  }
  return (res.stdout || "").trim();
}

function status(ctx) {
  health(ctx, 5000)
    .then((body) => {
      console.log(`${ctx.target.saveName} UP mode=${ctx.mode} rcon=${ctx.target.rconPort} host=${healthHost(ctx)}`);
      console.log(body);
    })
    .catch((err) => {
      console.log(`${ctx.target.saveName} DOWN mode=${ctx.mode} rcon=${ctx.target.rconPort} host=${healthHost(ctx)}`);
      console.log(err.message);
      process.exitCode = 1;
    });
}

function waitForHealth(ctx, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = spawnSync(process.execPath, [__filename, "__health_probe__"], {
      env: { ...process.env, DEPLOY_HEALTH_URL: healthUrl(ctx) },
      encoding: "utf8",
    });
    if (res.status === 0 && /"ok"\s*:\s*true/.test(res.stdout || "")) {
      console.log(res.stdout.trim());
      return;
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for RCON health on ${healthUrl(ctx)}`);
    pause(2000);
  }
}

function verify(ctx) {
  const patterns = Array.isArray(ctx.target.verifyPattern) ? ctx.target.verifyPattern : [ctx.target.verifyPattern];
  const file = newestLog(ctx);
  for (const pattern of patterns.filter(Boolean)) {
    const out = ctx.mode === "local"
      ? grepLastLocal(file, pattern)
      : sshRun(`grep ${remoteShellQuote(pattern)} ${remoteShellQuote(file)} | tail -1`, { silent: true }).trim();
    if (!out) throw new Error(`No verification line matching "${pattern}" in ${file}`);
    console.log(out);
  }
}

function newestLog(ctx) {
  if (ctx.mode === "local") return newestLogLocal(ctx.target);
  return newestLogRemote(ctx.target);
}

function newestLogRemote(target) {
  const logs = `${remoteSaveDir(target)}/logs`;
  const out = sshRun(`ls -t ${remoteShellQuote(logs)}/*_server.log 2>/dev/null | head -1`, { silent: true }).trim();
  if (!out) throw new Error(`No server logs found for ${target.saveName}`);
  return out;
}

function newestLogLocal(target) {
  const logs = path.join(localSaveDir(target), "logs");
  if (!fs.existsSync(logs)) throw new Error(`No logs directory found for ${target.saveName}: ${logs}`);
  const matches = fs.readdirSync(logs)
    .filter((name) => name.endsWith("_server.log") || name.endsWith(".log"))
    .map((name) => {
      const full = path.join(logs, name);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  if (!matches.length) throw new Error(`No server logs found for ${target.saveName}`);
  return matches[0].full;
}

function tailLogs(ctx, lines) {
  const file = newestLog(ctx);
  console.log(`# ${file}`);
  if (ctx.mode === "local") process.stdout.write(readTailLocal(file, Number(lines) || 80));
  else process.stdout.write(sshRun(`tail -n ${Number(lines) || 80} ${remoteShellQuote(file)}`, { silent: true }));
}

function grepLogs(ctx, pattern, lines) {
  if (!pattern) throw new Error("grep requires a pattern");
  const file = newestLog(ctx);
  console.log(`# ${file}`);
  if (ctx.mode === "local") {
    const re = new RegExp(pattern, "i");
    const matches = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((line) => re.test(line));
    process.stdout.write(`${matches.slice(-(Number(lines) || 80)).join("\n") || `(no matches for ${pattern})`}\n`);
  } else {
    const out = sshRun(`grep -Ein -- ${remoteShellQuote(pattern)} ${remoteShellQuote(file)} | tail -n ${Number(lines) || 80}`, { silent: true });
    process.stdout.write(out || `(no matches for ${pattern})\n`);
  }
}

function grepLastLocal(file, pattern) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].includes(pattern)) return lines[i];
  }
  return "";
}

function readTailLocal(file, lineCount) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  return `${lines.slice(-lineCount).join("\n")}\n`;
}

function remoteSaveDir(target) {
  return `${process.env.HYTALE_REMOTE_SAVES.replace(/\/$/, "")}/${target.saveName}`;
}

function localSaveDir(target) {
  return path.join(localSavesRoot(target), target.saveName);
}

function localSavesRoot(target) {
  if (target.localSavesRoot) return target.localSavesRoot;
  if (process.env.HYTALE_LOCAL_SAVES) return process.env.HYTALE_LOCAL_SAVES;
  if (process.env.HYTALE_SAVES) return process.env.HYTALE_SAVES;
  if (IS_WINDOWS && process.env.APPDATA) return path.join(process.env.APPDATA, "Hytale", "UserData", "Saves");
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "Hytale", "UserData", "Saves");
  return path.join(os.homedir(), ".local", "share", "Hytale", "UserData", "Saves");
}

function localInstallDir(target) {
  if (target.localInstall) return target.localInstall;
  if (process.env.HYTALE_LOCAL_INSTALL) return process.env.HYTALE_LOCAL_INSTALL;
  if (process.env.HYTALE_INSTALL) return process.env.HYTALE_INSTALL;
  if (IS_WINDOWS && process.env.APPDATA) {
    const hytaleRoot = path.join(process.env.APPDATA, "Hytale");
    const branch = readPatchline(hytaleRoot) || "release";
    return path.join(hytaleRoot, "install", branch, "package");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Hytale", "install", "release", "package");
  }
  throw new Error("Set HYTALE_LOCAL_INSTALL or HYTALE_INSTALL for local server start");
}

function readPatchline(hytaleRoot) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(hytaleRoot, "patchline.json"), "utf8"));
    return typeof parsed.patchline === "string" ? parsed.patchline : null;
  } catch {
    return null;
  }
}

function resolveLocalJava(install) {
  const binary = IS_WINDOWS ? "java.exe" : "java";
  const candidates = [
    path.join(install, "jre", "latest", "Contents", "Home", "bin", binary),
    path.join(install, "jre", "latest", "bin", binary),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[candidates.length - 1];
}

function mustExist(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} not found: ${file}`);
}

function assertUdpPortFree(port) {
  if (!port) return;
  const res = IS_WINDOWS
    ? spawnSync("powershell.exe", ["-NoProfile", "-Command", `if (Get-NetUDPEndpoint -LocalPort ${port} -ErrorAction SilentlyContinue) { exit 1 }`])
    : spawnSync("sh", ["-c", `! lsof -i UDP:${port} >/dev/null 2>&1`]);
  if (res.status !== 0) throw new Error(`UDP port ${port} already in use`);
}

function remoteShellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function remotePathForShell(posixPath) {
  let expanded = posixPath;
  if (expanded.startsWith("~/")) expanded = `$HOME/${expanded.slice(2)}`;
  if (expanded.includes(" ") || expanded.includes("$HOME")) return `"${expanded.replace(/"/g, '\\"')}"`;
  return expanded;
}

function bindPort(bind) {
  const idx = String(bind || "").lastIndexOf(":");
  if (idx < 0) return null;
  const port = Number(String(bind).slice(idx + 1));
  return Number.isInteger(port) ? port : null;
}

function healthHost(ctx) {
  if (ctx.mode === "local") return "127.0.0.1";
  return process.env.SYNTH_RCON_HOST || process.env.HYTALE_REMOTE_HOST || "127.0.0.1";
}

function healthUrl(ctx) {
  return `http://${healthHost(ctx)}:${ctx.target.rconPort}/health`;
}

function health(ctx, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(healthUrl(ctx), { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body.trim());
        else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
      });
    });
    req.on("timeout", () => req.destroy(new Error("health request timed out")));
    req.on("error", reject);
  });
}

function pause(ms) {
  const seconds = String(Math.max(1, Math.ceil(ms / 1000)));
  if (IS_WINDOWS) spawnSync("powershell.exe", ["-NoProfile", "-Command", `Start-Sleep -Seconds ${seconds}`], { stdio: "ignore" });
  else spawnSync("sleep", [seconds], { stdio: "ignore" });
}

if (process.argv[2] === "__health_probe__") {
  http.get(process.env.DEPLOY_HEALTH_URL, { timeout: 5000 }, (res) => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => {
      process.stdout.write(body);
      process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
    });
  }).on("error", () => process.exit(1));
}

module.exports = { runCli };
