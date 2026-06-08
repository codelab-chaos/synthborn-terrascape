# Performance improvement: map backdrop pan reuse

**Date:** 2026-06-05  
**Area:** Client image load + server map-region HTTP  
**Type:** Lossless (same visual output, fewer network fetches)

## Problem

When the terrain grid center moved during navigation, the map backdrop refetched a full
`/api/mapregion/...png` on **every chunk step** (~7 MB, ~3.2 s each). Two bugs compounded this:

1. **Wrong center source** — `updateMapTileLayer()` keyed the backdrop off `cameraChunk()` even
   after `loadGrid()` moved the active grid center, so backdrop and terrain could drift apart.
2. **No texture reuse** — the backdrop cache key included the view center, so a 1-chunk pan
   triggered a complete refetch of a 3552×3552 (or larger) PNG.

On the map-pan benchmark (32 cross-pattern steps, mesh radius 1), this produced **33 HTTP
fetches** and **107.8 s** total route time.

## Technique

Three coordinated changes in `map-backdrop.ts` + `app.ts`:

| Change | What it does |
|--------|----------------|
| **Grid-aligned center** | `mapBackdropCenter()` uses the active loaded grid center when it matches `activeCenterId`, so backdrop tracks terrain navigation. |
| **Oversampled anchor + pan margin** | First fetch uses `fetchRadius = displayRadius + 20` chunks. Subsequent pans reuse the texture when the view still fits inside the anchor bounds (geometry/UV update only). |
| **Lazy pixel sampler** | `getImageData()` for water tinting is deferred until `sampleMapBackdropColor()` is first called — avoids ~50 MB CPU read on every load when water tint is not needed immediately. |

Telemetry: `map_backdrop_reuse` client-log events; `mapBackdropStats()` now exposes `fetches`, `reuses`, `anchorX/Z`.

## Before / after (Mac remote, `map-tiles-focus` pan benchmark)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Total route time** | 107,800 ms | 19,437 ms | **−82% (−88.4 s)** |
| **Avg step time** | 3,246 ms | 487 ms | **−85%** |
| **Map PNG HTTP fetches** | 33 | **1** | **−97%** |
| **Texture reuses** | 37 (geometry-only) | **93** | pan reuse engaged |
| **First fetch size** | 6.9 MB (3552²) | 7.5 MB (4832²) | +0.6 MB once (margin) |
| **min FPS** | 81 | 55 | lower during single larger initial decode* |

\*The one-time larger texture is still far cheaper than 33 serial fetches. FPS recovers after the first step.

### Perf logs

- Before: `perf-history/map-pan-before/worldview-perf-run-1.json`
- After: `perf-history/map-pan-after/worldview-perf-run-1.json`

### Reproduce

```bash
cd mods/SynthTerrascape
WORLDVIEW_URL=http://<host>:5960 node tools/run-terrascape-perf.js \
  --extensive --config tools/perf-suite-map-pan.json --runs 1 --wet \
  --report-dir perf-history/map-pan-after
```

## Feature seam validated

`mapTiles=false` still disables backdrop entirely (see `mesh-only` scenario in the extensive suite).
When `mapTiles=true`, pan reuse is automatic — no UI toggle required.

## Tunables

In `map-backdrop.ts`:

- `MAP_BACKDROP_PAN_MARGIN` — extra chunk radius on fetch (default **20**). Increase for wider pan without refetch; decrease to save initial PNG size.
- `MAP_REGION_BONUS_RADIUS` — unchanged; still sets the visible halo beyond mesh radius.

## Files changed

- `src/main/resources/web/src/map-backdrop.ts`
- `src/main/resources/web/src/app.ts` (`mapBackdropCenter`)
