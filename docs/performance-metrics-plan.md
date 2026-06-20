# Terrascape Performance Metrics — Proposed Task List

Status: **proposal / not started**. This is a planning doc for end-to-end performance
instrumentation: mesh generation time, system stress, and the time/latency of delivering
both **meshes** and **map tiles** to the client, measured under repeatable **dry** and
**wet** scenarios with **pre-configured server profiles** so we can A/B settings.

## Goals

1. Attribute end-to-end latency to a stage: **generate → serialize → transmit → receive → parse → GPU upload → on-screen**.
2. Quantify **server stress** (tick impact, thread time, CPU, heap, GC) caused by serving terrain — directly tied to the 41–76 ms `[World|default] Task took` stalls seen in cold-start logs.
3. Make runs **repeatable and comparable** across config profiles via dry/wet scenarios.
4. Produce a machine-readable report so regressions are diffable run-over-run.

## Non-goals (for now)

- In-game (non-web) rendering perf.
- Long-term time-series storage / dashboards (export JSON; wire to a dashboard later).

## What already exists (extend, don't duplicate)

| Area | Existing | Gap to close |
|------|----------|--------------|
| Per-request server timing | `nanoTime` elapsed + `X-Terrascape-Map-Region-Millis` (tiles), per-mesh elapsed logging | No split of **generate vs serialize**; meshes lack a `-Millis` header |
| Payload size | `X-Terrascape-Columns/Vertices/Triangles` (mesh), `-Chunks/-Tile-Size` (tile) | No byte size / compression ratio header |
| Cache state | `X-Terrascape-Cache`, `X-Terrascape-Map-Region-Cache` | Not aggregated into run summary |
| Client telemetry | `/api/client-log`, `perfTelemetry` flag, `features.clientTelemetry` | No per-asset receive/parse/GPU timings |
| Harness | `run-terrascape-perf.js` `--dry/--wet/--both`, `--clear-server-cache`, 10 suites | No config-profile sweep, no stage-attribution report |
| Config | `TerrascapeConfig` (Mesh/Cache/Features/MapView) | No named **metrics profiles** |

## Metric taxonomy (the dimensions to capture)

**Server — mesh generation**
- chunk gen time (ms), serialization time (ms), output bytes, vertices/triangles, cache hit/miss, batch wait time, generator thread vs world thread time.

**Server — tile generation**
- region render time (ms), tile count, tile size, output bytes, cache hit/miss.

**Server — stress**
- world-tick time delta while serving, `Task took` warn count, worker-thread busy time, heap used / GC count+pause, CPU load, in-flight request depth, queue depth.

**Delivery / network**
- TTFB, transfer time, bytes on wire, concurrency (`loadSlots`), requests/sec, ready/sec.

**Client**
- receive→decode→parse time, GPU upload time, frame budget impact (jank), time-to-first-chunk, time-to-full-grid, FPS/frame-ms during load.

## Data format & schema (the keystone)

The format is the feature. Everything else exists to populate a dataset we can load into a
graph and read **latency per setting, per feature, over time** — i.e. a benchmark. Design
the schema first; instrumentation and harness conform to it.

### Principles

1. **Tidy / long, one observation per row.** Each row is a single metric value for a single
   (benchmark, feature, setting, scenario, stage, metric, stat). This pivots trivially into
   any chart — `x = setting, series = feature` for a sweep, or `x = ts, series = feature`
   for trend-over-time — without reshaping. Wide tables do not; avoid them as the source of truth.
2. **Append-only time series.** Every run appends rows to a stable series file
   (`perf-history/series.ndjson`, newline-delimited JSON). Per-run pretty JSON stays for
   humans; the NDJSON series is what graphs/CI read. Old rows are never rewritten.
3. **Self-describing rows.** Every row carries its units, the statistic (`p50/p95/p99/mean`),
   and the sample count. No bare numbers, no "ms implied elsewhere."
4. **Stable dimension vocabularies.** `feature`, `setting`, `stage`, `metric` come from fixed
   enumerations so a series stays continuous across months. Renames go through a schema bump,
   not an in-place edit.
