# Terrascape Update 6 / Hytale 0.6.5 validation

Date: September 10, 2026. This is the final target for the migration that began
against 0.6.4. The [0.6.4 report](hytale-update-0.6.4.md) preserves the API audit
and its initial validation evidence.

## Changes included

- Compile and test against `com.hypixel.hytale:Server:0.6.5`.
- Keep the minimum-only manifest requirement `>=0.6.4`: the migrated APIs were
  already compiled and tested on 0.6.4; no new 0.6.5-only API is used.
- Replace removed/deprecated terrain access with column and section components:
  `ChunkStore`, `BlockChunk`, `BlockSection`, and `FluidSection`.
- Preserve non-ticking on-demand chunk loading and cache section lookups within
  each snapshot. Cover section boundaries, negative Y, missing sections, height,
  biome tint, fluids, and rotations with regression tests.
- Replace legacy entity queries and entity-object lookups with NPC/model,
  spatial, viewer, and transform component queries.
- Use `DefaultEntityStatTypes.getHealth()` rather than string-based stat lookup.
- Enable Java deprecation and removal diagnostics for subsequent updates.
- Refresh the bundled NPC catalog to 999 roles and use Basecamp's generated
  English labels as the catalog generator input.

Basecamp's deterministic 0.6.4 -> 0.6.5 comparison found one new type and five
existing types with public/protected signature changes, concentrated in connection
handling and access control. Terrascape does not directly use those changed APIs.
The world-map `ImageBuilder` implementation also changed without a signature change;
the upstream world-map memory-leak fix is relevant to this mod. Compilation against
the exact 0.6.5 dependency is clean with deprecation/removal lint enabled.

Only three non-English language assets changed between 0.6.4 and 0.6.5. The
previously refreshed NPC/English-label catalog therefore remains current without
another generation pass.

## Build and deploy

- `./gradlew build`: passed, 326 Java tests, zero failures/errors, no compiler
  deprecation/removal warnings.
- `npm run test:web`: passed, including TypeScript checks and all 447 tests.
- `git diff --check`: passed.
- Deployment: `node tools/deploy.js restart`, target `default`, save
  `synth-worldview-mvp` on `hytale-mac`.
- Runtime `version` command: `HytaleServer v0.6.5 (release)`.
- Installed server revision: `b2e4a13a52f4177cb2452aeeb58980c2a9bf87cb`.
- Server startup log: `2026-09-10_12-49-44_server.log`.
- Terrascape started successfully; HTTP 5960, RCON 25578, game UDP 5521.
- Local/deployed `Terrascape-0.1.1-beta.1.jar` SHA-256 match:
  `bd165f1990bc9a7f4fc85aa4995f4098fa68ecffa366a42398ca2bb55822edd9`.
- Prior migrated jar saved as
  `~/terrascape-update-6-backup/Terrascape-built-for-0.6.4.jar` on the MacBook.

## Runtime evidence

- Cleared generated server mesh cache before sampling, so old GLBs cannot satisfy
  the fresh-generation checks.
- `(0,0)` returned a fresh, valid GLB: 468,252 bytes, 1,024 nonempty columns,
  8,628 triangles.
- `(-1,-1)` returned a fresh, valid GLB: 182,040 bytes, 1,024 nonempty columns,
  3,328 triangles. This exercises negative chunk coordinates as well.
- Both GLBs passed binary magic and declared-length checks and reported
  `X-Terrascape-Cache: generated`.
- Worlds, players, mobs, time, and NPC-index APIs returned HTTP 200 and `ok:true`.
  Live NPC index: 1,019 asset IDs (distinct from the bundled role catalog).
- Runtime smoke passed six checks: RCON health/status/link metadata, public worlds,
  anonymous console rejection, invalid bearer rejection.
- No Terrascape terrain exceptions or new runtime failures were found in the
  startup/validation log. The startup OAuth refresh failure was resolved by device
  authentication, confirmed below.

- Browser suite: five passed, one skipped (1.6 minutes). Flight controls, water,
  map-tile textures, anonymous console isolation, and bounded-grid resource rendering
  passed against the 0.6.5 server.
- Device authentication completed: `Token Source: OAuth Device`, session and identity
  tokens present. Credential storage reports `Encrypted`.
- Player `Gigantomancer` connected successfully and appeared in the player API with
  world position and facing direction.
- Three live mob-feed samples returned 183, 183, and 182 NPCs, with zero scanner
  errors in every sample. Comparing stable entity IDs between the first and last
  samples found 106 NPCs with changed positions, confirming live movement updates.
- Live roles, models, classifications, and health resolved through the migrated
  component queries: Squirrel (critter, 15/15 health), Owl_Brown (flying, 29/29),
  and Bear_Grizzly (hostile, 124/124).

## Validation limits

Follow-up [performance measurements](release-evidence/hytale-0.6.5-performance.md)
record server cache timings, two completed stationary browser runs, unsuccessful
flight benchmarks, and an FPS-counter accuracy issue. Functional validation above
does not imply a passing browser performance gate.

- Player presence, position, and facing were verified; the player stayed at the
  same position during the three recorded samples, so those samples do not prove
  player movement tracking. NPC movement was verified as described above.
- Online chat was not exercised.
- The identity-bound console test needs a personal map token. Anonymous console
  isolation is covered, but a skipped authenticated test is not a pass.

Changes remain uncommitted. The user's pre-existing staged `gradlew` executable-bit
change is preserved. No public release, version bump, or sibling-mod migration is included.
