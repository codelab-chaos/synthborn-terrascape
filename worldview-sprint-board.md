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
- Live MVP server has repeatedly booted with `SynthWorldview listening on
  http://127.0.0.1:5960` and `Enabled plugin com.codelabchaos:SynthWorldview`.

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

Status: Closed

Acceptance:

- Cache key includes world, lod, chunkX, chunkZ, and format version.
- Duplicate concurrent requests reuse the same future.
- Cache is bounded.

Validation:

- Pending future coalescing is implemented for `world/lod/chunkX/chunkZ`.
- `/worldview status` reports pending terrain requests and coalesced request count.
- Live validation on `synth-worldview-mvp` after restart showed `gen: active 0/2,
  pending 0` and `chunks: generated 2, coalesced 0, failed 0` after a radius-free
  batch API request.
- A fast local overlap test with four concurrent one-chunk batch requests completed
  cleanly but did not observe coalescing because generation finished before requests
  overlapped.
- Memory cache is implemented as a bounded access-order cache: `128` entries or
  `128 MiB`, whichever limit is reached first.
- Cache key includes format version, world, lod, chunk coordinates, and experimental
  detail mode.
- `X-Worldview-Cache` reports `generated`, `memory`, or `disk` for single GLB requests.
- Live validation after `/worldview clearcache`: first request to
  `/api/terrain/default/0/-7/3.glb` returned `X-Worldview-Cache: generated`; the second
  returned `X-Worldview-Cache: memory`.
- `/worldview status` reported `memory 1/128 entries, 293.6 KiB/128.0 MiB`.

#### Story 3.5 - Add Disk Cache

Status: Closed

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
- Disk cache writes GLBs plus a metadata sidecar containing columns, vertices,
  triangles, and detail count.
- Disk cache is versioned under `terrain/v8/...` so incompatible mesh formats do not
  reuse stale GLBs.
- Cache keying includes world, lod, chunk coordinates, and experimental detail mode.
- Live validation after restart: `/api/terrain/default/0/-7/3.glb` reused the persisted
  GLB and returned `X-Worldview-Cache: disk`, then the next request returned
  `X-Worldview-Cache: memory`.
- `/worldview status` reported `disk: 1 GLBs, 293.6 KiB, hits 1`.

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

Status: Closed

Acceptance:

- Toggle shows chunk outlines or labels.
- Debug view helps verify stitching and coordinate placement.

Validation:

- `Bounds` HUD toggle is available next to `Auto`.
- Each loaded chunk gets a local 32x32 wireframe debug box and chunk coordinate label.
- Debug overlays are child objects of the terrain chunk and are disposed with the chunk.
- Live JS validation confirms the served viewer includes `createChunkDebug` and
  `debugBoundsInput`.

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

#### Story 4.9 - Improve Empty Scene Palette

Status: Closed

Acceptance:

- Empty sky/background reads as rich blue, not black.
- Reference grid reads as dark gray, not black.
- Palette remains quiet enough that terrain colors stay primary.

Validation:

- `app.js` defines `SKY_COLOR = 0x173454`.
- `app.js` uses dark-gray grid colors `0x58616a` and `0x343b42`.
- `styles.css` fallback page background matches the sky color.

#### Story 4.10 - Add Navigation Coordinate Readout

Status: Closed

Acceptance:

- HUD shows approximate target X/Y/Z coordinates.
- HUD shows current target chunk X/Z.
- HUD shows camera X/Y/Z for view debugging.
- Readout updates during orbit, pan, and keyboard navigation.

Validation:

- `index.html` includes the `coordinates` HUD element.
- `app.js` updates the readout every animation frame from `controls.target`,
  `targetChunk()`, and `camera.position`.

#### Story 4.11 - Restore Camera Position After Page Reload

Status: Closed

Acceptance:

- Viewer saves camera position and `OrbitControls.target` during navigation.
- Viewer restores the saved pose on page reload before the first grid focus resets the
  camera.
- Saved state includes selected world, visible radius, auto-stream setting, bounds
  toggle, and water mode.