5. **Provenance on every row.** `gitSha`, `profile`, `configHash`, host, server/harness
   versions, `schema`. This is what makes two runs comparable (or correctly *incomparable*).
6. **Versioned schema.** A `schema` tag (`terrascape.perf.v1`) lets the format evolve without
   silently breaking historical graphs.

### Canonical row (NDJSON)

```json
{
  "schema": "terrascape.perf.v1",
  "benchmark": "grid-load",
  "runId": "2026-06-19T03-21-05Z-9e247af",
  "ts": "2026-06-19T03:21:05.123Z",
  "scenario": "wet",
  "feature": "cosmeticBlocks",
  "setting": "split",
  "stage": "mesh.generate",
  "metric": "latency",
  "unit": "ms",
  "stat": "p95",
  "value": 41.6,
  "samples": 120,
  "provenance": {
    "gitSha": "9e247af",
    "dirty": true,
    "profile": "baseline",
    "serverVersion": "0.1.0",
    "harnessVersion": "1.0.0",
    "host": "macbook-server.org",
    "configHash": "ab12cd34"
  }
}
```

### Dimensions vs measures

| Role | Fields | Purpose |
|------|--------|---------|
| **Identity** | `schema`, `benchmark`, `runId`, `ts` | Group rows into a run; order runs over time |
| **Facets (dimensions)** | `scenario`, `feature`, `setting`, `stage`, `metric`, `stat` | The GROUP BY / chart axes & series |
| **Measure** | `value`, `unit`, `samples` | The number being plotted, self-described |
| **Provenance** | `provenance.*` | Comparability and filtering across time |

### Stage vocabulary (fixed enum)

`mesh.generate`, `mesh.serialize`, `mesh.transmit`, `mesh.parse`, `mesh.gpu_upload`,
`tile.generate`, `tile.serialize`, `tile.transmit`, `tile.parse`,
`server.tick_impact`, `server.heap`, `server.gc`, `client.frame` — so a single benchmark row
set reconstructs the full `generate → … → on-screen` waterfall **and** server stress, all keyed
the same way.

### How it maps to graphs

- **Latency per setting, per feature**: filter `stage`/`metric`, `x = setting`, `series = feature`, `y = value` (one panel per scenario).
- **Trend over time / regression**: filter `feature`+`setting`+`stage`, `x = ts` (ordered by run), `series = profile`.
- **Stage waterfall**: one run, stacked `value` across `stage` for a given feature/setting.
- **Wet vs dry delta**: same axes, `series = scenario`.

CSV is a flatten of these same columns for spreadsheet/BI tools; NDJSON stays canonical.

### Migration from today

The current `perf-history/terrascape-perf-<runId>.json` (scenario + thresholds) and
`feature-isolation-analysis.json` (baseline-vs-feature deltas) become **derived views**:
keep emitting them for the existing regression gate, but also project each run into the
tidy `series.ndjson`. The feature-isolation delta is just two rows subtracted — so the new
format generalizes it to every feature × setting, not just the isolation suite.

## Scenarios

- **Wet start** — server cache cleared (`/terrascape clearcache`) + browser mesh cache cleared. Measures true cold generation + delivery cost. (Harness `--wet` already clears browser cache; extend to always pair with server clear.)
- **Dry start** — warm server + warm browser cache. Measures steady-state / cache-hit delivery.
- **Both** — wet then dry in one session (default), to capture the cold→warm delta.
- Each scenario runs against each **config profile** (below) so settings are comparable.

## Proposed config profiles (pre-configured metrics features)

Add named profiles selectable at startup (`-Dterrascape.metrics.profile=<name>` or a
`metrics.profile` key) that snapshot a coherent set of `Mesh`/`Cache`/`MapView`/`Features`
settings. Strawman set:

- `baseline` — current shipping defaults.
- `high-detail` — max cosmetic/visual detail, larger generate radius.
- `low-latency` — smaller batches, higher spawn budget, aggressive caching.
- `stress` — large radius + high detail + cache disabled (worst case for the server thread).
- `cache-off` — isolates generation cost from cache effects.

Profiles are data (a JSON/properties map), resolved into `TerrascapeConfig` — single source
of truth, no scattered flags.

