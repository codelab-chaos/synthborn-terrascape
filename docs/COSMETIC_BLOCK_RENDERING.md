# Cosmetic Block Rendering

Terrascape has three terrain modes for decorative floating blocks such as roof pieces, planks, beams, posts, torches, fire, lanterns, doors, windows, furniture, crates, and barrels.

The cosmetic rendering path is paired with a `Visual Detail` setting. The default is `Structures + foliage`, so split/baked cosmetic loads exercise the full detail pass unless the URL or saved view state overrides it.

## Modes

### Off

Only the base terrain GLB is requested. Tree/vegetation detail remains available when server detail rendering is enabled, but cosmetic blocks are not included.

Cache shape:

- Server: `terrain/<format>/<world>/surface-details/<chunk>.glb`
- Browser: `details:plain`

### Baked

The server bakes cosmetic blocks into the chunk's normal detail mesh. This is the simplest render path and has one GLB/object per chunk, but it duplicates the base terrain in a second full terrain cache variant.

Request:

- `/api/terrain/<world>/<x>/<z>.glb?cosmetics=1&visualDetail=all`

Cache shape:

- Server: `terrain/<format>/<world>/surface-details-cosmetics-all/<chunk>.glb`
- Browser: `details:baked:all`

### Split

The client loads the plain base terrain GLB, then loads a separate cosmetic-only overlay GLB and attaches it to the same chunk wrapper. This avoids duplicating base terrain mesh bytes in the cosmetic cache, and cosmetics can be tested as an overlay cost.

Requests:

- Base: `/api/terrain/<world>/<x>/<z>.glb`
- Overlay: `/api/terrain/<world>/<x>/<z>.glb?cosmetics=only&visualDetail=all`

Cache shape:

- Base server/browser cache is the same as `Off`
- Overlay server: `terrain/<format>/<world>/surface-cosmetics-only-all/<chunk>.glb`
- Overlay browser: `details:split-overlay:all`

## Tradeoff

Use `Baked` to compare the simplest visual result. Use `Split` when cache size matters or when you want to understand the client-side cost of cosmetics as a separate object per chunk. The cosmetic block classifier is keyword-based from block IDs, so missing assets should be handled by adding the relevant block-name pattern.

## Visual Detail

`visualDetail` controls how decorative blocks are classified and meshed:

- `basic`: previous behavior. Cosmetic detail blocks render as full voxels.
- `structures`: shape-aware structure details. Common cosmetics use orientation-agnostic cuboid profiles while other cosmetics remain full voxels.
- `all`: full visual detail. Includes `structures` plus small foliage-like details such as tall grass, grass tufts, flowers, mushrooms, ferns, crops, sprouts, and saplings.

Shape profiles are cheap cuboids inside one voxel. Oriented shapes read `WorldChunk.getRotationIndex`
and map Hytale `RotationTuple` yaw/pitch to bounds:

- `TOP_SLAB`: bridges, planks, slabs, stairs — upper third of the voxel (rotation-agnostic).
- `POST`: posts, beams, fences — vertical by default; pipe pitch/roll flatten along X/Y/Z.
- `THIN_PANEL`: doors, ladders, windows — thin slab flush to the N/E/S/W face from block yaw.
- `HANGING_STRIP`: ropes, chains — thin strip oriented by yaw.
- `LIGHT`: torches, lanterns — small centered cuboid.

Ladders and doors are forced into the cosmetic detail layer even when embedded in a wall, so rotation
is applied instead of rendering them as full terrain cubes.

Direct API requests default to `visualDetail=all`. Use `basic` when comparing against the old cube-only cosmetic overlay.

Examples:

- `/api/terrain/<world>/<x>/<z>.glb?cosmetics=1&visualDetail=basic`
- `/api/terrain/<world>/<x>/<z>.glb?cosmetics=1&visualDetail=structures`
- `/api/terrain/<world>/<x>/<z>.glb?cosmetics=only&visualDetail=all`
