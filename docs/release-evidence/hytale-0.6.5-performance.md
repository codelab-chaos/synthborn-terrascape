# Hytale 0.6.5 performance measurements

Measured September 10, 2026 against `http://macbook-server.org:5960`, world
`default`, using the deployed Terrascape 0.1.1-beta.1 migration build. These are
observations on a live server, not a controlled before/after Hytale comparison.

## Representative desktop Chrome run

The subsequent run used the user's Windows desktop Chrome, visibly rendering through
the NVIDIA RTX 4080 SUPER. This is the relevant client rendering baseline; the Linux
SwiftShader measurements below describe a different environment and should not be
used to assess the user's browser experience.

- Chrome 152.0.7977.83; ANGLE Direct3D11 on NVIDIA GeForce RTX 4080 SUPER.
- Native viewport 1350x1002 CSS pixels, device pixel ratio 1.25; foreground window.
- Default terrain radius 8 (289 chunks), map radius 16 (1,089 tiles), split cosmetics,
  solid water, shading, land motion, auto-streaming, and player/mob overlays enabled.
- Dedicated temporary Chrome profile, driven from Windows Node over local CDP.
  No headless mode, SwiftShader override, video capture, or Playwright tracing.
- Cold clears this profile's browser HTTP/IndexedDB caches; server caches remain warm.
  Warm reload reuses the browser caches. Loaded readiness includes terrain and drained
  map-tile fetch/promotion queues.

| Phase | Page ready | Stationary average FPS | Flight average FPS | Flight p95 | Longest flight frame | Flight frames >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cold browser cache | 8,175 ms | 119.5 | 83.4 | 25.1 ms | 83.4 ms | 2 |
| Warm browser cache | 3,564 ms | 119.0 | 89.5 | 25.0 ms | 75.1 ms | 4 |

Each sample lasted approximately ten seconds. Stationary p95 was 8.4 ms with zero
frames over 50 ms in both phases; neither flight had a frame over 100 ms. Measurements
use raw `requestAnimationFrame` intervals, bypassing the inaccurate HUD counter.
The stationary view appears near a 120 Hz presentation limit; that is not a measure
of maximum uncapped GPU throughput.

Flight sets a horizontal camera heading and holds forward for five seconds, then
backward for five seconds with streaming enabled. Recorded intermediate camera poses
verify travel across multiple chunk boundaries (about 238 blocks outbound in the cold
phase), and the runner rejects routes shorter than 100 horizontal blocks. Readiness
is checked again after flight. This is a repeatable input sequence, not a guarantee
of identical paths or NPC counts on a live world.

The initial overhead-camera experiment was not used for the flight figures: forward
movement while looking down did not establish horizontal chunk streaming. This report
uses the subsequent run with recorded waypoints and a distance assertion.

Raw results: [desktop-chrome.json](hytale-0.6.5-perf/desktop-chrome.json).
For an automated launch and benchmark, run:

```sh
npm run perf:desktop:auto
```

`tools/launch-terrascape-desktop-perf.cjs` finds desktop Chrome, creates a fresh
temporary profile, uses a dynamically assigned debugging port, waits for the CDP
endpoint, and starts the benchmark with a timestamped report filename. From WSL it
automatically invokes Windows Node and Windows Chrome; Windows Node must be installed
at its standard location. Native Windows, macOS, and Linux launch paths are also
supported; this session validated the WSL-to-Windows launch path.

Use `npm run perf:desktop:launch` to open Chrome without running the benchmark.
Both commands accept `--chrome PATH`, `--url URL`, and `--out FILE` after npm's `--`.
Chrome stays open afterward; close the benchmark window before deleting its printed
temporary profile directory. Existing personal Chrome profiles are not used.

The lower-level runner `tools/run-terrascape-desktop-perf.cjs` (`npm run perf:desktop`)
can still attach to an already launched Chrome on the same OS:

```sh
node tools/run-terrascape-desktop-perf.cjs --cdp http://127.0.0.1:9222 --url "http://macbook-server.org:5960/?chunkX=0&chunkZ=0&radius=8&mapTileRadius=16" --out perf-history/desktop-chrome.json
```

The hardware browser is smooth when stationary and retains high average FPS during
streaming, with occasional 75–83 ms stalls worth investigating. This short run does
not establish long-session memory stability or an improvement over an older release.

## Server HTTP baseline

Center `(0,0)`, radius 4, 81 terrain chunks, concurrency 8. Mesh and tile cache
clears succeeded before their respective cold passes. The server remained running;
"cold" does not mean a cold JVM or unloaded world. All requests succeeded.

| Request group | Cold | Warm |
| --- | ---: | ---: |
| 81 terrain GLBs | 2,068 ms | 443 ms |
| One map-region PNG covering radius 4 | 534 ms | 24 ms |