- URL parameters can still override saved state for explicit test/debug links.

Validation:

- Viewer state is saved to local storage under `synthworldview.viewState.v1`.
- The saved state includes world, chunk center, radius, auto-stream, bounds, water mode,
  camera position, and `OrbitControls.target`.
- Reload boot applies saved UI state before terrain loading, restores camera/target,
  and skips the first-load grid focus so the saved pose is not overwritten.
- URL params still override saved world/chunk/radius/display state for explicit
  test/debug links.
- Playwright validation seeds saved state, reloads `/`, and confirms chunk `2,3`,
  `hidden` water, disabled auto-stream, enabled bounds, `Target 80, 126, 112`, and
  `camera 120, 150, 160`.

#### Story 4.5 - Add Batch Terrain Fetch

Status: Closed

Acceptance:

- Client queues missing chunk keys.
- Server accepts `POST /api/terrain/batch`.
- Batch size is capped.
- Failed chunks do not poison the whole batch.

Validation:

- Server accepts `POST /api/terrain/batch` with `world`, `lod`, and up to `16` chunk
  coordinates.
- Batch response contains one result per chunk with independent success or error data.
- Successful chunks include base64 GLB bytes plus column/vertex/triangle metadata.
- Client queues missing chunks, sends them in batches of `16`, parses returned GLBs,
  and falls back to single-chunk requests if a whole batch request fails.
- Build validation: `.\gradlew.bat build`.
- Live endpoint validation after deploy/restart: a two-chunk POST returned `ok=true`,
  `2` chunk results, and a `325772` byte decoded GLB for chunk `0,0`.
- Live JS validation after deploy/restart confirmed `loadChunkBatch`,
  `TERRAIN_BATCH_SIZE = 16`, and `base64ToArrayBuffer`.

### Epic 5: Player Tracking

Goal: reuse the proven EasyWebMap player stream in 3D.

#### Story 5.1 - Add Player Position Feed

Status: Closed

Acceptance:

- Server exposes player positions by world at a configured or conservative interval.
- Transform reads happen on safe world execution paths.
- Disconnected players are removed from subsequent updates.

Validation:

- MVP transport is a one-second browser poll against `GET /api/players/{world}` because
  the current JDK HTTP server does not provide WebSocket support.
- `GET /api/players/default` on `synth-worldview-mvp` returned `ok=true` with online
  player `Gigantomancer` at approximately `-168, 123, 109`.
- Player transform snapshotting runs through `world.execute(...)` and returns UUID,
  username, position, and yaw.
- Playwright validation asserts the player API returns an array and the viewer player
  panel is visible.

#### Story 5.2 - Render 3D Player Markers

Status: Closed

Acceptance:

- Player markers appear at `x, y, z`.
- Marker yaw or heading is visible.
- Player list updates by UUID.

Validation:

- The viewer creates one marker group per player UUID with a vertical capsule, ground
  ring, and directional heading cone.
- The player list updates from the same payload and removes stale UUIDs when players
  disappear.
- Live endpoint validation returned player coordinates from the dedicated world, and
  Playwright observed an online player button when a player was present.

#### Story 5.3 - Focus Camera On Player

Status: Closed

Acceptance:

- Clicking player in sidebar moves camera target to the player.
- Selection survives normal position-feed updates.

Validation:

- Clicking a player button moves `OrbitControls.target` to the player's position and
  offsets the camera into an inspection view.
- Playwright validation clicked the live player button when a player was present and
  confirmed the coordinate readout changed after focus.

#### Story 5.4 - Add Player Visibility Toggle

Status: Closed

Acceptance:

- Disabling players hides existing player markers and player HUD buttons without
  stopping the player feed.
- Toggle state is included in saved viewer state if it proves useful during testing.

Validation:

- `index.html` exposes the `Players` toggle.
- Player markers and player HUD buttons hide immediately when `Players` is disabled,
  while the existing player polling feed can continue.
- Toggle state is saved under `synthworldview.viewState.v1` with the rest of the view
  state.
