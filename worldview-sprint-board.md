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

Status: In Progress

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

#### Story 1.3 - Start HTTP Server

Status: Closed

Acceptance:

- HTTP server starts on configured port.
- Static handler serves `index.html`, JS, CSS.
- API handler routes `/api/worlds`, `/api/terrain/...`, and `/api/terrain/batch`.
- Shutdown closes channels and event loops.

Validation:

- Server boot log shows `SynthWorldview listening on http://127.0.0.1:5960`.
- `GET /` serves `index.html`.
- `GET /api/worlds` returns `{"ok":true,"worlds":[{"name":"default"}]}`.
- Server restart releases and reacquires port `5960`.

Note: MVP uses the JDK HTTP server already proven by SynthRCON. Netty remains a
future implementation choice if traffic or lifecycle needs justify it. The batch
terrain route remains open under Story 4.5.

#### Story 1.4 - Add Admin Commands

Status: Closed

Acceptance:

- `/worldview status` reports server state and cache counters.
- `/worldview clearcache` clears memory/disk caches.
- `/worldview sample <chunkX> <chunkZ>` attempts one terrain generation and reports
  snapshot/mesh/GLB stats.

Validation:

- `/worldview status` works through SynthRCON and reports plugin state.
- `/worldview sample 0 0` generated `default_0_0.glb` from the `default` world.
- `/worldview clearcache` clears known generated mesh folders under the plugin data
  directory and reports deleted files, directories, and bytes.

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

Status: Closed

Acceptance:

- Raw block IDs are mapped to useful colors.
- First pass may use fallback palette if `BlockType` integer lookup is not direct.
- Empty/air blocks are skipped.
- Unknown blocks get a visible debug color.

Validation:

- Sample output reports the most common top block key.
- `TerrainSampler` now prefers `BlockType.getTextureComputedColor()`, then top tint
  and particle color metadata, before falling back to the conservative block-key
  palette.
- Build validated with `.\gradlew.bat build`.
- Runtime validation after restart: `/worldview sample 0 0` still generated
  `1024/1024` columns, `7732` vertices, `3866` triangles, and a `325772` byte GLB.
- HTTP validation after restart: `GET /api/terrain/default/0/0/0.glb` returned
  `200`, `model/gltf-binary`, `1024` columns, `7732` vertices, and `3866` triangles.

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

Status: Closed

Acceptance:

- `GET /api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb` returns GLB bytes.
- Empty or unexplored chunks return clear status or empty GLB.
- Response has `model/gltf-binary`.

Validation:

- `GET /api/terrain/default/0/0/0.glb` returned `200`, `model/gltf-binary`, and
  `325772` bytes.
- Response headers reported `1024` columns, `7732` vertices, and `3866` triangles.

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
- HTTP terrain requests write GLBs under
  `mods\com.codelabchaos_SynthWorldview\terrain\<world>\lod-<lod>`.
- Scale-test baseline after radius `1`, `2`, `3`, and `5` runs: `218` cached GLBs,
  `67,233,924` bytes total.
- `/worldview clearcache` deletes current disk artifacts for `terrain` and `samples`.
- Cache keying and reuse after restart remain open.

### Epic 4: Three.js Viewer

Goal: provide the first usable 3D map experience.

#### Story 4.1 - Build Full-Screen Three.js App

Status: Closed

Acceptance:

- App loads as the first screen.
- Renderer, camera, lights, controls, and resize handling work.
- Scene has a restrained HUD for world, coordinates, and connection state.

Validation:

- Headless Chrome screenshots at `1440x900` and `390x844` showed a nonblank
  Three.js canvas.
- Pixel sampling found varied rendered content in both screenshots.

#### Story 4.2 - Load One GLB Chunk

Status: Closed

Acceptance:

- Client fetches one terrain GLB.
- `GLTFLoader` parses it.
- Chunk object is placed at `chunkX * 32, 0, chunkZ * 32`.

Validation:

