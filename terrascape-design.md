# SynthTerrascape Proposed Design

SynthTerrascape is a proposed Hytale server mod for a live, navigable 3D view of a
running world. It takes the useful shape of EasyWebMap - embedded web server, chunk
addressing, cache-backed asset generation, player tracking, and browser rendering - and
changes the streamed asset from a 2D PNG tile to a conservative 3D terrain mesh.

The MVP goal is not "recreate the Hytale renderer in the browser." The goal is to prove
that a server mod can expose a safe, bounded, cacheable mesh stream that Three.js can
load around a camera. Once that loop exists, visual fidelity can improve in controlled
steps.

## Product Shape

Players and operators open a browser page served by the mod and see a 3D world overview.
They can pan, orbit, fly, switch worlds, see online players, and inspect the explored
terrain around loaded or previously explored chunks. The first version can look like a
colored relief model rather than a faithful game screenshot.

The useful first experience:

- Open `http://server:port/` and see a Three.js scene.
- Select a world.
- Fly/orbit around chunk-based terrain.
- See live player markers in the same coordinate space.
- Load more terrain as the camera moves.
- Avoid generating or exposing unexplored chunks by default.

## Non-Goals For MVP

- Full visual parity with Hytale.
- Caves, interiors, overhangs, bridges, and custom block models.
- Texture atlas generation.
- Entity rendering beyond player markers.
- Editing terrain from the web view.
- Public internet hardening beyond basic config, CORS discipline, and explored-chunk
  guards.

## Design Principles

- Treat 3D chunks like map tiles: addressable, cacheable, versioned, and disposable.
- Touch Hytale world/chunk data only on safe world-owned execution paths.
- Copy SDK data into immutable snapshots before worker-thread mesh generation.
- Prefer a useful conservative mesh over a slow perfect mesh.
- Preserve EasyWebMap's abuse guards: explored chunks only, request batching, generation
  concurrency limits, stale cache reuse, and world allowlists.
- Keep the browser GPU budget explicit. Every loaded chunk must be unloadable.

## Reference Architecture

```text
Browser Three.js client
        |
        | GET static app, GET worlds, WS players, POST mesh batch
        v
Netty web server inside SynthTerrascape
        |
        +--> PlayerTracker
        |
        +--> TerrainManager
                |
                +--> explored chunk index guard
                +--> memory mesh cache
                +--> disk mesh cache
                +--> pending request coalescing
                +--> terrain snapshotter
                +--> mesh worker executor
                +--> GLB writer
```

The mod can start by copying the EasyWebMap server structure:

- `SynthTerrascapePlugin`
- `WorldviewConfig`
- `WebServer`
- `HttpRequestHandler`
- `StaticHandler`
- `PlayerHandler`
- `WebSocketHandler`
- `PlayerTracker`
- `TerrainManager`
- `TerrainSnapshotter`
- `TerrainMesher`
- `GltfWriter`
- `MeshCache`
- `DiskMeshCache`

## SDK Access Strategy

The SDK references suggest the MVP can be built without a literal Hytale
`getTerrainAsync()` API:

- `World` implements chunk accessor behavior and exposes `getChunkAsync(long)`,
  `getNonTickingChunkAsync(long)`, `getChunkIfLoaded(long)`, and `getChunkStore()`.
- `WorldChunk` exposes block and terrain-oriented reads such as `getBlock`, `getHeight`,
  `getFluidId`, `getRotationIndex`, `getTint`, and `getBlockType`.
- `ChunkStore` and `IChunkLoader.getIndexes()` expose chunk indexes, which can mirror
  EasyWebMap's explored/on-disk guard.
- `BlockType` exposes visual hints such as ID, material, opacity, textures, draw type,
  computed color, tint metadata, custom model names, and flags.

The first implementation should wrap those APIs as if they were a `getTerrainAsync()`
surface:

```java
CompletableFuture<byte[]> getTerrainGlbAsync(String world, int lod, int chunkX, int chunkZ)
```

Internally, that method should:

1. Validate the world is enabled.
2. Check the explored/on-disk chunk index.
3. Check memory cache.
4. Reuse any pending future for the same mesh key.
5. Check disk cache and freshness.
6. Snapshot chunk terrain data.
7. Generate a mesh from the snapshot.
8. Encode GLB bytes.
9. Cache and return the result.

## Terrain Snapshot

The snapshot is the safety boundary between Hytale world state and our worker code. It
should contain only plain values:

```java
record TerrainSnapshot(
    String worldName,
    int chunkX,
    int chunkZ,
    int lod,
    int step,
    TerrainColumn[] columns,
    long revision,
    long createdAtMs
) {}

record TerrainColumn(
    int localX,
    int localZ,
    int y,
    int blockId,
    String blockKey,
    int argb,
    int fluidId,
    int rotationIndex
) {}
```

For the MVP, a column is enough. Use `WorldChunk.getHeight(localX, localZ)` to locate the
top block, then capture the top block ID and visual hints. This produces a heightfield
mesh. It is intentionally less complete than a voxel face mesh, but it proves the
pipeline.

The next snapshot tier can add a bounded exposed-face scan:

- start at the heightmap top
- scan down N blocks, such as 16 or 32
- emit faces that touch air or lower neighbor columns
- stop before generating full cave/interior geometry

## Mesh Generation

MVP meshing should be heightfield-first:

- one top quad per sampled column
- side quads where adjacent columns are lower
- no bottom faces
- vertex colors from block type computed color, biome tint, or fallback palette
- one material using vertex colors