- Playwright toggles players off/on, confirms `Players hidden`, and validates player
  visibility survives a saved-state page reload.
- Follow-up: the experimental `Mobs` toggle was removed when mob rendering was parked.

#### Story 5.5 - Add Mob Position Feed

Status: Parked

Acceptance:

- Server exposes conservative mob/entity snapshots by world at a polling-friendly
  endpoint.
- Snapshot includes stable id, mob type or short name, position, and a color/category
  hint if available.
- Transform/entity reads happen on safe world execution paths.
- Feed is bounded so it cannot dump unbounded entity lists into the browser.

Validation:

- `GET /api/mobs/default` returns `ok=true`, `max=256`, and a bounded `mobs` array.
- Playwright validates the endpoint shape and validates mob fields when a live NPC is
  present.
- Build validated with `.\gradlew.bat build`.
- Deployed to `synth-worldview-mvp`, restarted the server, and validated
  `GET /api/mobs/default` returned `{"ok":true,"world":"default","max":256,"mobs":[]}`.
- `npm.cmd test` passed after deployment.
- Follow-up fix after hostile testing: widened the feed from `NPCEntity` only to
  Hytale's `AllLegacyLivingEntityTypesQuery` plus `TransformComponent`, while skipping
  players. This should include hostiles such as skeletons if they are represented as
  living entities without the NPC role component.
- Second follow-up fix after another empty hostile test: widened again to
  `AllLegacyEntityTypesQuery` plus `TransformComponent`, while filtering out players,
  dropped items, projectiles, and block entities. This favors seeing real hostile
  entities even if Hytale does not classify them through the legacy living query.
- Added a rate-limited `[mob-feed]` server diagnostic while field testing. The first
  deployed diagnostic pass reported `chunks=0`, which suggests the next investigation is
  whether hostile/player-adjacent entities live in a different queried store or become
  visible only through a different SDK path.
- Follow-up after ducks rendered but skeletons did not: broadened the scan from
  `AllLegacyEntityTypesQuery + TransformComponent` to `TransformComponent` only, while
  retaining the player/item/projectile/block-entity exclusions. This should reveal
  hostile entities that carry transforms but are not included in Hytale's legacy entity
  query.
- Follow-up after the transform-only pass degraded known animal labels: changed the feed
  to run both passes, with legacy entity snapshots first and transform-only snapshots as
  a de-duplicated fallback. This keeps the known-good animal path while still surfacing
  generic transform actors for skeleton/fox/mouse investigation.
- Research follow-up: SynthUnits already validated real `Skeleton` detection through
  `Query.and(NPCEntity.getComponentType(), TransformComponent.getComponentType())`.
  Worldview now uses that `NPCEntity + TransformComponent` query for the live mob feed
  instead of the broader transform fallback.
- Spawn-marker follow-up: the broad transform fallback surfaced Hytale spawn-marker
  NPCs such as `PC_Spawn_Mark` / `NPC_Spawn_Marker`, which are useful for spawn-region
  discovery but wrong in the live mob layer. The feed now excludes spawn-marker types
  from mobs; a separate optional spawn-marker overlay is parked for later.
- Player-radar follow-up: after nearby cows, deer, wolves, foxes, frogs, and mice became
  visible, the feed was narrowed to active-player radar semantics. The server gathers
  online player positions, scans `NPCEntity` refs, fetches transforms by ref, filters to
  mobs within 500 blocks of at least one player, sorts nearest-player-first, and caps the
  response at 256 mobs. With no players online, `/api/mobs/{world}` returns an empty
  bounded feed without scanning the world.
- Live radar validation after player reconnect: `/api/players/default` reported
  `Gigantomancer`, then `/api/mobs/default` returned six nearby mobs including
  `Skeleton_Fighter_Wander`, multiple `Skeleton_Fighter` entries, and `Rabbit`.
  The server log reported `chunks=1 entities=6 accepted=6 outsideRadar=0 radar=500`.
- Stability follow-up rejected: do not smooth or cache missing mobs as a workaround.
  The feed should stay honest so inconsistent animal tracking remains visible while we
  find the correct Hytale API/path for those entities.
