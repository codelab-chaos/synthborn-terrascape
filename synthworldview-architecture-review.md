# SynthWorldview Architecture and Performance Review

Date: 2026-06-05

Goal: maximize visible voxel terrain first, then map tiles, while preserving a usable camera, stable FPS, and the existing chunk loading tween with a faster feel.

## Executive Summary

SynthWorldview has the right core shape: server-side terrain sampling and mesh generation, client-side Three.js rendering, disk and memory caches on both sides, and smoke/perf tooling that exercises the real deployed app. The biggest limit is not one bad algorithm. It is ownership drift: the two largest files have become runtime coordinators, service layers, data stores, debug surfaces, and UI controllers at the same time.

The highest-value work is to split the pipeline by ownership and make the loading path explicitly staged:

1. Decide desired chunks/tiles.
2. Read browser cache in parallel.
3. Fetch missing data in bounded parallel batches.
4. Decode/promote render objects under a frame budget.
5. Animate only the visual promotion, not the whole network/decode path.

That keeps the current tween, but makes the scene fill faster because data fetch/decode no longer waits on one chunk at a time.

## Current Architecture

### Backend

Main files:

- `SynthWorldviewPlugin.java`: plugin lifecycle, settings, command registration, web server construction.
- `WorldviewWebServer.java`: HTTP routing, static web serving, terrain API, map tile API, map region API, player API, mob API, entity SSE stream, avatars, asset/icon lookup, JSON parsing, memory caches, disk caches, metrics, and debug formatting.
- `TerrainSampler.java`: chunk-to-column/detail sampling.
- `TerrainMesher.java`: column/detail-to-surface mesh generation.
- `GltfWriter.java`: GLB serialization.
- `MapTilePngEncoder.java`: PNG encoding for map tiles.
- `NpcRoleIndex.java`: NPC role indexing.

The backend terrain path is:

`/api/terrain/{world}/{chunkX}/{chunkZ}.glb` -> cache lookup -> `world.execute()` sampling -> async meshing/GLB writing -> cache write -> HTTP response.

The map tile path is:

`/api/terrain/{world}/{chunkX}/{chunkZ}.map.png` -> disk cache -> world map manager tile fetch -> PNG encode -> disk cache -> HTTP response.

There is also a batch endpoint, `/api/terrain/batch`, but the current browser path does not appear to use it for terrain or map tiles.

### Frontend

Main files:

- `app.ts` is the central runtime. It owns scene setup, renderer, camera, input, HUD controls, world loading, terrain streaming, map tile calls, entity polling/SSE, markers, metrics, debug API, view persistence, and animation.
- `map-backdrop.ts` owns map tile loading, texture creation, one-mesh-per-tile installation, map tile cache use, tile motion, debug probes, and pixel sampling for water tint.
- `mesh-cache.ts` owns IndexedDB terrain and map tile byte caches.
- `chunk-land-motion.ts` owns the voxel chunk rise/sink tween.
- `frame-jank.ts` records frame hitches.
- `lighting.ts`, `water.ts`, `players.ts`, `mob-card.ts`, `postprocessing.ts`, and `time-ribbon.ts` own specialized render features.

The frontend terrain path is:

`loadGrid()` -> compute needed chunks -> read IndexedDB per chunk -> fetch one missing GLB at a time -> parse GLB -> create chunk object -> apply water/lighting/debug/shadow -> add wrapper -> start rise tween.

The frontend map tile path is:

`loadMapTilesForKeys()` -> read IndexedDB per tile -> fetch one missing PNG at a time -> decode via `TextureLoader` object URL -> create tile mesh -> add to scene -> optional rise tween.

## Ownership and Coupling Issues

### 1. `WorldviewWebServer.java` has too many reasons to change

`WorldviewWebServer.java` is about 3,644 lines and owns unrelated concerns:

- HTTP routing and response helpers.
- Static file serving.
- Terrain mesh cache and generation orchestration.
- Map region and map tile cache/generation.
- Player snapshots and avatar proxy/cache.
- Mob snapshot scanning and debug summaries.
- SSE entity streaming.
- Manual JSON body parsing.
- Asset zip/icon lookup.