These timings include HTTP transfer but exclude browser parsing and rendering.
The mesh passes returned different byte totals (30,218,164 cold versus 12,536,160
warm); this run alone does not establish equivalent payloads or a pure cache
speedup. Tile payloads matched at 332,297 bytes. The mesh cold pass sampled JVM
heap up to 3,563 MiB; this is total server heap, not Terrascape-only memory.
CPU/heap sampling is sparse on these short passes and is not a sustained-load test.

Raw data: [server-baseline.json](hytale-0.6.5-perf/server-baseline.json).

## Earlier software-rendered browser benchmark

Playwright runs on the Linux workstation against the MacBook server, with a
1440x900 viewport and pinned headless Chromium using SwiftShader software rendering.
These measurements do not estimate hardware-accelerated browser FPS on the MacBook.

The existing `perf:smoke` scenario uses terrain radius 4 and the default map-tile
horizon of 16. Its browser target crashed during the first flight warm-up after
2.9 minutes. No complete numeric report was produced; the performance gate did
not pass. The local failure trace is retained under
`perf-history/hytale-0.6.5-2026-09-10/default-horizon-failure/`.

The suite now accepts an explicit `features.mapTileRadius`, and complete reports
include browser version and WebGL renderer identity. `npm run perf:render` runs
the separate bounded radius-4 terrain/map scenario twice, with cold-browser-cache
(`wet`) and warm-browser-cache (`dry`) modes. These cache modes do not clear server
caches. The default-horizon scenario remains available and is not replaced by the
bounded scenario.

The bounded flight attempt also became unresponsive during camera setup and was
interrupted at 3.2 minutes. Its trace is retained alongside the first under
`bounded-flight-interrupted/`. Neither flight attempt produced usable FPS data.
This does not establish whether the cause is the application, browser automation,
software renderer, or a combination. The subsequent hardware-browser flight run above
completed successfully, so these failures are not representative of that client.

### Completed stationary rendering measurements

`npm run perf:render:stationary` isolates a stationary view with streaming disabled,
radius 4 for both terrain and map tiles, default split cosmetics and land motion,
solid water, shading enabled, and player/mob overlays disabled. Each mode samples
raw `requestAnimationFrame` intervals for at least ten seconds after loading.
Two complete browser runs passed their readiness assertions (four measurements).
That means the benchmark completed, not that rendering meets a smoothness target.

| Run / browser cache | Terrain grid load | Average FPS | Frame p95 | Longest frame |
| --- | ---: | ---: | ---: | ---: |
| 1 / cold | 11,696 ms | 6.68 | 166.7 ms | 183.4 ms |
| 1 / warm | 8,158 ms | 6.67 | 166.7 ms | 166.7 ms |
| 2 / cold | 11,421 ms | 6.52 | 183.3 ms | 183.4 ms |
| 2 / warm | 9,066 ms | 6.31 | 183.3 ms | 200.1 ms |

Each warm terrain load reported 81 cache hits, zero network chunks, and zero
failures. Both cold loads reported 81 network chunks and zero failures. The scene
reported 457 geometries, 457 materials, and 82 textures; the map layer had 81 tiles.
Grid-load durations above are the application-reported grid timings, not total
route durations (which also include the ten-second frame sample).

Browser: Chromium `148.0.7778.96`; renderer:
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.
Playwright's configured trace/video recording was enabled during these runs.

The HUD reported 20 FPS in all four samples. Inspection found that
`web/src/scene/frame-loop.ts` clamps simulation delta to 0.05 seconds and passes
that same delta to `updateFpsCounter`. The HUD and legacy benchmark `minFps`
fields therefore overstate FPS when frames take longer than 50 ms. Use the new
`stationaryFrames` values above, not those legacy fields. Fixing HUD timing and
auditing flight FPS thresholds is follow-up work; the deployed application was
not changed during this benchmark.

Raw browser results: [run 1](hytale-0.6.5-perf/browser-stationary-run-1.json),
[run 2](hytale-0.6.5-perf/browser-stationary-run-2.json).

Reproduce with:

```sh
PLAYWRIGHT_CHANNEL=chromium npm run perf:render:stationary -- --report-dir perf-history/stationary-065
PLAYWRIGHT_CHANNEL=chromium npm run perf:render -- --report-dir perf-history/flight-065
```

The immediate finding is poor software-rendered frame pacing even after successful
cache reuse. Server cache speed alone does not establish acceptable browser performance.

## Comparison limits

The earlier release's 7,936/6,838 ms terrain and 3,925/1,016 ms map-tile figures
were browser load measurements, not this server HTTP benchmark. The older stored
HTTP baseline used radius 8 and port 5961. Neither supports a percentage improvement
claim for this migration without rerunning the same workload and environment.
The earlier browser measurements also disabled cosmetics; these runs retained
the current default split cosmetics, so their load times are not directly comparable.