- Decision: disable the experimental mob feed for now. The endpoint returns
  `410 mob_feed_disabled` and the browser does not poll it. Reopen this story only after
  we find a reliable server-side Hytale entity source for all nearby animals/NPCs.

#### Story 5.6 - Render Color-Coded Mob Spheres And Labels

Status: Parked

Acceptance:

- Mobs render as small colored spheres at `x, y, z`.
- Mob colors are stable by mob type/category.
- Labels are small, color-coded, and identify mob type or short name.
- Labels can be hidden with the mob toggle or a follow-up label toggle if the view gets
  too noisy.

Validation:

- Browser polls `GET /api/mobs/{world}` after terrain/player startup and then every
  second.
- Playwright fixtures a `Skeleton` mob payload, validates one mob marker is created, and
  validates the `Mobs` toggle hides and shows the marker.
- `npm.cmd test` passed against the deployed server after the broad living-entity feed
  fix.
- Decision: disable mob rendering for now. The browser no longer exposes the `Mobs`
  toggle, no longer keeps mob marker state, and no longer reports mob counts in metrics.

### Epic 6: MVP Hardening

Goal: make the prototype safe enough to keep iterating.

#### Story 6.1 - Add Generation Concurrency Limits

Status: Closed

Acceptance:

- Mesh generation is guarded by semaphore.
- Config controls max concurrent generations.
- Rejected or queued requests fail gracefully.

Validation:

- Mesh generation is guarded by a semaphore with current maximum `2`.
- Requests beyond the active generation limit wait for a permit instead of immediately
  scheduling additional world execution work.
- `/worldview status` reports active and maximum concurrent generations.
- Live validation on `synth-worldview-mvp` reported `active 0/2, pending 0` after
  generating real terrain through `POST /api/terrain/batch`.
- Configurable limit remains a follow-up under config loader work.

#### Story 6.2 - Add Metrics To Status

Status: Closed

Acceptance:

- Status reports memory cache size, disk cache size if cheap, pending requests,
  generated count, cache hits, and connected viewers.

Validation:

- `/worldview status` reports active generation count, maximum generation count,
  pending request count, generated chunk count, coalesced request count, failed
  generation count, single terrain request count, and batch terrain request count.
- `/worldview status` now also reports bounded memory cache entries/bytes/hits and
  disk cache GLB count/bytes/hits.
- Live validation after a two-chunk batch request reported `generated 2`, `failed 0`,
  and `batch 1`; after four more batch requests it reported `generated 6` and
  `batch 5`.
- Live cache validation reported `cache: memory 1/128 entries, 293.6 KiB/128.0 MiB,
  hits 3` and `disk: 1 GLBs, 293.6 KiB, hits 1`.
- Connected viewer count remains a follow-up if we introduce WebSocket or session
  tracking.

#### Story 6.3 - Add Basic Browser Resource Disposal Audit

Status: Closed

Acceptance:

- Removed chunks dispose geometry and materials.
- Debug HUD shows loaded object count.
- No obvious growth while moving back and forth across same area.

Validation:

- HUD now reports loaded chunks, mesh count, geometry/material/texture counts,
  Three.js renderer memory counters, and cumulative disposed chunks/resources.
- Disposal deduplicates geometries, materials, and textures before calling
  `dispose()` so shared resources are not double-disposed.
- Playwright validation against `http://127.0.0.1:5960/?radius=1&chunkX=0&chunkZ=0`
  loaded a 9-chunk grid, moved the center to `2,0`, returned to a bounded `9 chunks`,
  and observed a nonzero disposed chunk count.

#### Story 6.4 - Document MVP Setup And Validation

Status: Open

Acceptance:

- README or doc explains config, commands, URL, validation steps, and known limits.
- Capabilities moved from needed to implemented only when validated.

Validation:

- A fresh operator can run the sample chunk validation from the doc.

## Parked Post-MVP Epics

### Epic 7: Better Terrain Fidelity

Status: Experimental

