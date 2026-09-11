#!/usr/bin/env node
// Attach to a dedicated, visible desktop Chrome launched with remote debugging.
// Run on the same OS as Chrome. No headless browser, viewport override, or video capture.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const endpoint = option('--cdp', 'http://127.0.0.1:9222');
const url = option('--url', 'http://macbook-server.org:5960/');
const output = path.resolve(option('--out', 'perf-history/desktop-chrome.json'));
const report = { timestamp: new Date().toISOString(), url, runs: [] };
const save = () => { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); };
async function snapshot(page) {
  return page.evaluate(() => {
    const d = window.__terrascapeDebug;
    return { status: document.querySelector('#status')?.textContent, chunks: d.loadedChunks.size,
      camera: d.cameraPose(), map: {...d.mapBackdropStats()}, timings: d.lastPerfTimings(),
      resources: document.querySelector('#metric-resources')?.textContent,
      settings: d.viewState(), players: d.playerMarkers.size, mobs: d.mobMarkers.size };
  });
}
async function ready(page) {
  await page.waitForFunction(() => {
    const d = window.__terrascapeDebug;
    if (!d) return false;
    const r = Number(document.querySelector('#radius').value);
    const m = d.mapBackdropStats();
    return d.loadedChunks.size >= (2*r+1)**2 && m.pending === 0 && m.inFlight === 0 && m.promotionPending === 0;
  }, null, { timeout: 180000 });
}
async function sample(page, label, moving) {
  if (moving) await page.evaluate(() => {
    const d = window.__terrascapeDebug;
    const camera = d.cameraPose().camera;
    const target = { x: camera.x, y: camera.y, z: camera.z - 64 };
    d.setCameraPose({camera, target, lookAt: target});
  });
  const before = await snapshot(page);
  const waypoints = [];
  await page.evaluate(() => {
    window.__desktopPerfSample = { gaps: [], started: performance.now(), previous: null, active: true };
    function tick(now) {
      const s = window.__desktopPerfSample;
      if (!s.active) return;
      if (s.previous !== null) s.gaps.push(now - s.previous);
      s.previous = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  try {
    if (moving) {
      await page.locator('canvas').dispatchEvent('pointerdown', { button: 1, buttons: 4 });
      for (const key of ['w', 's']) {
        await page.keyboard.down(key);
        await page.waitForTimeout(5000);
        await page.keyboard.up(key);
        waypoints.push(await snapshot(page));
      }
    } else await page.waitForTimeout(10000);
  } finally {
    await page.keyboard.up('w'); await page.keyboard.up('s');
  }
  const frames = await page.evaluate(() => {
    const s = window.__desktopPerfSample; s.active = false;
    const gaps = s.gaps; const sorted = [...gaps].sort((a,b)=>a-b);
    return { intervalCount: gaps.length, durationMs: gaps.reduce((a,b)=>a+b,0),
      averageFps: gaps.length*1000/gaps.reduce((a,b)=>a+b,0),
      p50FrameMs: sorted[Math.ceil(sorted.length*.5)-1],
      p95FrameMs: sorted[Math.ceil(sorted.length*.95)-1],
      p99FrameMs: sorted[Math.ceil(sorted.length*.99)-1],
      longestFrameMs: sorted.at(-1), hitchesOver50Ms: gaps.filter(n=>n>50).length,
      hitchesOver100Ms: gaps.filter(n=>n>100).length, gaps };
  });
  const result = { label, frames, before, waypoints, after: await snapshot(page) };
  if (moving) {
    const a = before.camera.camera, b = waypoints[0].camera.camera;
    result.outboundDistanceBlocks = Math.hypot(b.x-a.x,b.z-a.z);
    if (result.outboundDistanceBlocks < 100) throw Error(`Flight did not cross enough terrain: ${result.outboundDistanceBlocks} blocks`);
  }
  console.log(JSON.stringify({label,...frames,gaps:undefined}));
  return result;
}
(async () => {
  const browser = await chromium.connectOverCDP(endpoint);
  let page;
  try {
    const context = browser.contexts()[0];
    page = context.pages().find(p => p.url().startsWith(new URL(url).origin)) || await context.newPage();
    await page.bringToFront();
    const system = await browser.newBrowserCDPSession();
    const info = await system.send('SystemInfo.getInfo');
    report.browser = browser.version(); report.gpu = info.gpu;
    const cdp = await context.newCDPSession(page);
    report.errors = [];
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('crash', () => {report.errors.push('Browser page crashed'); save();});
    // Only the dedicated benchmark profile's target origin is cleared.
    await page.goto('about:blank');
    await cdp.send('Storage.clearDataForOrigin', {origin: new URL(url).origin, storageTypes: 'indexeddb,cache_storage'});
    await cdp.send('Network.clearBrowserCache');
    for (const phase of ['cold-browser-cache', 'warm-browser-cache']) {
      const started = Date.now();
      await page.goto(url, {waitUntil: 'domcontentloaded'});
      await ready(page);
      const run = { phase, readyMs: Date.now()-started, loaded: await snapshot(page), samples: [] };
      report.runs.push(run); save();
      report.display = await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { width: innerWidth, height: innerHeight, devicePixelRatio,
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          visibility: document.visibilityState };
      });
      if (/swiftshader|llvmpipe|software/i.test(report.display.renderer)) throw Error('Software renderer detected; cannot label this hardware Chrome benchmark');
      console.log(JSON.stringify({phase,readyMs:run.readyMs,display:report.display}));
      run.samples.push(await sample(page,'stationary',false)); save();
      run.samples.push(await sample(page,'forward-back-flight',true)); save();
      await ready(page);
    }
  } catch(e) { report.failure = e.message; save(); throw e; }
  finally { await browser.close(); }
  console.log(`Saved ${output}`);
})().catch(e=>{console.error(e);process.exitCode=1});