This creates risky coupling. For example, changing mob debug logic and changing terrain cache behavior require editing the same class and sharing the same executor/counter/logging context. It also makes the performance model harder to reason about because route-level concerns and generation concerns are interleaved.

Recommendation:

- Extract `TerrainService`: terrain request normalization, memory/disk cache, pending request coalescing, generation permits, batch generation.
- Extract `MapTileService`: map tile memory/disk cache, pending tile coalescing, map manager access, PNG encoding.
- Extract `EntityFeedService`: player snapshots, mob snapshots, SSE JSON generation.
- Extract `StaticAssetService`: static web resources, generated mob icons, player avatars.
- Leave `WorldviewWebServer` as a thin router that validates method/path and delegates.

This is a lossless simplification if done by moving code without changing behavior. It will make the later performance changes much safer.

### 2. `app.ts` is the frontend global runtime, not an app shell

`app.ts` is about 2,395 lines and contains:

- Scene and renderer construction.
- Terrain loading and cache policy.
- Map tile coordination.
- UI event wiring.
- Input and camera movement.
- Player/mob polling and entity stream management.
- Marker and HUD updates.
- Render loop.
- Debug API.
- View state persistence.

The result is hidden coupling through module-global state: `worldSelect`, `loadedChunks`, `loadGeneration`, `activeCenterId`, `mapTilesInput`, `camera`, and several timers are read by many functions. The recent `streamAnchor` initialization bug came from exactly this kind of temporal coupling inside a long function.

Recommendation:

- Extract a `TerrainStreamController` that owns desired center/radius, generation id, loaded chunk registry, IndexedDB terrain cache calls, network fetch policy, and promotion queue.
- Extract a `MapTileController` that owns desired tile coverage, cache/network policy, and tile promotion queue.
- Extract `EntityController` for players, mobs, polling, SSE, and marker update inputs.
- Keep `app.ts` as composition: construct renderer, controllers, controls, and event bindings.

The important boundary is that render modules should not read DOM controls directly. They should receive a small options object from app/controller state.

### 3. Map tile architecture has split direction

`map-backdrop.ts` currently creates one `THREE.Mesh` per tile. Separately, `library/map-tile-instancer.ts` implements an instanced map tile layer, but no current code imports it.

That means the project has two competing map tile models:

- Current runtime: individual mesh per tile, easy per-tile texture, more scene objects.
- Stranded helper: one instanced mesh over one larger texture, lower draw/object overhead, unused.

Recommendation:

- Decide explicitly between per-tile textures and region texture instancing.
- For "as many voxels and then tiles on screen as fast as possible", prefer a hybrid:
  - Use a reusable map region texture for the far/horizon tile floor.
  - Use per-chunk tile PNGs only for near tiles that need independent caching or progressive fill.
  - Or revive `map-tile-instancer.ts` for one layer per map-region texture and retire the per-tile mesh path for the broad backdrop.

This is especially important at large radii because object count and texture count will grow as `(2r + 1)^2`.

### 4. Backend batch endpoint exists but client path does not use it

The server has `/api/terrain/batch` and supports `asset:"mesh"` and map batch behavior, but `loadGrid()` currently uses single GLB requests through `loadChunk()` and `loadMapTilesForKeys()` uses single PNG requests through `loadMapTilePng()`.

Recommendation:

- Either wire the client to batch endpoints or remove/deprioritize batch code.
- Prefer wiring it, but avoid base64 JSON for large payloads as the final form. Base64 inflates bytes by roughly 33% and forces additional JS string allocation.
- Short term: use the existing batch endpoint for small bounded groups if it beats HTTP overhead in practice.
- Medium term: add a binary batch format or multipart response for GLBs/PNGs.

### 5. Frame-budget ownership is implicit

`frame-jank.ts` records hitches but does not control workload. `yieldToMain()` yields after each chunk, but each chunk still performs the full fetch/parse/promotion sequence serially. The animation loop always runs all update systems every frame.