Note: the first tree-canopy proxy pass was useful enough to validate the idea, but it is
now parked. The active experiment is leaf-column voxel detail: when a top-down column
hits leaves, preserve the contiguous leaf run as detail voxels, then continue downward
to recover the stable ground surface. Keep it available for visual exploration, but do
not spend MVP time tuning canopy density or exact block classification unless it becomes
product-critical.
The feature is off by default and only runs when the server setting is enabled with
`synthworldview.experimental.details=true` or
`SYNTH_WORLDVIEW_EXPERIMENTAL_DETAILS=true`. The viewer only reports the server state;
clients cannot enable this generation mode per request.

Candidate stories:

- Greedy merge same-height/material top quads.
- Scan bounded exposed faces below heightmap.
- Add a config feature flag for enhanced structure mesh generation.
- Classify block roles for ground, foliage, trunk, water, structure, and unknown blocks.
- Capture overland vegetation as bounded leaf-column voxels.
- Validate whether a bounded scan around heightmap tops can capture trees acceptably
  without exploding triangle counts.
- Add separate water primitives with solid and transparent display modes.
- Evaluate per-face tint/material rules beyond top-surface metadata colors.
- Build texture atlas from `BlockType.getTextures()`.
- Represent custom model blocks with simplified proxies.

#### Story 7.1 - Classify Overland Detail Blocks

Status: Closed / Experimental

Acceptance:

- Block keys are categorized into at least `ground`, `foliage`, `trunk`, `water`,
  `structure`, and `unknown`.
- Classification is reported in `/worldview sample` or scale-test output.
- Meshing policy can choose different geometry budgets per category.

Validation:

- `TerrainSampler` classifies foliage-like block keys (`leaf`, `leaves`, `foliage`,
  `bush`) and trunk-like block keys (`trunk`, `log`, `wood`) as overland detail.
- When overland detail is the top block, the sampler scans down up to `18` blocks to
  recover a ground terrain surface instead of turning the canopy into a terrain column.
- Unknown block count remains a follow-up when a broader block-role report exists.

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

Status: Parked / Superseded

Acceptance:

- Tree-like overland detail can render without full leaf-block voxel meshing.
- First pass may use trunk boxes and simplified canopy boxes or crossed billboards.
- Proxies are emitted as a separate primitive/material or separate GLB node so they can
  be toggled or replaced later.

Validation:

- Foliage detail emits sparse canopy boxes and trunk detail emits slim trunk boxes into
  a separate GLB primitive/material named `worldview-detail`.
- The feature is opt-in at server startup. Default terrain requests omit detail geometry
  and cache under normal `lod-0`; server-enabled experimental detail requests cache
  separately under `lod-0-details`.
- `GET /api/terrain/default/0/-7/3.glb` on `synth-worldview-mvp` returned
  `X-Worldview-Details: 0` and `300628` bytes after the feature was defaulted off.
- `GET /api/terrain/default/0/-7/3.glb?details=1` also returned
  `X-Worldview-Details: 0`, proving clients cannot override the server setting.
- Prior server-enabled validation returned `X-Worldview-Details: 226`, `12548`
  vertices, `6274` triangles, and `529108` bytes.
- Nearby live-player probe also found detail geometry in chunks `-6,3`, `-6,4`,
  `-5,3`, `-7,4`, `-6,2`, and `-7,2`.
- Playwright validation requests chunk `-7,3` and asserts the detail count is greater
  than zero while the normal viewer smoke test remains green.
- Decision: park this proxy approach. The oversized canopy/trunk boxes proved the server
  can emit optional detail geometry, but the next experiment replaces them with literal
  leaf-column voxels captured during the downward scan.

#### Story 7.3 - Evaluate Bounded Exposed-Face Scan For Vegetation

Status: Parked

Acceptance:

- Scanner reads a bounded vertical range around the heightmap top, not full chunks.
- Faces are emitted only where neighboring cells are air/transparent.
- Config controls scan depth and category inclusion.

Validation:

- Compare leaf-voxel output versus bounded scan output on the same forest chunk.
- Record GLB bytes, vertices, triangles, generation time, and browser FPS impression.

