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

### [ ] Operator Can Start A Local Worldview Web Server

The mod starts an HTTP server on a configured port and serves the browser app plus API
routes.

### [ ] Operator Can Restrict Which Worlds Are Visible

The config can allow all worlds or whitelist specific worlds. Hidden worlds do not appear
in `/api/worlds` and cannot serve terrain.

### [ ] Viewer Can Open A Full-Screen Three.js World View

The first browser screen is the navigable 3D map with controls, not a marketing page.

### [ ] Viewer Can Select A Hytale World

The browser lists enabled worlds and swaps terrain/player streams when the viewer picks
another world.

### [ ] Viewer Can Navigate The Terrain In 3D

The viewer can orbit, pan, zoom, or fly around the loaded terrain without losing the
world coordinate frame.

### [ ] Worldview Generates A GLB For One Real Explored Chunk

Given a world and chunk coordinate, the server snapshots real chunk height/block data and
returns a valid GLB.

### [ ] Worldview Renders Heightfield Terrain From Real Chunk Data

The browser displays server-generated terrain geometry derived from `WorldChunk`
height/block data.

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

### [ ] Worldview Batches Terrain Requests

The browser can request multiple terrain chunks in one API call so camera movement does
not create one HTTP request per chunk.

### [ ] Viewer Sees Online Players In The 3D Scene

Player markers update from WebSocket messages and line up with terrain coordinates.

### [ ] Viewer Can Focus The Camera On A Player

Clicking a player in the list moves the camera target to that player's position.

### [ ] Operator Can Inspect Worldview Status In-Game

An admin command reports HTTP status, connected browsers, cache counts, enabled worlds,
and terrain generation limits.

### [ ] Operator Can Clear Terrain Caches

An admin command clears memory and disk mesh caches.

### [ ] Operator Can Generate A Sample Chunk For Validation

An admin command or API endpoint generates one known chunk and reports whether snapshot,
mesh, GLB encoding, cache write, and browser load are expected to work.

### [ ] Worldview Limits Concurrent Mesh Generation

Terrain generation uses a semaphore or equivalent limit so web viewers cannot saturate
server CPU.

### [ ] Viewer Can See Chunk Debug Bounds

A debug toggle shows chunk outlines, loaded keys, or LOD state to validate streaming.

### [ ] Viewer Can See Coordinates Under The Camera Or Pointer

The UI shows approximate world X/Y/Z or X/Z coordinates for navigation and validation.

### [ ] Worldview Uses Conservative Vertex Colors

The MVP colors terrain through block computed colors, biome tint, or a fallback palette
without requiring texture atlas generation.

### [ ] Worldview Streams LOD Terrain

The server can generate lower-detail terrain for distant chunks or regions.

### [ ] Worldview Unloads Distant Chunks In The Browser

The client disposes geometry/material resources for chunks outside the retain radius.

### [ ] Worldview Marks Stale Chunks For Refresh Near Players

Stale cached terrain is regenerated only when a player is near enough that the terrain
could plausibly have changed.

### [ ] Worldview Can Show Water As A Separate Primitive

Water-like fluid or transparent terrain renders separately from opaque terrain.

### [ ] Worldview Can Add Texture Atlas Rendering

Terrain can graduate from vertex colors to real block texture UVs and atlas-backed
materials.

### [ ] Worldview Can Show Limited Exposed Faces Below The Heightmap

The terrain mesh can include cliffs, holes, and built structures by scanning a bounded
depth below the top surface.

### [ ] Worldview Can Invalidate Dirty Chunks

The server can detect chunk/block updates and tell connected browsers to reload affected
terrain.

## Implemented Capabilities

None yet.

## Validation Questions

- Can `WorldChunk.getHeight()` and `getBlock()` be read safely from the chosen execution
  path?
- Can block IDs resolve to `BlockType` metadata without custom lookup glue?
- What is the right default for "renderable" across empty, fluid, transparent, custom
  model, and technical blocks?
- Does `getChunkAsync()` load or generate chunks in ways that should be forbidden for
  public viewers?
- What chunk retain radius keeps the browser smooth on a normal machine?