Recommendation:

- Introduce a `FrameBudgetScheduler` that has explicit queues:
  - network completion queue
  - parse/decode queue
  - scene promotion queue
  - disposal queue
- Process promotion/disposal until a budget is reached, for example 3-6 ms per frame.
- Feed `frame-jank` stats back into budget size. If p95 frame time rises, reduce promotions per frame; if stable, increase.

This keeps FPS usable while allowing more network and cache work to happen concurrently.

## Performance Findings

### 1. Terrain loading is serialized on the client

`loadGrid()` loops over missing chunks and awaits each chunk before starting the next. That means radius 10 can require up to 441 sequential cache/fetch/parse/promote operations.

Lossless improvement:

- Keep sorting by player distance.
- Start N cache reads at a time.
- Start N network requests at a time for misses.
- Parse/promote results through a frame-budgeted queue.

Suggested initial limits:

- `cacheReadConcurrency = 16`
- `networkConcurrency = 4` for single chunk requests
- `promotionBudgetMs = 4`
- `maxPromotionsPerFrame = 2` for terrain chunks, adaptive upward when frame time is stable

The visual result stays identical; chunks simply become ready sooner and land through the same tween.

### 2. Server generation is globally limited to one chunk

`MAX_CONCURRENT_GENERATIONS = 1` protects the Hytale world/runtime, but it also makes the server a single-lane bottleneck. Sampling must happen on `world.execute()`, but meshing and GLB writing are pure CPU work after the snapshot is captured.

Lossless improvement:

- Keep only snapshot reads serialized if required by the SDK.
- Increase CPU meshing/GLB concurrency after snapshots are captured.
- Add separate semaphores:
  - `snapshotPermits = 1`
  - `meshPermits = availableProcessors / 2`, capped conservatively
  - `encodePermits = meshPermits`

Current code already starts meshing in `CompletableFuture.runAsync`, but the single generation permit spans sampling, meshing, GLB writing, cache update, and response completion. Narrow the permit to only the unsafe world access section if testing confirms safety.

### 3. GLB is a convenient interchange format, but expensive for chunk streaming

For every terrain chunk:

- Server allocates boxed `List<Float>` and `List<Integer>`.
- Server converts to primitive arrays.
- Server writes GLB buffers.
- Browser downloads bytes.
- Browser `GLTFLoader` parses GLB into Three.js objects/materials.
- App traverses and applies water/lighting/debug/shadow.

Lossless improvement options:

- Quick: replace boxed lists in `TerrainMesher.MeshBuilder` with primitive growable arrays.
- Quick: cache shared materials in the client instead of accepting per-GLB material instances and then mutating every loaded object.
- Medium: emit a custom binary chunk format with typed arrays for positions, normals, colors, indices, and part ranges. Build `BufferGeometry` directly in the browser.
- Medium: decode custom binary in a Web Worker and transfer typed arrays to the main thread.

The custom binary path is the largest simplification for performance: it removes GLTF parse overhead and gives the app direct ownership over material reuse. It is lossless if the same attributes and indices are preserved.

### 4. Terrain meshing can reduce geometry further without changing visible output

Current meshing emits one top quad per column and side quads when neighboring height is lower. That is already much better than full voxel cubes, but it does not greedily merge coplanar faces with the same material/color/shade.

Lossless improvement:

- Greedy-merge top quads by equal or close-enough vertex color/shade.
- Greedy-merge vertical side strips by equal color/shade and height range.
- Keep water/detail as separate parts.

This reduces vertices, indices, GLB/custom-binary size, parse time, GPU memory, and draw preparation. It preserves visual output if merge criteria respect color/shade boundaries.

### 5. Map tile loading is also serialized

`loadMapTilesForKeys()` performs IndexedDB reads sequentially, then network fetches sequentially, then texture installs sequentially. This keeps it simple but slow at large radii.

Lossless improvement:

- Use bounded concurrency for cache reads and network tile requests.
- Decode textures concurrently up to a small limit.
- Promote tile meshes/textures under a frame budget.
- Keep the rise tween, but use a shorter duration and start it only when the texture is ready.