#### Story 7.3a - Fill First Canopy Leaf Runs As Detail Voxels

Status: Closed / Experimental

Acceptance:

- Experimental sampler treats leaves similarly to the existing water pass: when a
  top-down column hits leaves, record the contiguous leaf run as detail voxels, but
  continue scanning downward.
- Terrain heightfield uses the first stable ground block found below canopy, not the
  leaf height.
- Output keeps canopy as a separate detail primitive/material so it can be disabled or
  tuned independently.
- Experimental mode remains server-gated and off by default.

Validation:

- `TerrainSampler` records the real leaf and wood blocks hit by the downward column ray,
  then emits those exact detail voxels. If the ray never resolves into ground, captured
  tree detail is still emitted as floating detail instead of becoming a terrain column.
- The overland downward scan currently allows up to `64` blocks below the heightmap so
  tall tree canopies are not clipped by the scan ceiling.
- `TerrainMesher` emits canopy detail as colored voxels in the `worldview-detail`
  primitive, culling hidden faces between adjacent leaf voxels.
- Terrain cache format was bumped to `v8` so terrain GLBs cannot reuse older
  proxy-detail, giant-canopy-column, or unculled leaf-voxel cache entries.
- Confirm default non-experimental terrain output remains unchanged.

#### Story 7.4 - Render Water As Solid Or Transparent

Status: Closed

Acceptance:

- Snapshotting records fluid IDs or water-like block categories separately from opaque
  terrain.
- Meshing emits water as a separate primitive, mesh, or node from opaque terrain.
- Viewer exposes a water display mode with at least `solid` and `transparent`.
- Transparent mode sorts/renders acceptably from normal map camera angles.
- Solid mode remains available for debugging shoreline and water coverage.

Validation:

- `TerrainSampler` records `WorldChunk.getFluidId(...)` and classifies water-like block
  keys separately from opaque terrain.
- `TerrainMesher` emits fluid columns through a separate mesh part, and `GltfWriter`
  writes a named `worldview-water` material so the browser can independently control
  water display.
- Viewer exposes `Water` modes: `Transparent`, `Solid`, and `Hidden`; URL bootstrapping
  supports `?water=transparent|solid|hidden`.
- Playwright validation passed with the water control present and mode changes applied
  while a radius `1` grid stayed bounded at `9 chunks`.
- Nearby grid probe over chunks `-5..5` did not find a real water primitive, so visual
  validation on a known shoreline remains a follow-up.

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

### Epic 10: Spawn Discovery Overlays

Status: Parked

Note: while debugging the live mob feed, Worldview discovered Hytale spawn-marker
entities such as `PC_Spawn_Mark` / `NPC_Spawn_Marker`. These are not live mobs, but they
may be valuable as an operator/debug overlay for understanding where wildlife and
hostiles can appear.

#### Story 10.1 - Add Spawn Marker Overlay

Status: Parked

Acceptance:

- Server exposes spawn markers through a separate endpoint or response layer, not
  `/api/mobs`.
- Viewer has a separate `Spawn markers` toggle that defaults off.
- Spawn markers use a distinct marker shape/color from live mobs.
- Labels identify marker id/type without crowding the live mob labels.

Validation:

- Confirm `PC_Spawn_Mark` / `NPC_Spawn_Marker` no longer appear in the `Mobs` layer.
- Enable the spawn-marker overlay and confirm those markers appear in their own layer.
- Compare marker positions with nearby observed wildlife/hostile spawns.

## MVP Closure Checklist

- [x] Plugin loads and starts HTTP server.
- [x] Browser opens a nonblank Three.js app.
- [x] `/api/worlds` lists enabled worlds.
- [x] One real explored chunk generates a valid GLB.
- [x] Terrain chunks stream around camera movement.
- [x] Online players render at correct coordinates.
- [ ] Unexplored chunks are blocked by default.
- [x] Memory cache, disk cache, and pending-future coalescing are validated.
- [x] Mesh generation concurrency is bounded.
- [ ] Basic docs explain setup, commands, and known limits.