LOD can be represented by sample step:

| LOD | Step | Meaning |
|---|---:|---|
| 0 | 1 | 32 by 32 samples per chunk |
| 1 | 2 | 16 by 16 samples per chunk |
| 2 | 4 | 8 by 8 samples per chunk |
| 3 | 8 | 4 by 4 samples per chunk |

This is cheap, scalable, and produces region meshes naturally. Later versions can add
greedy meshing, transparent water primitives, texture atlas UVs, lighting, and fuller
face-culling.

## GLB Encoding

Use GLB as the transport format for MVP because Three.js can load it directly and the
format is well understood.

The generated GLB can be tiny:

- one scene
- one node
- one mesh
- one primitive
- attributes: `POSITION`, `NORMAL`, `COLOR_0`
- indices: unsigned int
- one material using vertex colors

Texture coordinates and images can wait. A single vertex-colored material keeps the
first renderer simple and avoids asset extraction questions.

## HTTP And WebSocket API

Minimum API:

```text
GET  /
GET  /api/worlds
GET  /api/players/{world}
GET  /api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb
POST /api/terrain/batch
WS   /ws
```

`GET /api/terrain/...glb` is easiest for early Three.js loading. `POST
/api/terrain/batch` becomes important as soon as camera movement requests many chunks.

Batch request:

```json
{
  "world": "world",
  "requests": [
    { "lod": 0, "chunkX": 12, "chunkZ": -4 }
  ]
}
```

Prototype batch response can be JSON with base64 GLBs:

```json
{
  "meshes": {
    "0/12/-4": {
      "contentType": "model/gltf-binary",
      "revision": 1,
      "data": "base64..."
    }
  },
  "empty": [],
  "unexplored": []
}
```

Later, move to binary batching or WebSocket binary frames.

## Browser Client

The browser app should be the actual tool, not a landing page:

- full-viewport Three.js canvas
- small world selector
- connection status
- player list
- coordinate readout
- debug toggles for chunk bounds, LOD, and cache state

Core client modules:

- `WorldviewApp`: bootstraps renderer, scene, camera, controls.
- `ChunkStreamer`: computes visible chunk set and desired LOD.
- `TerrainClient`: fetches GLBs and handles batch requests.
- `ChunkScene`: owns loaded chunk objects and disposal.
- `PlayerLayer`: renders live player markers from WebSocket state.
- `Hud`: world selector, coordinates, status, optional debug metrics.

Chunk lifecycle:

1. Camera moves.
2. Compute desired chunk keys around camera target.
3. Prioritize near/frustum chunks.
4. Fetch missing GLBs.
5. Parse with `GLTFLoader`.
6. Place object at `chunkX * 32, 0, chunkZ * 32`.
7. Dispose chunks outside the retain radius.

## Caching And Freshness

Use the EasyWebMap pattern:

- memory cache keyed by `{world}/{lod}/{chunkX}/{chunkZ}`
- pending request map to coalesce duplicate requests
- disk cache under plugin data directory
- cache age check
- player-nearby refresh guard
- generation semaphore

MVP does not need perfect dirty-chunk invalidation. It can use TTL plus player proximity.
Dirty invalidation can come later by tracking chunk updates or block change events once
the right hook is validated.

## Validation Plan

The early validation loop should answer these questions:

1. Can a plugin read `WorldChunk.getHeight()` and `getBlock()` safely for a loaded chunk?
2. Does `BlockType` lookup by `WorldChunk.getBlock()` integer work as expected?
3. Can we generate a valid GLB from one chunk and load it in Three.js?
4. Can we stream a 3 by 3 chunk area without stalling the server?
5. Can we avoid rendering unexplored chunks?
6. Can we unload chunks in the browser without leaking GPU memory?
7. Can player markers line up with terrain coordinates?

The validation commands can start as operator commands:

```text
/terrascape status
/terrascape sample <chunkX> <chunkZ>
/terrascape clearcache
/terrascape pregenerate <radius> <lod>
```

## MVP Cut

The MVP is complete when:

- the mod starts an HTTP server
- the browser app loads a Three.js world view
- at least one enabled world appears in the selector
- terrain GLBs are generated from real chunk height/block data
- chunks stream as the camera moves
- online players appear at correct coordinates
- unexplored chunks are blocked by default
- memory/disk cache and pending-future coalescing work
- there is a repeatable validation path for a known chunk

## Open Questions

- Does `WorldChunk.getBlock()` return IDs that can be directly resolved through
  `BlockType.getAssetMap()`?
- Which `Opacity` enum values should count as renderable, transparent, water-like, or
  air-like?
- Is `getChunkAsync()` acceptable for web-triggered requests, or should MVP only inspect
  loaded/on-disk chunks with `NO_GENERATE` semantics?
- What is the correct chunk height range across worlds?
- Is there a reliable block change or chunk update event we can use for invalidation?
- Can browser GLB parsing stay on the main thread for MVP, or does it need a worker
  immediately?

## Relationship To EasyWebMap

EasyWebMap proves the web-server and tile-streaming skeleton. SynthTerrascape should copy
that architecture shamelessly, but keep a sharper MVP line:

- 2D PNG tiles become 3D GLB chunks.
- `TileManager` becomes `TerrainManager`.
- `PngEncoder` becomes `GltfWriter`.
- tile pyramids become mesh LOD.
- Leaflet tile loading becomes a Three.js chunk streamer.
- player WebSocket updates can stay almost identical.

The core bet is simple: once terrain chunks are assets, the browser can navigate them the
same way map clients navigate tiles.
