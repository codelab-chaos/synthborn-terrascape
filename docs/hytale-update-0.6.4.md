# Terrascape Update 6 migration

The migration target advanced to 0.6.5 before completion. See the
[current 0.6.5 validation report](hytale-update-0.6.5.md); the evidence below
records the intermediate 0.6.4 pass.

Validation date: September 10, 2026. Target: Hytale Server 0.6.4, revision
`108a26d534805e68dcf0d00638914cb0db82555b`.

## Changelist

- Pin compilation and Java tests to `com.hypixel.hytale:Server:0.6.4`.
- Set the manifest minimum to `>=0.6.4`, with no upper cap. This is the tested
  minimum; later releases still require compilation and runtime checks.
- Enable compiler deprecation and removal diagnostics for future updates.
- Introduce `TerrainChunkReader` to resolve the column and section components
  once per sampled section. Preserve non-ticking on-demand chunk loading via
  `GetChunkFlags.NONE` and the SDK's world-task-aware wait, rather than blocking
  the world thread with `CompletableFuture.join()`.
- Read column height and biome tint from `BlockChunk`, and block IDs, rotations,
  and fluids from `BlockSection`/`FluidSection`. Missing sections read as empty.
- Drop redundant legacy entity scan passes; retain NPC, viewer, spatial, and
  transform component passes, including their existing filtering and deduplication.
- Derive mob labels from NPC role/type and model components. Unidentified entities
  fall back to `LivingEntity`; legacy Java entity class names are no longer used.
- Read health through `DefaultEntityStatTypes.getHealth()` only.
- Regenerate the bundled NPC details: 974 -> 999 roles, 781 -> 801 roles with
  health, 256 -> 252 with inferred attack damage. Generator inputs now use
  Basecamp's current labels rather than an Overseer copy. Icon count remains 255.
- Add regression coverage for section boundaries, negative Y, rotations, fluids,
  absent sections, column tint/height, and reuse of section lookups.

## API audit

The initial 0.6.4 compile found five errors (removed tint calls) and nine warnings.
The old fluid reader also suppressed a removal warning. After migration, production
and test compilation report no deprecation/removal warnings and no such suppressions
remain in production source.

| Previous API | Replacement used |
| --- | --- |
| `World.getChunkIfLoaded` / `getNonTickingChunk` | `ChunkStore.getChunkReference` / `getChunkReferenceAsync`, then component reads |
| Removed `WorldChunk.getTint` | `BlockChunk.getTint` fetched from the column entity |
| `WorldChunk.getHeight` | `BlockChunk.getHeight` on the same component |
| `WorldChunk.getBlock` | `BlockSection.get` fetched from the section entity |
| `WorldChunk.getRotationIndex` | `BlockSection.getRotationIndex` |
| `WorldChunk.getFluidId` | `FluidSection.getFluidId` |
| `AllLegacyLivingEntityTypesQuery`, `AllLegacyEntityTypesQuery` | Existing NPC and transform component queries |
| `EntityUtils.getEntity` | Direct NPC/model component reads |
| `EntityStatMap.get(String)` fallback | Numeric `DefaultEntityStatTypes.getHealth()` |

Hytale's [official Update 6 notes](https://hytale.com/news/2026/8/update-6-patch-notes)
recommend component-based chunk access and section-based block operations. The
0.6.4 jar confirms `BlockOperations` exposes mutations and placement tests, not
block/fluid getters; Terrascape samples read-only section components directly.
The generated API signatures live in sibling Basecamp's `docs/sdk/`.

This preserves Terrascape's surface-heightmap renderer. It does not add a full
cubic-world or underground volume renderer.

## Build and deployment evidence

- `./gradlew build`: passed; 326 Java tests, zero failures/errors.
- `npm run test:web`: passed; TypeScript checks and 447 tests, zero failures.
- `git diff --check`: passed.
- Deployed using `node tools/deploy.js deploy --restart` to MacBook target
  `default`, save `synth-worldview-mvp`, game port 5521, HTTP 5960, RCON 25578.
- MacBook server was already 0.6.4. Terrascape started and enabled successfully.
- Local and remote `Terrascape-0.1.1-beta.1.jar` SHA-256 match:
  `51d4b24a058bfd8fffb731d628cfd364c37e30e5bff8c0ecd0005c0e74decefb`.
- Previous jar retained at `~/terrascape-update-6-backup/Terrascape-before-0.6.4.jar`
  on the MacBook. That jar targets the older Hytale API, so it is not a compatible
  rollback on a 0.6.4 server by itself.
- Cleared generated server mesh caches to ensure validation exercised the new
  sampler instead of pre-update GLBs. Existing viewers should clear their browser
  caches when comparing terrain across the update.
- Six runtime smoke checks passed: RCON health/status/link metadata, public worlds,
  anonymous console rejection, and invalid-token rejection.
- Fresh GLBs at `(0,0)` and `(-1,-1)` returned HTTP 200, `glTF` magic, 1,024
  nonempty columns each, and 8,628 / 3,328 triangles respectively.
- World-time, player, and mob feeds return HTTP 200. The runtime NPC index reports
  1,019 asset IDs; this live asset index is distinct from the bundled role catalog.

- `PLAYWRIGHT_CHANNEL=chromium npx playwright test tests/e2e/terrascape.spec.js
  --workers=1`: five passed, one skipped (1.5 minutes). Passing coverage includes
  anonymous console isolation, flight controls, water materials, map-tile textures,
  and bounded terrain-grid/resource rendering.

## Remaining validation
- Hytale's saved OAuth refresh token expired. Device login was initiated; user
  authentication is required before verifying `Token Source: OAuth Device`.
- No game client is connected. Player movement, live NPC health/classification,
  and online chat have not been exercised in this session.
- The identity-bound console browser test requires a personal map token and is
  skipped without one; anonymous access checks passed.

The pre-existing staged executable-bit change to `gradlew` was preserved. No
release version bump, commit, publication, or sibling mod migration was performed.
