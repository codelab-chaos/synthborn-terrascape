# SynthWorldview Sprint Board

This file is the living backlog for SynthWorldview. It is driven by
`worldview-capabilities.md`, which is the capability inventory. If a capability is not
confirmed as implemented, this board should break it into stories, track status, and
record validation outcomes.

Design reference: `../../docs/worldview-design.md`

Research reference: `../../docs/easywebmap-technical-notes.md`

## Status Legend

- `Open` - not started
- `In Progress` - implementation started
- `Blocked` - waiting on API research, design choice, or dependency
- `Parked` - intentionally paused until an earlier proof exists
- `Closed` - shipped, validated, or intentionally dropped

## Current Focus

Current sprint focus: **MVP 0: Prove One Real Chunk As GLB**

The project should resist jumping to a beautiful renderer before it proves the core
chain:

```text
real Hytale chunk -> immutable terrain snapshot -> conservative mesh -> valid GLB
-> served by HTTP -> loaded in Three.js -> disposed cleanly
```

The first playable slice is a full-screen Three.js view that can load a small cluster of
real explored chunks and show live player markers.

## Runtime Validation Standard

Every terrain story needs a validation note that identifies:

- world and chunk coordinates used
- whether the chunk was loaded, non-ticking, on disk, or unexplored
- whether snapshotting touched world data on a safe execution path
- generated vertex/index counts
- GLB byte size
- cache path used
- browser load result
- cleanup/disposal result

Do not close rendering stories on synthetic geometry alone. Synthetic geometry is useful
for browser setup, but MVP closure requires real `WorldChunk`-derived data.

## MVP Epics

### Epic 1: Mod Shell And Web Server

Goal: create the minimal SynthWorldview mod shell and serve a browser app.

#### Story 1.1 - Create SynthWorldview Plugin Skeleton

Status: Closed

Acceptance:

- Gradle/Maven build exists for `mods/SynthWorldview`.
- Plugin manifest loads in Hytale.
- Startup and shutdown log clear `SynthWorldview` messages.
- Plugin data directory is created.

Validation:

- `.\gradlew.bat build` succeeds.
- `synth-worldview-mvp` boot log shows `SynthWorldview setup complete`,
  `SynthWorldview started`, and `Enabled plugin com.codelabchaos:SynthWorldview`.

#### Story 1.2 - Add Config Loader

Status: Open

Acceptance:

- Config file is created with defaults.
- Config includes HTTP port, enabled worlds, cache sizes, render explored only,
  generation concurrency, terrain TTL, and debug flags.
- Config reload command or restart path is documented.

Validation:

- Delete config, boot server, confirm default file.
- Change port/world allowlist and confirm behavior.

#### Story 1.3 - Start Netty HTTP Server

Status: Open

Acceptance:

- HTTP server starts on configured port.
- Static handler serves `index.html`, JS, CSS.
- API handler routes `/api/worlds`, `/api/terrain/...`, and `/api/terrain/batch`.
- Shutdown closes channels and event loops.

Validation:

- Browser opens app.
- Server restart releases port.

#### Story 1.4 - Add Admin Commands

Status: In Progress

Acceptance:

- `/worldview status` reports server state and cache counters.
- `/worldview clearcache` clears memory/disk caches.
- `/worldview sample <chunkX> <chunkZ>` attempts one terrain generation and reports
  snapshot/mesh/GLB stats.

Validation:

- `/worldview status` works through SynthRCON and reports plugin state.
- `/worldview sample 0 0` generated `default_0_0.glb` from the `default` world.
- `/worldview clearcache` remains open.

### Epic 2: Terrain Snapshotting

Goal: read enough real chunk data to build a conservative terrain mesh.

#### Story 2.1 - Validate Chunk Index Guard

Status: Open

Acceptance:

- Reuse EasyWebMap-style chunk index reading through `ChunkStore` or `IChunkLoader`.
- Cache indexes per world.
- Terrain requests for unexplored chunks return `unexplored`.

Validation:

- Request known explored and unknown chunk coordinates.
- Confirm unknown does not generate terrain.

#### Story 2.2 - Snapshot One Loaded Chunk Heightfield

Status: Closed

Acceptance:

