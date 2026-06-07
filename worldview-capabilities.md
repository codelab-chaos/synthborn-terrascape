# SynthWorldview Capabilities

## Purpose

This is the yes/no inventory of capabilities SynthWorldview needs or has confirmed.

Write capabilities from the player or operator perspective: what they can visibly do
with the 3D world view, what the server can safely expose, or what validation proves.
Internal implementation details belong in `worldview-sprint-board.md` unless the
capability is directly observable or operator-facing.

If a capability is not confirmed as implemented, keep it in `Needed Capabilities`. When
it is confirmed, move it to `Implemented Capabilities` with a short note naming the
command, endpoint, UI surface, or validation that proves it.

## Capability Guardrail

Worldview must never generate or expose arbitrary unexplored world data by default.
Every terrain capability must be bounded by world allowlists, explored/on-disk chunk
checks, cache limits, and generation concurrency limits. Web-triggered chunk reads must
not accidentally force broad world generation.

Capabilities should be specific. Prefer "Worldview streams vertex-colored GLB terrain
for explored chunks" over "Worldview renders the world."

## Needed Capabilities

### [ ] Operator Can Restrict Which Worlds Are Visible

The config can allow all worlds or whitelist specific worlds. Hidden worlds do not appear
in `/api/worlds` and cannot serve terrain.

### [ ] Worldview Blocks Unexplored Chunks By Default

Requests for chunks outside the explored/on-disk index return empty or unexplored
responses without forcing terrain generation.

### [ ] Worldview Enforces Disk Cache Limits

Generated terrain cache files are bounded by count, bytes, age, or explicit operator
policy so scale tests and browser sessions cannot grow disk usage indefinitely.

### [ ] Operator Can Set An Uncapped Visible Radius In The UI

The visible-radius field does not impose a client-side maximum while the project is in
stress-test mode. Operators can intentionally enter large values to test loading,
rendering, cache growth, and failure behavior.

### [ ] Worldview Unloads Distant Chunks In The Browser

The client disposes geometry/material resources for chunks outside the retain radius.

### [ ] Worldview Marks Stale Chunks For Refresh Near Players

Stale cached terrain is regenerated only when a player is near enough that the terrain
could plausibly have changed.

### [ ] Worldview Can Add Texture Atlas Rendering

Terrain can graduate from vertex colors to real block texture UVs and atlas-backed
materials.

### [ ] Worldview Can Show Limited Exposed Faces Below The Heightmap

The terrain mesh can include cliffs, holes, and built structures by scanning a bounded
depth below the top surface.

### [ ] Operator Can Toggle Enhanced Structure Mesh Generation

A config feature flag can enable richer mesh generation for trees, buildings, and other
above-ground structures while keeping the conservative heightfield mesh as the default
safe mode. The enhanced mode should be bounded by scan depth, block classification, and
mesh budget settings.

### [ ] Experimental Tree Detail Is Parked

Tree and leaf detail experiments are parked for now. Terrain generation should keep the
conservative ground/water heightfield path active and avoid emitting alternate foliage
render geometry until the vegetation approach is revisited.

### [ ] Worldview Can Invalidate Dirty Chunks

The server can detect chunk/block updates and tell connected browsers to reload affected
terrain.

### [ ] Viewer Can Toggle Spawn Marker Overlay For Mob Spawn Discovery

The viewer can show Hytale spawn-marker entities separately from live mobs. Spawn
markers are not part of the normal mob layer because they represent spawn locations,
not living entities, but an optional overlay can help operators find likely mob spawn
regions and debug why an area has or lacks wildlife/hostiles.

### [ ] Viewer Can Show Live Mob Markers Reliably

Mob markers are available again as a development layer, but reliability still depends on
which live entities the server-side Hytale query can observe. The viewer should keep the
feed honest: show observed animals/NPCs/monsters, expose concise source diagnostics, and
avoid smoothing, caching, or inventing missing mobs when the runtime source misses them.

### [ ] Viewer Can Show Live Mob Icons On Loaded Map Areas

The first reopened mob layer should show animals, NPCs, and monsters as compact map
icons near their current world positions. The layer should be bounded to loaded or
player-near chunks, default to a readable category icon when no creature-specific art is
known, and avoid pretending spawn markers are live mobs. Clicking or hovering an icon can
show the short mob type, category, and coordinates, but the first pass should prioritize
spatial awareness over labels everywhere.

### [ ] Worldview Streams Live Entity Snapshots