Suggested initial tile settings:

- `tileCacheReadConcurrency = 32`
- `tileNetworkConcurrency = 6`
- `tileDecodeConcurrency = 2`
- `tileRiseMs = 120-160` instead of 200
- `tilePromoteBudgetMs = 3`

### 6. Chunk tween can feel faster without removing it

Current chunk load rise is 310 ms from `-48` to `0`. At high fill rates, this can make the app feel slower even when data is ready.

Lossless UX improvement:

- Shorten terrain rise to 160-220 ms.
- Use a distance-sensitive start offset:
  - near chunks: `-24`, 180 ms
  - far chunks: `-48`, 140 ms
- Stagger only by promotion budget, not by artificial delay.
- Keep unload sink at 80-100 ms.

The important point: network/decode should run ahead of animation. The tween should be the final reveal, not the pacing mechanism.

### 7. Per-frame work is broad

Every frame currently updates metrics, coordinates, markers, water, empty grid, placeholders, FPS counter, auto-stream checks, controls, postprocessing, and view-state maybe-save checks.

Lossless improvement:

- Throttle `updateMetrics()` to 4-10 Hz unless a debug panel is open or a load event completes.
- Throttle coordinate DOM updates to 10 Hz.
- Run marker DOM/card layout updates only when entity data changes or camera distance bucket changes.
- Split render-only updates from DOM updates.

DOM text updates and metric scans are small individually, but they become noticeable during load hitches.

### 8. Cache writes are fire-and-forget but not backpressured

`writeTerrainCache()` and `writeMapTileCache()` are called without awaiting in hot paths. That avoids blocking, but under heavy load it can create unbounded IndexedDB write pressure.

Lossless improvement:

- Add a cache write queue with dedupe by key and low priority.
- Drop superseded writes for older format/generation.
- Pause writes while frame hitches exceed threshold.

## Recommended Target Architecture

### Backend Package Shape

Proposed Java package boundaries:

```text
com.codelabchaos.synthworldview
  SynthWorldviewPlugin
  commands/
  terrain/
    TerrainSampler
    TerrainMesher
    TerrainEncoder
    TerrainService
    TerrainCache
  map/
    MapTileService
    MapRegionService
    MapTilePngEncoder
  entities/
    PlayerSnapshotService
    MobSnapshotService
    EntityStreamService
    NpcRoleIndex
  web/
    WorldviewWebServer
    RouteHandlers
    HttpResponses
    RequestParsers
    StaticResourceHandler
```

`WorldviewWebServer` should know about routes and services, but not how to scan mobs, encode GLB, parse batch JSON with regexes, or evict terrain caches.

### Frontend Module Shape

Proposed TypeScript boundaries:

```text
src/
  app.ts                         composition only
  runtime/
    worldview-state.ts           selected world, center, radius, feature flags
    frame-budget.ts              cooperative queues
  terrain/
    terrain-controller.ts        desired chunks, cache/network/decode/promote
    terrain-api.ts               fetch single/batch terrain
    terrain-scene.ts             add/remove Three objects, material application
    terrain-cache.ts             wraps mesh-cache terrain APIs
  map/
    map-tile-controller.ts       desired tiles, cache/network/decode/promote
    map-tile-api.ts
    map-tile-scene.ts
  entities/
    entity-controller.ts
    entity-api.ts
    player-markers.ts
    mob-markers.ts
  render/
    scene-setup.ts
    camera-controls.ts
    lighting.ts
    water.ts
    postprocessing.ts
  ui/
    dom.ts
    hud-controller.ts
    view-state.ts
```

This makes the hot path testable without driving the full DOM app.

## Prioritized Work Plan

### Phase 1: Lossless Quick Wins

