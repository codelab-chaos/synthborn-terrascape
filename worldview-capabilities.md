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

### [ ] Worldview Coalesces Duplicate Terrain Requests

Multiple simultaneous requests for the same mesh key reuse one pending future.

### [ ] Worldview Caches Generated Terrain In Memory

Recent GLB terrain chunks are served from a bounded memory cache.

### [ ] Worldview Caches Generated Terrain On Disk

Generated GLB terrain chunks persist under the plugin data directory and can be reused
after restart.

### [ ] Viewer Sees Online Players In The 3D Scene

Player markers update from WebSocket messages and line up with terrain coordinates.

### [ ] Viewer Can Focus The Camera On A Player

Clicking a player in the list moves the camera target to that player's position.

### [ ] Worldview Limits Concurrent Mesh Generation

Terrain generation uses a semaphore or equivalent limit so web viewers cannot saturate
server CPU.

### [ ] Worldview Enforces Disk Cache Limits

Generated terrain cache files are bounded by count, bytes, age, or explicit operator
policy so scale tests and browser sessions cannot grow disk usage indefinitely.

### [ ] Operator Can Set An Uncapped Visible Radius In The UI

The visible-radius field does not impose a client-side maximum while the project is in
stress-test mode. Operators can intentionally enter large values to test loading,
rendering, cache growth, and failure behavior.

### [ ] Worldview Streams LOD Terrain

The server can generate lower-detail terrain for distant chunks or regions.

### [ ] Worldview Unloads Distant Chunks In The Browser

The client disposes geometry/material resources for chunks outside the retain radius.

### [ ] Worldview Marks Stale Chunks For Refresh Near Players

Stale cached terrain is regenerated only when a player is near enough that the terrain
could plausibly have changed.

### [ ] Viewer Can Render Water As Solid Or Transparent

Water-like fluid terrain renders separately from opaque terrain and can be displayed
as either solid colored water or transparent water. The viewer/operator can choose the
mode so water is legible during debugging and less visually heavy during exploration.

### [ ] Worldview Can Add Texture Atlas Rendering

Terrain can graduate from vertex colors to real block texture UVs and atlas-backed
materials.

### [ ] Worldview Can Show Limited Exposed Faces Below The Heightmap

The terrain mesh can include cliffs, holes, and built structures by scanning a bounded
depth below the top surface.

### [ ] Worldview Can Show Overland Vegetation Detail

The terrain view can represent trees and other overland vegetation with either
simplified proxies or bounded exposed-face scans, without turning every leaf block into
expensive full voxel geometry.

### [ ] Operator Can Toggle Enhanced Structure Mesh Generation

A config feature flag can enable richer mesh generation for trees, buildings, and other
above-ground structures while keeping the conservative heightfield mesh as the default
safe mode. The enhanced mode should be bounded by scan depth, block classification, and
mesh budget settings.

### [ ] Worldview Can Classify Terrain Versus Overland Detail Blocks

Block visual policy can distinguish ground, foliage, trunk, water, structure, and
unknown blocks so terrain meshing and detail meshing can use different budgets.

### [ ] Worldview Can Invalidate Dirty Chunks

The server can detect chunk/block updates and tell connected browsers to reload affected
terrain.

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

### [x] Viewer Can See Chunk Debug Bounds

A `Bounds` toggle shows per-loaded-chunk wireframe boxes and chunk coordinate labels.
The overlays are attached to chunk objects so they follow the same placement and
disposal path as the terrain mesh.

### [x] Viewer Can See Coordinates While Navigating

The HUD shows the current controls target X/Y/Z, target chunk X/Z, and camera X/Y/Z.
The readout updates every frame and uses the same target chunk math as terrain
streaming.

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