Players and mobs should use one push-style browser connection for live position updates
instead of independent high-frequency polling loops. Server-Sent Events are the preferred
first transport because the embedded JDK HTTP server does not natively support WebSocket
upgrades and the feed is server-to-browser only. The existing `/api/players/{world}` and
`/api/mobs/{world}` routes remain useful fallback/debug endpoints.

### [ ] Worldview Can Resolve Mob Types To Icon Categories

Mob snapshots should include enough metadata for the browser to choose an icon without
hard-coding every Hytale asset name. Useful first categories are `hostile`, `passive`,
`npc`, `boss`, `critter`, `livestock`, `flying`, `swimming`, `unknown`, and
`spawn-marker` as a separate overlay. Type-name rules can cover obvious families such as
Skeleton, Zombie, Goblin, Outlander, Wolf, Cow, Rabbit, Duck, Frog, Mouse, and Kweebec
until a richer asset metadata table exists.

### [ ] Worldview Can Use Creature Headshot Icons

The asset tree already contains generated creature/NPC icon PNGs under
`_Assets/Common/Icons/ModelsGenerated`. This should be Worldview's primary icon source:
copy or atlas selected PNGs into web resources, map runtime mob type ids to matching
filenames, and fall back to category badges when no generated icon exists. A separate
blockymodel/headshot renderer is still useful for gaps, but it should be a fallback
pipeline rather than the first implementation.

### [ ] Worldview Can Load Static NPC Detail Metadata

Worldview should ship a generated `npc-details.json` lookup built from
`_Assets/Server/NPC/Roles/**/*.json` and `_Assets/Common/Icons/ModelsGenerated/*.png`.
The table should map runtime mob ids and common aliases to max health, attack metadata
when safely discoverable, display label, category path, appearance id, drop list, flock
members, and generated icon filename. Runtime mob cards can then fill HP/damage/icon
slots from static data while live position data continues to come from the entity stream.

## Implemented Capabilities

### [x] Operator Can Start A Local Worldview Web Server

Validated on `synth-worldview-mvp`: SynthWorldview starts a local HTTP server at
`http://127.0.0.1:5960`, serves the browser app, and exposes `/api/worlds` plus
`/api/terrain/{world}/{lod}/{chunkX}/{chunkZ}.glb`.

### [x] Viewer Can Open A Full-Screen Three.js World View

Validated with headless Chrome screenshots at `1440x900` and `390x844`. Both renders
show the full-screen Three.js canvas and the loaded real terrain chunk.

### [x] Viewer Can Select A Hytale World

Validated through `/api/worlds`, which returned `default`; the browser populates the
world selector from that API.

### [x] Viewer Can Navigate The Terrain In 3D

The first viewer includes Three.js `OrbitControls` around the loaded chunk with resize
handling and camera retargeting after terrain load.

### [x] Viewer Starts In A Close Isometric Terrain View

The initial camera focus no longer scales distance from the visible radius. It starts
near the selected terrain center with a closer isometric angle, then streams chunks
without snapping the camera back outward.

### [x] Viewer Can Navigate With Keyboard Controls

The 3D map supports keyboard movement where `W/S` move forward/back relative to the
camera view and `A/D` or `Q/E` strafe across the terrain. Keyboard movement shifts the
camera and controls target together so auto-streaming follows the moved viewpoint.

### [x] Viewer Can Pan With Middle Mouse By Default

Middle mouse drag pans the map without requiring a mode toggle, matching common
3D/editor viewport expectations.

### [x] Worldview Renders Heightfield Terrain From Real Chunk Data

Validated by loading `GET /api/terrain/default/0/0/0.glb` in the Three.js viewer. The
rendered scene shows the same terrain generated from `WorldChunk` height/block data.

### [x] Viewer Can Load A Retained Terrain Grid

Validated with the browser viewer loading a radius `1` grid around chunk `0,0`: `9`
GLB chunks were requested, retained, placed on `chunkX * 32, chunkZ * 32`, and rendered
in both desktop and mobile Chrome screenshots.

### [x] Viewer Defaults To Visible Radius 10

The visible-radius input starts at `10` while remaining uncapped for stress testing.
This loads a broader first view without changing the operator's ability to enter larger
or smaller values manually.

### [x] Viewer Can Stream Terrain Around Camera Movement

The browser watches the Three.js `OrbitControls` target, converts target `x/z` to chunk
coordinates, and auto-loads the retained grid when the target crosses into a new chunk.
Validated live with the `Auto` toggle enabled and a radius `3` grid reaching
`49 chunks loaded`.