1. Shorten chunk rise duration from 310 ms to about 190 ms and map tile rise from 200 ms to about 140 ms.
2. Add bounded parallel terrain loading on the client while keeping frame-budgeted promotion.
3. Add bounded parallel map tile cache reads/fetches/decodes.
4. Throttle per-frame DOM metrics/coordinate updates.
5. Remove or wire `map-tile-instancer.ts`; do not leave a dead performance path.
6. Add perf counters for:
   - cache read queue time
   - network wait time
   - parse/decode time
   - scene promotion time
   - tween active count

### Phase 2: Ownership Refactor

1. Extract `TerrainStreamController` from `app.ts`.
2. Extract `MapTileController` from `map-backdrop.ts` and `app.ts`.
3. Extract backend `TerrainService` from `WorldviewWebServer`.
4. Extract backend `MapTileService`.
5. Add focused tests around controller scheduling and service cache/coalescing.

Move code first, change behavior second.

### Phase 3: Data Path Upgrade

1. Replace boxed mesh builder storage with primitive growable arrays.
2. Add direct binary terrain chunk endpoint behind a feature flag.
3. Add client direct `BufferGeometry` builder.
4. Move terrain decode/build to a Web Worker.
5. Add greedy meshing for top and side quads.
6. Consider binary batch responses after single custom binary path is stable.

### Phase 4: Map Tile Scale

1. Decide between per-tile mesh and instanced region layer.
2. Prefer region texture for broad backdrop plus near per-tile progressive fills.
3. Add tile atlas/region cache keys so one pan does not create hundreds of texture objects.
4. Keep lazy pixel sampling for water tint.

## Specific Recommendations

### Terrain Loading Controller Contract

The controller should expose:

```ts
setTarget({ world, centerX, centerZ, radius, streamLoad, anchorChunk })
tick(frameBudget)
stats()
dispose()
```

Internally:

- Maintain `desiredIds`, `retainedIds`, `loadedIds`, `loadingIds`.
- Start cache/network work up to concurrency limits.
- Push completed decoded chunks into a `pendingPromotion` queue.
- Promote chunks only under frame budget.
- Call existing `chunkLandMotion.beginLoad()` during promotion.

### Backend Terrain Service Contract

The service should expose:

```java
TerrainResult getTerrain(TerrainRequest request)
List<BatchTerrainResult> getTerrainBatch(BatchTerrainRequest request)
MemoryCacheStats clearMemoryCache()
TerrainServiceMetrics metrics()
```

Internally:

- Own pending request coalescing.
- Own memory/disk caches.
- Own snapshot/mesh/encode permits.
- Return data; never write HTTP responses.

### FPS Guardrails

Use these as initial perf gates:

- During fly movement: p95 frame time below 33 ms.
- During grid load: no more than 2 severe hitches over 100 ms for radius 10.
- Terrain promotion: max 4 ms per frame.
- Tile promotion: max 3 ms per frame.
- First visible chunk: under 500 ms on warm cache, under 1500 ms wet.
- First visible map tile: under 750 ms warm cache, under 2000 ms wet.

These are stricter and more useful than only total route time.

## Risks and Tradeoffs

- Increasing network concurrency can expose server bottlenecks. Keep server permits conservative and use client backoff when RCON/log metrics show queueing.
- Binary terrain format improves speed but reduces inspectability compared with GLB. Keep GLB endpoint as a debug/export path.
- Greedy meshing can subtly change lighting if it merges across vertex shade differences. Start with exact color/shade matching.
- Moving decode to workers requires careful transferable ownership and material creation on the main thread.
- Refactoring `WorldviewWebServer` should be mechanical first; mixing extraction with behavior changes will be difficult to debug.

## Recommended Next PR

The next PR should be narrow and measurable:

1. Add a `FrameBudgetScheduler`.
2. Convert client terrain loading from serial to bounded parallel fetch/parse with budgeted scene promotion.
3. Shorten `LOAD_RISE_MS` to 190 ms.
4. Add debug stats for queue lengths and promotion time.
5. Run:
   - `npm.cmd test`
   - `npm.cmd run perf:dry`
   - `npm.cmd run perf:wet` if the remote server is available

Expected outcome: same visuals, same tween, faster first-fill and full-fill times, with FPS protected by promotion budgeting.