- The browser loaded `/api/terrain/default/0/0/0.glb` and displayed chunk `0,0` in
  the scene.
- The loaded object is placed at `chunkX * 32, 0, chunkZ * 32`.

#### Story 4.3 - Stream Camera-Centered Chunk Grid

Status: Closed

Acceptance:

- Client computes chunk keys around camera target.
- Missing chunks are requested in priority order.
- Loaded chunks are retained in a map by key.
- Distant chunks are removed and disposed.

Validation:

- First pass validated with a manual center/radius loader: radius `1` around chunk
  `0,0` loaded `9` GLB chunks and rendered as one grid in desktop and mobile Chrome
  screenshots.
- Disk artifacts were written for `-1..1, -1..1` under
  `terrain\default\lod-0`.
- Scale-test helper `tools/generate-grid.js` validated larger manual grids:
  radius `2` / `25` chunks at concurrency `4`, radius `3` / `49` chunks at
  concurrency `8`, and radius `5` / `121` chunks at concurrency `12`.
- Largest test, centered at `16,16`, returned `121/0` ok/failed, `38,601,176`
  GLB bytes, `916,112` vertices, `458,056` triangles, and `361ms` wall-clock from
  the HTTP client perspective.
- Added automatic streaming from the `OrbitControls` target: the client computes the
  target chunk, debounces chunk-boundary changes, updates the center fields, retains
  the new grid, and disposes chunks outside the retain set.
- Live screenshot validation showed the `Auto` toggle enabled and a radius `3` grid at
  `49 chunks loaded · center 0, 0`.
- Remaining scaling work moves to batch fetch, memory cache/pending-future coalescing,
  and server-side generation limits.

#### Story 4.3a - Allow Uncapped UI Radius For Stress Testing

Status: Closed

Acceptance:

- Radius input has no client-side maximum.
- Negative or invalid values are clamped to `0`.
- Operators can enter large values intentionally to stress request volume, browser
  rendering, disk cache growth, and server behavior.

Validation:

- Live HTML no longer includes a `max` attribute on the radius input.
- Live JavaScript clamps the radius only to a minimum of `0`.

#### Story 4.3b - Default Visible Radius To 10

Status: Closed

Acceptance:

- The initial visible radius input defaults to `10`.
- Operators can still change the value freely because the input remains uncapped.

Validation:

- `index.html` sets the radius input value to `10`.

#### Story 4.4 - Add Debug Chunk Bounds

Status: Open

Acceptance:

- Toggle shows chunk outlines or labels.
- Debug view helps verify stitching and coordinate placement.

Validation:

- Boundaries align to 32-block chunk grid.

#### Story 4.6 - Add First-Person-Style Keyboard Navigation

Status: Closed

Acceptance:

- `W/A/S/D` move the camera/target through the terrain in a predictable
  first-person-style mode.
- `Q/E` provide lateral strafe or vertical/lateral movement according to the selected
  navigation model.
- Keyboard movement updates the same target position used by auto-streaming.
- Controls do not fight with text input focus in the HUD.

Validation:

- Live `app.js` serves `handleKeyboardNavigation`.
- `W/S` move forward/back relative to the camera heading.
- `A/D` and `Q/E` strafe left/right.
- Keyboard movement shifts both camera position and `OrbitControls.target`, so
  auto-streaming reads the moved target and mesh loads do not refocus the view.

#### Story 4.7 - Make Middle Mouse Pan The Default

Status: Closed

Acceptance:

- Middle mouse drag pans the viewport by default.
- Pan behavior preserves the current camera distance and does not accidentally orbit.
- Behavior works with auto-streaming because the controls target changes predictably.

Validation:

- Live `app.js` serves `controls.mouseButtons` with middle mouse mapped to pan.
- Orbit zoom distance is bounded with `minDistance` and `maxDistance`.

#### Story 4.8 - Improve Default Camera Framing

Status: Closed

Acceptance:

- Initial focus is close enough to inspect terrain color and shape.
- Camera distance does not scale outward just because visible radius is large.
- Initial pose is isometric, angled toward the terrain surface.

