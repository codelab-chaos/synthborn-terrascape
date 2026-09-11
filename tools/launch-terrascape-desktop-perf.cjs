#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: npm run perf:desktop:launch -- [--run] [--chrome PATH] [--url URL] [--out FILE]\nLaunches visible desktop Chrome with a fresh temporary profile and a dynamic debugging port.\n--run also runs the cold/warm benchmark. Chrome stays open afterward.\nFrom WSL, Windows Chrome and Windows Node are used automatically.');
  process.exit(0);
}
const opts = { run: false, url: 'http://macbook-server.org:5960/' };
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--run') opts.run = true;
  else if (['--chrome', '--url', '--out'].includes(arg) && args[i + 1]) opts[arg.slice(2)] = args[++i];
  else throw Error(`Unknown or incomplete option: ${arg}`);
}
const isWsl = process.platform === 'linux' && /microsoft/i.test(os.release());
if (isWsl) {
  const windowsNode = '/mnt/c/Program Files/nodejs/node.exe';
  if (!fs.existsSync(windowsNode)) throw Error('Install Windows Node.js to run desktop Chrome benchmarks from WSL.');
  const windowsPath = p => execFileSync('wslpath', ['-w', path.resolve(p)], {encoding: 'utf8'}).trim();
  const forwarded = [...args];
  for (const flag of ['--out', '--chrome']) {
    const index = forwarded.indexOf(flag);
    if (index >= 0 && !/^[A-Za-z]:[\\/]/.test(forwarded[index + 1])) forwarded[index + 1] = windowsPath(forwarded[index + 1]);
  }
  if (!opts.out) forwarded.push('--out', windowsPath(path.join(__dirname, '..', 'perf-history', `desktop-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)));
  const result = spawnSync(windowsNode, [windowsPath(__filename), ...forwarded], {stdio: 'inherit'});
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
(async () => {
  const candidates = process.platform === 'win32'
    ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).map(root => path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  const chrome = opts.chrome || candidates.find(p => fs.existsSync(p));
  if (!chrome || !fs.existsSync(chrome)) throw Error('Desktop Chrome not found. Supply --chrome PATH.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'terrascape-perf-chrome-'));
  const child = spawn(chrome, ['--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', opts.url], {detached: true, stdio: 'ignore'});
  let launchError;
  child.on('error', e => { launchError = e; });
  child.unref();
  const deadline = Date.now() + 20000;
  let endpoint;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    try {
      const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]);
      if (port > 0 && port < 65536) {
        const candidate = `http://127.0.0.1:${port}`;
        const response = await fetch(`${candidate}/json/version`, {signal: AbortSignal.timeout(1000)});
        if (response.ok && (await response.json()).webSocketDebuggerUrl) { endpoint = candidate; break; }
      }
    } catch { /* Chrome is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!endpoint) throw Error(`Chrome debugging did not become ready. Profile: ${profile}`);
  const out = path.resolve(opts.out || path.join(__dirname, '..', 'perf-history', `desktop-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  console.log(`Desktop Chrome ready: ${endpoint}\nTemporary profile: ${profile}`);
  if (opts.run) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'run-terrascape-desktop-perf.cjs'), '--cdp', endpoint, '--url', opts.url, '--out', out], {stdio: 'inherit'});
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } else {
    console.log(`Benchmark connection: --cdp ${endpoint}\nUse npm run perf:desktop:auto to launch and benchmark in one command.`);
  }
  console.log('Chrome remains open. Close its benchmark window when finished; its temporary profile can then be removed.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