- Given a loaded chunk coordinate, copy `getHeight`, `getBlock`, `getFluidId`,
  `getRotationIndex`, and `getTint` into plain snapshot records.
- Snapshot code has a timeout/failure path.
- Snapshot code does not keep references to `WorldChunk`.

Validation:

- `/worldview sample 0 0` printed `1024/1024` non-empty columns for world `default`,
  height range `107..144`, and common top block `Soil_Gravel_Sand_White`.

#### Story 2.3 - Resolve Block Visual Metadata

Status: In Progress

Acceptance:

- Raw block IDs are mapped to useful colors.
- First pass may use fallback palette if `BlockType` integer lookup is not direct.
- Empty/air blocks are skipped.
- Unknown blocks get a visible debug color.

Validation:

- Sample output reports the most common top block key.
- Color source is currently the conservative fallback palette; richer `BlockType`
  visual metadata is still open.

#### Story 2.4 - Decide Loaded Versus Non-Ticking Chunk Policy

Status: Open

Acceptance:

- Document whether MVP uses `getChunkIfLoaded`, `getChunkAsync`, or
  `getNonTickingChunkAsync`.
- Public/default behavior must not force broad generation.
- Config flag controls any more aggressive loading mode.

Validation:

- Request an unloaded explored chunk and record behavior.

### Epic 3: Mesh And GLB Generation

Goal: turn terrain snapshots into browser-loadable GLB assets.

#### Story 3.1 - Build Heightfield Mesher

Status: Closed

Acceptance:

- Mesher emits top quads for non-empty columns.
- Mesher emits side quads where neighboring columns are lower.
- Mesh uses local chunk coordinates.
- Output includes positions, normals, vertex colors, and indices.

Validation:

- `/worldview sample 0 0` generated `7732` vertices and `3866` triangles from a real
  terrain snapshot.

#### Story 3.2 - Write Minimal GLB Encoder

Status: Closed

Acceptance:

- Encoder emits valid GLB 2.0.
- GLB contains one scene, one node, one mesh, one material.
- Attributes include `POSITION`, `NORMAL`, and `COLOR_0`.
- Indices are included.

Validation:

- Command validation wrote a `325772` byte `.glb` under the plugin data directory.
- Three.js/browser load validation remains a follow-up under Epic 4.

#### Story 3.3 - Serve Single Terrain GLB Endpoint

Status: Open

Acceptance:

- `GET /api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb` returns GLB bytes.
- Empty or unexplored chunks return clear status or empty GLB.
- Response has `model/gltf-binary`.

Validation:

- Browser and curl can download a sample chunk.

#### Story 3.4 - Add Memory Cache And Pending Future Coalescing

Status: Open

Acceptance:

- Cache key includes world, lod, chunkX, chunkZ, and format version.
- Duplicate concurrent requests reuse the same future.
- Cache is bounded.

Validation:

- Two simultaneous sample requests only generate once.

#### Story 3.5 - Add Disk Cache

Status: In Progress

Acceptance:

- GLBs persist under plugin data directory.
- Cache age can be checked.
- Clearcache removes disk files.

Validation:

- Sample command writes GLB files under
  `mods\com.codelabchaos_SynthWorldview\samples`.
- Cache keying, reuse after restart, and clearcache behavior remain open.

### Epic 4: Three.js Viewer

Goal: provide the first usable 3D map experience.

#### Story 4.1 - Build Full-Screen Three.js App

Status: Open

Acceptance:

- App loads as the first screen.
- Renderer, camera, lights, controls, and resize handling work.
- Scene has a restrained HUD for world, coordinates, and connection state.

Validation:

- Browser shows nonblank interactive canvas.

#### Story 4.2 - Load One GLB Chunk

Status: Open

Acceptance:

- Client fetches one terrain GLB.
- `GLTFLoader` parses it.
- Chunk object is placed at `chunkX * 32, 0, chunkZ * 32`.

Validation:

- Known sample chunk appears at expected coordinates.

#### Story 4.3 - Stream Camera-Centered Chunk Grid

Status: Open

Acceptance:

- Client computes chunk keys around camera target.
- Missing chunks are requested in priority order.
- Loaded chunks are retained in a map by key.
- Distant chunks are removed and disposed.

Validation:

- Moving camera loads adjacent chunks and unloads distant chunks.