Validation:

- `focusGrid` now sets the camera to a fixed close offset from the target:
  `center.x + 78`, `center.y + 58`, `center.z + 78`.
- Live `app.js` serves the new closer camera settings after restart.

#### Story 4.5 - Add Batch Terrain Fetch

Status: Open

Acceptance:

- Client queues missing chunk keys.
- Server accepts `POST /api/terrain/batch`.
- Batch size is capped.
- Failed chunks do not poison the whole batch.

Validation:

- Camera grid loads with fewer HTTP requests than one-per-chunk.

Scale baseline:

- One-request-per-chunk survived `121` chunks at concurrency `12` without failures.
- Batching is still needed before this becomes a camera-driven default because request
  count, cache policy, and server-side generation limits are not yet bounded.

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
- Add a config feature flag for enhanced structure mesh generation.
- Classify block roles for ground, foliage, trunk, water, structure, and unknown blocks.
- Capture overland vegetation as cheap tree proxies: trunk cylinders/boxes plus
  simplified canopy volumes or billboards.
- Validate whether a bounded scan around heightmap tops can capture trees acceptably
  without exploding triangle counts.
- Add transparent water primitive.
- Evaluate per-face tint/material rules beyond top-surface metadata colors.
- Build texture atlas from `BlockType.getTextures()`.
- Represent custom model blocks with simplified proxies.

#### Story 7.1 - Classify Overland Detail Blocks

Status: Parked

Acceptance:

- Block keys are categorized into at least `ground`, `foliage`, `trunk`, `water`,
  `structure`, and `unknown`.
- Classification is reported in `/worldview sample` or scale-test output.
- Meshing policy can choose different geometry budgets per category.

Validation:

- Sample forest chunks report plausible foliage/trunk counts.
- Unknown block count is visible so bad classifications are easy to spot.

#### Story 7.1a - Add Enhanced Structure Mesh Feature Flag

Status: Parked

Acceptance:

- Config exposes a disabled-by-default feature flag for enhanced structure meshing.
- Enhanced mode can include trees, buildings, and other above-ground structures.
- Config bounds include scan depth, category allowlist, max emitted faces, and max
  generation time per chunk.
- Conservative heightfield generation remains the default behavior.

Validation:

- With the flag disabled, generated terrain matches the current heightfield-only mesh.
- With the flag enabled on selected test chunks, tree/building silhouettes improve and
  vertex/triangle/byte deltas are reported.

#### Story 7.2 - Add Cheap Tree Proxies

Status: Parked

Acceptance:

- Tree-like overland detail can render without full leaf-block voxel meshing.
- First pass may use trunk boxes and simplified canopy boxes or crossed billboards.
- Proxies are emitted as a separate primitive/material or separate GLB node so they can
  be toggled or replaced later.

Validation:

- Forest chunk screenshots show recognizable tree silhouettes.
- Radius `3` grid remains smooth in the browser.
- Vertex/triangle delta is recorded against the heightfield-only baseline.

#### Story 7.3 - Evaluate Bounded Exposed-Face Scan For Vegetation

Status: Parked

Acceptance:

- Scanner reads a bounded vertical range around the heightmap top, not full chunks.
- Faces are emitted only where neighboring cells are air/transparent.
- Config controls scan depth and category inclusion.

Validation:

- Compare proxy output versus bounded scan output on the same forest chunk.
- Record GLB bytes, vertices, triangles, generation time, and browser FPS impression.

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
- [x] Browser opens a nonblank Three.js app.
- [x] `/api/worlds` lists enabled worlds.
- [x] One real explored chunk generates a valid GLB.
- [x] Terrain chunks stream around camera movement.
- [ ] Online players render at correct coordinates.
- [ ] Unexplored chunks are blocked by default.
- [ ] Memory cache, disk cache, and pending-future coalescing are validated.
- [ ] Mesh generation concurrency is bounded.
- [ ] Basic docs explain setup, commands, and known limits.