### [x] Worldview Batches Terrain Requests

The browser requests missing terrain chunks through capped `POST /api/terrain/batch`
calls instead of one HTTP request per chunk. Each batch returns per-chunk success or
failure data so failed chunks do not poison the whole batch.

### [x] Worldview Can Generate Low-Detail Terrain On Demand

The server has an experimental `lod=1` terrain generator, but LOD serving is disabled
for now. `lod > 0` terrain requests return `410 lod_disabled`, and the viewer disables
the `LOD` toggle so normal sessions cannot trigger the churny horizon loader. Prior
validation on chunk `-7,3` showed the parked generator reduced `lod=0` from `34296`
vertices to `568` vertices at `lod=1`; re-enable only after the retain/load policy is
fixed.

### [x] Worldview Caches Generated Terrain In Memory

Recent GLB terrain chunks are served from a bounded access-order memory cache. The cache
is capped at `128` entries or `128 MiB`, and `/worldview status` reports entries,
bytes, and memory-hit count. Validated on `synth-worldview-mvp`: after clearcache, the
first request to chunk `-7,3` returned `X-Worldview-Cache: generated`, and the second
returned `X-Worldview-Cache: memory`.

### [x] Worldview Caches Generated Terrain On Disk

Generated GLB terrain chunks persist under the plugin data directory with metadata
sidecars for response headers. Disk cache paths include terrain format version, world,
lod, chunk coordinates, and experimental detail mode. Validated across restart: chunk
`-7,3` returned `X-Worldview-Cache: disk`, then subsequent requests returned
`X-Worldview-Cache: memory`.

### [x] Worldview Coalesces Duplicate Terrain Requests

Multiple simultaneous requests for the same `world/lod/chunkX/chunkZ` terrain key reuse
one pending generation future. `/worldview status` reports coalesced request count and
pending request count. Live fast-path validation completed concurrent requests cleanly;
observing a nonzero coalesced count still needs a slower stress case.

### [x] Worldview Limits Concurrent Mesh Generation

Terrain generation uses a semaphore so web viewers cannot saturate server CPU or flood
the world execution path. `/worldview status` reports active and maximum concurrent
generations. Live validation on `synth-worldview-mvp` reported `active 0/2, pending 0`
after successful batch terrain generation.

### [x] Viewer Can See Chunk Debug Bounds

A `Bounds` toggle shows per-loaded-chunk wireframe boxes and chunk coordinate labels.
The overlays are attached to chunk objects so they follow the same placement and
disposal path as the terrain mesh.

### [x] Viewer Can See Coordinates While Navigating

The HUD shows the current controls target X/Y/Z, target chunk X/Z, and camera X/Y/Z.
The readout updates every frame and uses the same target chunk math as terrain
streaming.

### [x] Viewer Can See The World Day/Night Cycle

The HUD includes a compact day/night ribbon driven by `/api/time/{world}`. The ribbon
scrolls the day/night gradient under a fixed marker and shows faint reference ticks for
midnight, dawn, noon, and dusk.

### [x] Viewer Restores Camera Position After Page Reload

The browser saves the current camera position, controls target, selected world, visible
radius, auto-stream setting, bounds toggle, and water mode in local storage. On reload,
the viewer restores the saved pose before terrain loading can refocus the grid. URL
parameters still override saved world, chunk, radius, and display settings for explicit
test/debug links. Playwright validation seeds saved state, reloads the page, and confirms
the saved target/camera coordinates return.

### [x] Viewer Can Audit Loaded Browser Resources

The HUD reports loaded chunks, mesh count, geometry/material/texture counts, Three.js
renderer memory counters, and cumulative disposed resources. Playwright validation
confirmed a radius `1` grid returns to `9 chunks` after moving center and reports
nonzero disposed chunks.

### [x] Viewer Can Render Water As Solid, Transparent, Or Hidden

Snapshotting records `WorldChunk.getFluidId(...)` and water-like block keys. The mesher
routes fluid columns into a separate GLB primitive/material named `worldview-water`, and
the viewer exposes a `Water` selector with `Transparent`, `Solid`, and `Hidden` modes.
Nearby validation did not find water in the `-5..5` chunk grid, so visual validation
against a known shoreline remains a follow-up.

### [x] Worldview Keeps Experimental Detail Generation Server-Gated