#### Story 4.4 - Add Debug Chunk Bounds

Status: Open

Acceptance:

- Toggle shows chunk outlines or labels.
- Debug view helps verify stitching and coordinate placement.

Validation:

- Boundaries align to 32-block chunk grid.

#### Story 4.5 - Add Batch Terrain Fetch

Status: Open

Acceptance:

- Client queues missing chunk keys.
- Server accepts `POST /api/terrain/batch`.
- Batch size is capped.
- Failed chunks do not poison the whole batch.

Validation:

- Camera grid loads with fewer HTTP requests than one-per-chunk.

### Epic 5: Player Tracking

Goal: reuse the proven EasyWebMap player stream in 3D.

#### Story 5.1 - Add Player WebSocket Feed

Status: Open

Acceptance:

- Server broadcasts player positions by world at configured interval.
- Transform reads happen on safe world execution paths.
- Disconnected sockets are removed.

Validation:

- Browser receives `players` messages while a player moves.

#### Story 5.2 - Render 3D Player Markers

Status: Open

Acceptance:

- Player markers appear at `x, y, z`.
- Marker yaw or heading is visible.
- Player list updates by UUID.

Validation:

- Marker lines up with known player coordinates.

#### Story 5.3 - Focus Camera On Player

Status: Open

Acceptance:

- Clicking player in sidebar moves camera target to the player.
- Selection survives normal WebSocket updates.

Validation:

- Focus one online player and confirm terrain/player alignment.

### Epic 6: MVP Hardening

Goal: make the prototype safe enough to keep iterating.

#### Story 6.1 - Add Generation Concurrency Limits

Status: Open

Acceptance:

- Mesh generation is guarded by semaphore.
- Config controls max concurrent generations.
- Rejected or queued requests fail gracefully.

Validation:

- Stress request grid and confirm server remains responsive.

#### Story 6.2 - Add Metrics To Status

Status: Open

Acceptance:

- Status reports memory cache size, disk cache size if cheap, pending requests,
  generated count, cache hits, and connected viewers.

Validation:

- Status changes after browser loads chunks.

#### Story 6.3 - Add Basic Browser Resource Disposal Audit

Status: Open

Acceptance:

- Removed chunks dispose geometry and materials.
- Debug HUD shows loaded object count.
- No obvious growth while moving back and forth across same area.

Validation:

- Manual browser test records stable loaded chunk count.

#### Story 6.4 - Document MVP Setup And Validation

Status: Open

Acceptance:

- README or doc explains config, commands, URL, validation steps, and known limits.
- Capabilities moved from needed to implemented only when validated.

Validation:

- A fresh operator can run the sample chunk validation from the doc.

## Parked Post-MVP Epics

### Epic 7: Better Terrain Fidelity

Status: Parked

Candidate stories:

- Greedy merge same-height/material top quads.
- Scan bounded exposed faces below heightmap.
- Add transparent water primitive.
- Use `BlockType.getTextureComputedColor()` plus biome tint consistently.
- Build texture atlas from `BlockType.getTextures()`.
- Represent custom model blocks with simplified proxies.

### Epic 8: Live Dirty Chunk Updates

Status: Parked

Candidate stories:

- Identify block/chunk update event hook.
- Track chunk revisions.
- Broadcast `meshDirty` WebSocket messages.
- Refresh loaded chunks in-place.
- Keep stale disk cache until regenerated.

### Epic 9: Region LOD

Status: Parked

Candidate stories:

- Generate `lod 1..3` sampled meshes.
- Request LOD by camera distance.
- Avoid popping through hysteresis.
- Cache region meshes separately from chunk meshes.

## MVP Closure Checklist

- [ ] Plugin loads and starts HTTP server.
- [ ] Browser opens a nonblank Three.js app.
- [ ] `/api/worlds` lists enabled worlds.
- [x] One real explored chunk generates a valid GLB.
- [ ] Terrain chunks stream around camera movement.
- [ ] Online players render at correct coordinates.
- [ ] Unexplored chunks are blocked by default.
- [ ] Memory cache, disk cache, and pending-future coalescing are validated.
- [ ] Mesh generation concurrency is bounded.
- [ ] Basic docs explain setup, commands, and known limits.
