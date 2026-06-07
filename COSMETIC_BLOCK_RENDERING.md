# Cosmetic Block Rendering

SynthWorldview has three terrain modes for decorative floating blocks such as roof pieces, planks, beams, posts, torches, fire, lanterns, doors, windows, furniture, crates, and barrels.

## Modes

### Off

Only the base terrain GLB is requested. Tree/vegetation detail remains available when server detail rendering is enabled, but cosmetic blocks are not included.

Cache shape:

- Server: `terrain/<format>/<world>/surface-details/<chunk>.glb`
- Browser: `details:plain`

### Baked

The server bakes cosmetic blocks into the chunk's normal detail mesh. This is the simplest render path and has one GLB/object per chunk, but it duplicates the base terrain in a second full terrain cache variant.

Request:

- `/api/terrain/<world>/<x>/<z>.glb?cosmetics=1`

Cache shape:

- Server: `terrain/<format>/<world>/surface-details-cosmetics/<chunk>.glb`
- Browser: `details:baked`

### Split

The client loads the plain base terrain GLB, then loads a separate cosmetic-only overlay GLB and attaches it to the same chunk wrapper. This avoids duplicating base terrain mesh bytes in the cosmetic cache, and cosmetics can be tested as an overlay cost.

Requests:

- Base: `/api/terrain/<world>/<x>/<z>.glb`
- Overlay: `/api/terrain/<world>/<x>/<z>.glb?cosmetics=only`

Cache shape:

- Base server/browser cache is the same as `Off`
- Overlay server: `terrain/<format>/<world>/surface-cosmetics-only/<chunk>.glb`
- Overlay browser: `details:split-overlay`

## Tradeoff

Use `Baked` to compare the simplest visual result. Use `Split` when cache size matters or when you want to understand the client-side cost of cosmetics as a separate object per chunk. The cosmetic block classifier is keyword-based from block IDs, so missing assets should be handled by adding the relevant block-name pattern.