## Workstreams & tasks

### 1. Server instrumentation
- [ ] Add a `MeshTimings` capture around generation: split **generate** vs **serialize** ms; emit as `X-Terrascape-Mesh-Gen-Millis` / `X-Terrascape-Mesh-Serialize-Millis` + payload byte size header.
- [ ] Mirror split timing for tiles (`X-Terrascape-Map-Region-Gen-Millis` etc.) + byte size.
- [ ] Add a lightweight server-stress sampler: world-tick delta, `Task took` warn counter, heap/GC, CPU, in-flight depth — exposed via an admin `/api/metrics` snapshot endpoint (token-gated, `features` flag).
- [ ] Distinguish work running on the **world thread** vs generator pool (the stall source).

### 2. Client instrumentation
- [ ] Behind `perfTelemetry`, record per-asset receive/parse/GPU-upload timings for meshes and tiles; fold into existing `terrain-stream` stats (`maxReadyWaitMs`, `readyPerSec`, …).
- [ ] Emit a structured `perf_summary` client-log event at end-of-load (time-to-first-chunk, time-to-full-grid, jank, FPS/frame-ms percentiles).
- [ ] Correlate client asset records with server request IDs (add a request-id header) for true end-to-end stage attribution.

### 3. Config profiles
- [ ] Define profile schema + loader; resolve `metrics.profile` into `TerrascapeConfig`.
- [ ] Ship the strawman profiles above as data files; document each in this folder.
- [ ] Allow harness to select profile per run.

### 4. Harness & scenarios
- [ ] Extend `run-terrascape-perf.js`: `--profile <name>` and `--profiles <a,b,c>` sweep; ensure `--wet` pairs server + browser cache clears.
- [ ] Add a `perf-suite-metrics.json` covering wet/dry × profiles.
- [ ] Collect server headers + `/api/metrics` snapshots + client `perf_summary` into one run record.

### 5. Reporting & data format
- [ ] **Lock the schema first** (`terrascape.perf.v1`): the canonical row, the dimension enums (`feature`/`setting`/`stage`/`metric`/`stat`), and units. All other workstreams emit to it.
- [ ] Add a `series.ndjson` appender: every run projects its measures into tidy rows (append-only).
- [ ] Keep emitting the current per-run JSON + `feature-isolation-analysis.json` as **derived views** off the same data, preserving the existing regression gate.
- [ ] Provide a CSV export (flatten of the NDJSON columns) for spreadsheet/BI tools.
- [ ] Add a diff/trend mode: compare two runs / two profiles / over-time on a fixed (feature, setting, stage, metric).
- [ ] Commit documented **baseline rows** per profile here once first measured, as the reference series.
- [x] **Reporting page** — [`tools/metrics-report.html`](../tools/metrics-report.html): a single
      self-contained HTML file (no backend, no dependencies, works over `file://`). Load one or more
      `perf-history/baseline-*.json` via picker or drag-drop; renders per-run bar charts
      (time-to-deliver, server CPU peak, heap peak) for mesh/tile × cold/warm plus a summary table.
      Next: trend-across-runs and reading the tidy `series.ndjson` once that lands.

## Suggested milestones

0. **M0 — Schema**: lock `terrascape.perf.v1`, the dimension enums, and the `series.ndjson`
   appender. Nothing else starts emitting until the row shape is fixed. (The format is the contract.)
1. **M1 — Visibility**: server split-timing headers + `/api/metrics` snapshot + client `perf_summary`, all written as v1 rows. (Answers "where does the time go?")
2. **M2 — Repeatability**: config profiles + harness profile sweep + wet/dry pairing, one row set per feature × setting × scenario × profile.
3. **M3 — Reporting**: trend/diff views + CSV export + documented baseline series.

## Open questions

- Request-id correlation: add a header, or reuse an existing chunk/tile key?
- Is `/api/metrics` acceptable always-on (token-gated), or only when a metrics feature flag is set?
- Do we need OS-level stress (CPU/mem) from inside the JVM, or sampled externally during harness runs?
- Where do baseline numbers live long-term — committed here, or an external store?