Experimental detail generation remains server-gated and off by default. The current
viewer does not expose a foliage mode or client-side alternate vegetation renderer, and
the sampler does not emit leaf/bush canopy voxels. The generic detail mesh
infrastructure remains available for future experiments that need a separate
`worldview-detail` primitive.

### [x] Worldview Can Classify Terrain Versus Overland Detail Blocks

The current block-role policy keeps water separately classified and treats trunk-like
blocks as overland detail for ground recovery. Foliage and bush alternate rendering is
parked. Broader categories such as structure and unknown reporting remain backlog work.

### [x] Viewer Sees Online Players In The 3D Scene

The server exposes `GET /api/players/{world}` with player UUID, name, position, and yaw.
The viewer polls that route, renders one 3D marker per UUID, and removes stale markers.
Validated on `synth-worldview-mvp` with online player `Gigantomancer` returned from
`/api/players/default`.

Current caveat: this MVP uses HTTP polling instead of a WebSocket feed because the
current server uses the JDK HTTP server.

### [x] Viewer Can Focus The Camera On A Player

Clicking a player in the HUD moves the camera target to that player's position and
places the camera in a nearby inspection view. Playwright validation clicked an online
player button when present and confirmed the coordinate readout changed after focus.

### [x] Viewer Can Toggle The Experimental Mob Layer

The HUD exposes a `Mobs` toggle. When enabled, the browser renders compact live mob icons
from the entity stream and falls back to `/api/mobs/{world}` if streaming is unavailable.
When disabled, the viewer hides mob markers and does not maintain a standalone mob polling
loop.

### [x] Viewer Uses A Readable Sky And Reference Grid Palette

The empty scene background and fog use a rich blue sky color instead of black. The
reference grid uses dark-gray lines so unloaded space is visible without overpowering
terrain colors.

### [x] Operator Can Run Terrain Grid Scale Tests

Validated with `tools/generate-grid.js`. The largest run requested radius `5`
around chunk `16,16`: `121` chunks, `0` failures, `38,601,176` GLB bytes,
`916,112` vertices, and `458,056` triangles. The current disk cache reached `218`
GLBs totaling `67,233,924` bytes.

### [x] Operator Can Inspect Worldview Status In-Game

Validated with `/worldview status` through SynthRCON on the `synth-worldview-mvp` save.
It reports plugin load state, uptime, enabled worlds, and terrain sample availability.

### [x] Operator Can Generate A Sample Chunk For Validation

Validated with `/worldview sample 0 0` in world `default` on `2026-05-30`. The command
reported snapshot, mesh, GLB byte size, and output path.

### [x] Operator Can Clear Generated Mesh Caches

The `/worldview clearcache` admin command clears generated terrain GLBs and sample GLBs
from the plugin data directory, then reports deleted file count, directory count, and
bytes. The command only deletes known SynthWorldview cache folders under the plugin data
directory.

### [x] Worldview Generates A GLB For One Real Chunk

Validated with chunk `0,0` in world `default`: `1024/1024` non-empty columns, height
range `107..144`, `7732` vertices, `3866` triangles, and a `325772` byte GLB written to
`mods\com.codelabchaos_SynthWorldview\samples\default_0_0.glb`.

Current caveat: this first pass samples through the runtime chunk APIs and does not yet
guard against unexplored chunks by index.

### [x] Worldview Uses Block Metadata Vertex Colors

The sample mesher assigns vertex colors from `BlockType.getTextureComputedColor()`,
falls back through block tint/particle metadata where available, and keeps a stable
block-key fallback palette for unknown assets. Top-surface biome tint is applied for
blocks that advertise top biome tint support.

## Validation Questions

- Can `WorldChunk.getHeight()` and `getBlock()` be read safely from the chosen execution
  path?
- Can block IDs resolve to `BlockType` metadata without custom lookup glue?
- What is the right default for "renderable" across empty, fluid, transparent, custom
  model, and technical blocks?
- Does `getChunkAsync()` load or generate chunks in ways that should be forbidden for
  public viewers?
- What chunk retain radius keeps the browser smooth on a normal machine?
- Which Hytale entity query reliably sees animals, NPCs, and monsters that are actually
  loaded near players or loaded chunks?
- Can mob snapshots be bounded to loaded chunks without forcing chunk/entity generation?
- Which NPC asset metadata maps runtime mob type ids to `Common/NPC/.../Models` paths?
- Is a generated icon atlas allowed to bundle cropped creature headshots from local
  Hytale assets, or should the viewer start with code-drawn category icons only?
