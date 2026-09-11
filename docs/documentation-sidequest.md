# Documentation Sidequest: Admin Configuration and Installation

Status: **ready to start**  
Primary audience: Hytale server owners, hosting-panel users, and Terrascape operators  
Working rule: shipped behavior and generated defaults are the source of truth

## Goal

Make every Terrascape administrator setting and installation path easy to find, understand,
apply, verify, and undo.

The finished documentation must serve two readers without making either one work too hard:

- **Quick-reference readers** get the exact key, default, accepted value or range, one-line
  purpose, restart requirement, and link to more detail.
- **Deep-dive readers** get the surrounding feature, related settings, tradeoffs, security or
  performance impact, examples, validation steps, failure behavior, and recovery path.

Documentation must support both normal discovery ("How do I publish my map?") and reverse
discovery ("What does `map.generateRadius` do?" or "Why does my map link show localhost?").

## Definition of done

This sidequest is complete when:

- Every key accepted by `terrascape.properties` is present in the terse reference and in one
  detailed configuration cluster.
- Every shipped or optional key accepted by `server-config.json` is documented, including
  its exact JSON type, default, valid bounds/options, UI effect, and fallback behavior.
- Supported environment variables and Java system-property overrides are documented with
  their precedence over file values.
- Install, update, rollback, and removal instructions cover local servers, remote/headless
  servers, common hosting panels, and reverse-proxy/domain deployments.
- Every multi-step admin process has prerequisites, numbered steps, a success check, and a
  recovery or rollback note. Supplied images are placed beside the step they prove.
- Readers can find answers by task, exact setting name, configuration file, feature cluster,
  symptom, and security/performance impact.
- Every admin-facing concept has one preferred name, and legacy keys/UI labels are indexed as
  aliases instead of being mixed casually throughout the docs.
- README, the operations manual, CurseForge copy, generated defaults, and code no longer
  contradict one another.
- A fresh-server documentation walkthrough succeeds using only the published instructions.

## Source-of-truth order

When sources disagree, use this order and fix the lower source:

1. Runtime loader and enforcement code:
   `TerrascapeConfig`, `ServerControls`, `AccessGate`, `TerrascapeWebServer`, and RCON startup.
2. Bundled defaults: `TerrascapeConfig.defaultFileText()` and
   `src/main/resources/server-config.json`.
3. Tests that demonstrate validation, clamping, fallback, permissions, and access behavior.
4. `docs/operations-manual.md`, then `README.md`, then distribution/listing copy.
5. Proposal, design, roadmap, and sprint documents; these describe intent, not necessarily
   current behavior.

Do not document a proposed setting as available. Label future behavior explicitly and keep it
out of the administrator reference until the runtime accepts it.

## Naming consistency audit

Configuration names are part of the admin experience. A reader should be able to infer the
setting's scope, subject, unit, and behavior without reading implementation code.

### Preferred convention

- Use one stable domain vocabulary everywhere: **3D terrain**, **map tiles**, **map regions**,
  **players**, **mobs**, **avatars**, **browser cache**, and **server cache**.
- In `terrascape.properties`, use lower-camel-case segments under a clear namespace, for example
  `entities.mobScanRadiusBlocks`.
- In JSON, use lower camel case. Keep the subject first and qualifier last, for example
  `terrainLoadConcurrencyMax`.
- Put the unit in every numeric key unless the unit is truly dimensionless: `Millis`, `Seconds`,
  `Bytes`, `Pixels`, `Blocks`, `Chunks`, or `PerSecond`.
- Use **radius** only for a center-to-edge value and include the unit. Use **distance** only in
  prose where geometric precision does not matter.
- Use `Min` and `Max` for hard bounds, `Default` for an initial user value, and `Value` for a
  server-fixed value. Do not call a fixed value a default.
- Use positive booleans ending in a predicate such as `Enabled`, `Allowed`, or
  `UserAdjustable`. Those words are not interchangeable:
  - `Enabled` means the server feature is operating.
  - `Allowed` means an administrator permits the browser feature.
  - `UserAdjustable` means the browser user may change the value.
- Use **concurrency** for simultaneous work. Avoid "loaded at once," which sounds like a retained
  count rather than a parallel-work limit.
- Reserve **token** for a secret bearer credential, **map link** for the full URL, **Link ID** for
  the safe revocation identifier, and **session cookie** for the browser session.
- UI labels should use plain Title Case and show their unit, while reference docs always include
  the exact config key beside the friendly label.

### Names to review

These are naming candidates, not changes to the currently accepted configuration. The canonical
reference must continue showing the exact current key until a code migration ships.

| Current name | Why it is awkward | Preferred term or candidate |
| --- | --- | --- |
| `server-config.json` | Sounds like the primary server config, but it governs browser feature and workload policy beside `terrascape.properties`. | `viewer-policy.json` or `viewer-controls.json` |
| `http.host` | Admins may mistake the listen/bind address for the URL visitors should open. | `http.bindAddress`; friendly label **Listen Address** |
| `access.publicBaseUrl` | "Public" can be confused with `access.mode=public`; this value is the visitor-facing URL used in generated links. | `access.visitorBaseUrl`; friendly label **Map Link Base URL** |
| `access.debugToken` | It can gate monitoring/debug APIs, so the short name understates that it is a privileged static credential. | `access.debugApiToken` or `access.operationsToken` |
| `features.experimentalDetails` | Does not say the feature is terrain/detail generation. | `features.experimentalTerrainDetails` |
| `features.lazyMobIcons` | "Lazy" is developer terminology and does not describe the admin-visible result. | `features.onDemandMobIcons` |
| `map.*` | Too broad next to the whole Terrascape map; the keys actually govern map tiles/regions. | Split into explicit `mapTiles.*` and `mapRegions.*` namespaces. |
| `map.tileSize` | Does not identify that this is the pixel width/height allocated to each chunk in a generated map image. | `mapTiles.chunkImageSizePixels` |
| `map.maxRegionRadius` | Omits subject context and unit. | `mapRegions.maxRequestRadiusChunks` |
| `map.generateRadius` | Does not say that it limits on-demand generation around the requested map-region center, in chunks. | `mapRegions.onDemandGenerationRadiusChunks` |
| `entities.mobRadarRadius` | "Radar" is viewer jargon; the server performs a mob scan. The unit is hidden. | `entities.mobScanRadiusBlocks` |
| `cache.memoryTerrainEntries` | Word order differs from the `max*` limit convention used elsewhere. | `cache.terrainMemoryMaxEntries` |
| `mesh.terrainFormatVersion` | Looks tunable but is a release-managed cache compatibility value. | Keep the key for compatibility; label it **Terrain Cache Format (managed)**. |
| `showMobsEnabled`, `showPlayersEnabled`, `mapTilesEnabled`, `autoStreamEnabled` | `Enabled=false` actually means the admin forbids/forces off a viewer feature. | `showMobsAllowed`, `showPlayersAllowed`, `mapTilesAllowed`, `autoStreamAllowed` |
| Optional `<range>Enabled` keys | Here `Enabled=false` locks a value; it does not disable the underlying feature. This conflicts with toggle semantics. | `<name>UserAdjustable` |
| `<name>Default` for locked promotion controls | The value is fixed by the server, not merely a starting value. | `<name>Value` |
| `chunksLoadedAtOnce` | Describes neither the terrain subject nor that the value controls parallel work. | `terrainLoadConcurrency` |
| `tilesLoadedAtOnce` | Same ambiguity and inconsistent qualification versus terrain. | `mapTileLoadConcurrency` |
| `spawnPerFrame` | "Spawn" can mean entities; this actually paces promotion of downloaded terrain meshes into the scene. | `meshPromotionsPerFrame` |
| `spawnBudgetMs` | Omits the mesh-promotion subject and abbreviates the unit differently from properties keys. | `meshPromotionBudgetMillis` |
| `streamRadius` | Omits terrain, chunks, and radius semantics; the UI instead says "Voxel Mesh Distance." | `terrainMeshRadiusChunks`; UI **3D Terrain Radius (chunks)** |
| `mapTileRadius` / UI "Map Tile Distance" | Key and UI use different geometric terms and omit chunks. | `mapTileRadiusChunks`; UI **Map Tile Radius (chunks)** |
| `mobUpdateRate`, `playerUpdateRate` | Values are updates per second, but the unit is absent and internal controls store milliseconds. | `mobUpdatesPerSecond`, `playerUpdatesPerSecond` |
| UI "Chunks Loaded at Once" | Sounds like total loaded chunks rather than concurrent downloads/builds. | **3D Terrain Load Concurrency** |
| UI "Tiles Loaded at Once" | Same retained-count ambiguity. | **Map Tile Load Concurrency** |
| UI "Auto" | Too short to find or understand out of context. | **Auto-load Terrain** |
| UI "Bounds" | Does not identify which boundaries are drawn. | **Show Chunk Bounds** |
| UI "Shade Dark" | Grammatically awkward and less precise than the underlying control. | **Shade Darkness** |
| UI "Struct" | An unexplained abbreviation. | **Structures** |

Before selecting a replacement, verify actual behavior and units in code/tests. The table's
candidate names are a vocabulary decision record, not permission to rename keys speculatively.

### Compatibility rules for renames

- Documentation cleanup may introduce a preferred friendly term immediately, but must show the
  current exact key and list the old UI/search term as an alias.
- A config rename requires code support for both names. The new key wins when both are present,
  and startup emits a clear deprecation/conflict warning.
- Generated defaults use only the new key after migration support ships.
- Keep legacy aliases for at least one documented release cycle; remove them only in a breaking
  release with release notes and an example migration.
- Never silently reinterpret an existing key or change its unit. Introduce a new unit-explicit
  key and convert the legacy value at the compatibility boundary.
- Rename one concept consistently across loader records, client contract, UI label, logs, tests,
  and docs. If an internal identifier must remain, it should not leak into admin prose.
- Maintain a searchable migration table with old key, new key, first supported version,
  deprecation version, removal version, and conflict precedence.

## Documentation shape

### 1. Start here

Keep the README path short:

1. Confirm this is a dedicated-server mod; players need only a browser.
2. Put the jar in the active save's `mods/` folder.
3. Start once and confirm the log message.
4. Open the local URL.
5. Link to "publish to other players," "restrict access," and the full admin guide.

### 2. Terse configuration reference

Create one scannable, canonical reference with one row per exact key. Each row must contain:

| Field | Required content |
| --- | --- |
| Key | Exact copyable key |
| File | `terrascape.properties` or `server-config.json` |
| Type / values | Boolean, integer range, enum, list, byte size, path, URL, or duration |
| Default | Effective shipped default |
| Summary | One plain-language sentence |
| Applies | Restart, first run, or live/browser-session behavior |
| Impact | Security, privacy, CPU, memory, disk, network, browser, or none |
| Details | Link to the owning cluster section |

Use aliases and nearby search terms where the UI label differs from the key, for example
"Voxel Mesh Distance" → `streamRadius*` and "web port" → `http.port`.

### 3. Detailed configuration clusters

Explain related settings together instead of repeating isolated definitions:

| Cluster | Reader question | Configuration families |
| --- | --- | --- |
| Install and first start | Where do the jar, config, and runtime files go? | install paths and generated files |
| Reachability | How do browsers connect? | `http.*`, firewall/port assignment, reverse proxy |
| Access and identity | Who can see or control the map? | `access.*`, permissions, tokens, `features.webConsole` |
| Worlds and privacy | Which world data is exposed? | `worlds.*`, public/restricted access |
| Browser workload policy | What may viewers request/render? | all `server-config.json` controls |
| Terrain generation | How do mesh throughput and timeouts interact? | `mesh.*`, stream/load controls |
| Map tiles | How much backdrop data is generated and loaded? | `map.*`, map-tile radius/concurrency |
| Entities | How often and how far are players/mobs observed? | `entities.*`, entity feature gates/update rates |
| Memory and storage | Where is data kept and how is it bounded/cleared? | `cache.*`, `folders.*`, clear-cache workflow |
| Assets and avatars | Where do optional visuals come from? | asset folders, avatars, lazy mob icons |
| Diagnostics and validation | Which observability/debug surfaces are enabled? | telemetry, metrics, debug, smoke validation |
| Cross-origin integrations | When is CORS actually needed? | `cors.*` |
| Remote administration | When and how should RCON be enabled? | `rcon.*` |

Each cluster must include: a short recommendation, settings table, how the settings interact,
safe example, risky example where useful, change procedure, verification, troubleshooting,
and rollback.

### 4. Reverse-find routes

Add an index that starts from common intent or symptoms:

- Install on a local machine / hosted panel / headless server.
- Let another computer connect.
- Use a domain or HTTPS.
- Fix a generated link that contains localhost, `0.0.0.0`, or the wrong port.
- Make the map public or require personal links.
- Grant map access without granting admin access.
- Revoke one link or invalidate all links.
- Hide worlds.
- Reduce server CPU, memory, disk, or network load.
- Reduce browser loading or frame hitches.
- Fix missing players, mobs, avatars, mob icons, terrain, or tiles.
- Clear stale data safely.
- Diagnose a config value that was ignored, clamped, or replaced by a default.
- Identify which configuration file owns a viewer control.

Troubleshooting entries must point back to exact keys rather than ending with generic advice.

## Configuration inventory to cover

This is the code-backed coverage checklist as of 2026-08-10. Check an item only after it has
both a terse reference entry and detailed cluster coverage.

### `terrascape.properties` (50 keys)

- [ ] HTTP: `http.host`, `http.port`
- [ ] Worlds: `worlds.allowlist`
- [ ] Folders: `folders.terrainCache`, `folders.mapRegionCache`, `folders.samples`,
  `folders.playerAvatars`, `folders.mobIcons`, `folders.assetsRoot`, `folders.assetsZip`
- [ ] Mesh: `mesh.terrainFormatVersion`, `mesh.terrainTimeoutSeconds`,
  `mesh.batchTerrainTimeoutSeconds`, `mesh.maxBatchChunks`, `mesh.maxConcurrentGenerations`
- [ ] Cache: `cache.memoryTerrainEntries`, `cache.memoryTerrainBytes`,
  `cache.memoryMapRegionEntries`, `cache.memoryMapRegionBytes`, `cache.memoryMapTileEntries`
- [ ] Features: `features.experimentalDetails`, `features.clientTelemetry`,
  `features.playerAvatars`, `features.lazyMobIcons`, `features.mobDebugEndpoint`,
  `features.entityStream`, `features.metricsEndpoint`, `features.webConsole`
- [ ] Map: `map.tileSize`, `map.maxRegionRadius`, `map.generateRadius`
- [ ] Entities: `entities.maxMobSnapshots`, `entities.mobRadarRadius`,
  `entities.streamIntervalMillis`, `entities.playerAvatarSize`,
  `entities.maxPlayerAvatarBytes`, `entities.playerAvatarCacheTtlSeconds`
- [ ] Validation: `validation.smokeTokensEnabled`
- [ ] Access: `access.mode`, `access.debugToken`, `access.mapTokenTtlHours`,
  `access.adminMapTokenTtlHours`, `access.publicBaseUrl`
- [ ] CORS: `cors.enabled`, `cors.allowedOrigins`
- [ ] RCON: `rcon.enabled`, `rcon.host`, `rcon.port`, `rcon.password`, `rcon.allowRemote`

For every numeric property, record the loader's accepted minimum and maximum, whether invalid
input falls back or clamps, and the unit. For paths, record relative-path resolution. For lists,
record separators and blank behavior. For byte sizes, record all accepted suffixes.

### Overrides

- [ ] General Java system properties: `terrascape.<key>` and `<key>`.
- [ ] HTTP: `TERRASCAPE_HOST`, `TERRASCAPE_PORT`.
- [ ] Assets: `TERRASCAPE_ASSETS_ROOT`, `HYTALE_ASSETS_ZIP`, `hytale.assets_zip`.
- [ ] Features/validation: `TERRASCAPE_EXPERIMENTAL_DETAILS`,
  `TERRASCAPE_WEB_CONSOLE`, `TERRASCAPE_VALIDATION_SMOKE_TOKENS_ENABLED`.
- [ ] Access: `TERRASCAPE_ACCESS_MODE`, `TERRASCAPE_ACCESS_DEBUG_TOKEN`,
  `TERRASCAPE_PUBLIC_BASE_URL`, and legacy `TERRASCAPE_PUBLIC_URL`.
- [ ] CORS: `TERRASCAPE_CORS_ENABLED`, `TERRASCAPE_CORS_ORIGINS`.
- [ ] RCON: `TERRASCAPE_RCON_ENABLED`, `TERRASCAPE_RCON_HOST`,
  `TERRASCAPE_RCON_PORT`, `TERRASCAPE_RCON_PASSWORD`, `TERRASCAPE_RCON_ALLOW_REMOTE`.
- [ ] Precedence and blank-value behavior.

### `server-config.json` (34 recognized keys)

- [ ] Toggles: `showMobsEnabled`, `showPlayersEnabled`, `mapTilesEnabled`,
  `autoStreamEnabled`.
- [ ] Selects: `mobUpdateRateOptions`, `mobUpdateRateDefault`,
  `playerUpdateRateOptions`, `playerUpdateRateDefault`.
- [ ] Sliders: the `Min`, `Max`, and `Default` keys for `chunksLoadedAtOnce`,
  `spawnPerFrame`, `spawnBudgetMs`, `streamRadius`, `mapTileRadius`, and
  `tilesLoadedAtOnce`.
- [ ] Optional locks: `<name>Enabled` for both update-rate selects and all six sliders.

Document the special handling for mesh-promotion settings: `spawnPerFrame*` and
`spawnBudgetMs*` are server-owned, disabled in the browser, restricted to the bundled hard
safety envelope, normalized when bounds are inverted, and clamped to an effective default.
Also document missing files/keys, unknown keys, wrong types, malformed JSON, and restart rules.

## Installation and process guides

Write and validate these as separate, linkable procedures:

- [ ] CurseForge install on a fresh local dedicated server.
- [ ] Manual jar install.
- [ ] Hosted-panel install, including active save, assigned web port, bind address, and panel
  firewall controls without assuming one provider's labels.
- [ ] Remote/headless Hytale device authentication, clearly separated from Terrascape access.
- [ ] LAN publishing.
- [ ] Internet publishing with restricted access.
- [ ] Domain and HTTPS reverse-proxy setup.
- [ ] Update with config/data preservation and duplicate-jar check.
- [ ] Roll back to the prior jar/config safely.
- [ ] Remove the mod while retaining data, and fully remove it after backup.
- [ ] Create, list, and revoke map links; explain permission changes versus token revocation.
- [ ] Clear browser cache, runtime cache, and disk cache without confusing their scopes.

## Image sequencing contract

Images supplied for admin workflows are evidence, not decoration.

- Store them under `images/docs/<process-slug>/` with ordered names such as
  `01-open-mods-panel.png`, `02-upload-jar.png`, and `03-confirm-startup.png`.
- Give every image descriptive alt text that states the action or success signal.
- Place each image immediately after the step it supports; do not create an unlabeled gallery.
- Crop around the relevant control while retaining enough page context to orient the reader.
- Redact tokens, passwords, account names, public IPs, save identifiers, and host credentials.
- Add a short caption when provider labels differ from Terrascape terms.
- Keep the written procedure complete when images cannot load or a hosting UI changes.
- Record the Terrascape version and provider/server UI version used for the sequence.

When images arrive, map each set to a process guide before editing so numbering, captions, and
cross-links stay stable.

## Current gap snapshot

The first audit found these concrete cleanup targets:

- `docs/server-admin-config.md` still labels implemented configuration as a proposal and contains
  stale example keys and unresolved design questions. Replace it with the canonical terse
  reference or clearly archive it after useful guidance is migrated.
- The operations manual lists viewer controls by label, but not every exact
  `server-config.json` key or optional `*Enabled` lock.
- `validation.smokeTokensEnabled` and the configuration override/precedence rules are not in the
  main configuration reference.
- Names currently mix radius/distance, load/concurrency, spawn/promotion, and multiple meanings
  of `Enabled`; the naming audit above must be resolved or deliberately preserved with aliases.
- Most numeric settings show a default but not the accepted bounds or clamp/fallback behavior.
- README manual-install text mentions generation of `terrascape.properties` but not
  `server-config.json`.
- CurseForge copy needs a copy-edit and must stay synchronized with the verified install flow.
- Existing troubleshooting is a good base, but needs exact-key links and explicit verification or
  rollback steps.

## Work order

1. Build a machine-checkable inventory from both loaders and bundled defaults.
2. Approve the preferred vocabulary and classify each naming candidate as documentation-only,
   compatible config migration, or intentionally unchanged.
3. Turn `server-admin-config.md` into the canonical terse key reference.
4. Restructure the operations manual around the detailed clusters and reverse-find routes.
5. Normalize installation wording across the operations manual, README, and CurseForge copy.
6. Insert supplied process images using the sequencing contract.
7. Perform a fresh install/config/access/cache walkthrough and log every unclear step.
8. Add a lightweight documentation drift check that fails when accepted keys or shipped defaults
   change without a reference update.

## Review checklist for every configuration entry

- [ ] Exact spelling and owning file
- [ ] Preferred friendly name, current key, legacy aliases, and UI label agree
- [ ] Shipped default and effective default behavior
- [ ] Type, units, allowed values, and hard bounds
- [ ] What changes and what does not change
- [ ] Related and conflicting settings
- [ ] Security, privacy, performance, or storage impact
- [ ] Restart/reload requirement
- [ ] Invalid, missing, blank, and malformed input behavior
- [ ] Example appropriate to a real operator task
- [ ] Verification command, log message, API/UI observation, or file check
- [ ] Safe rollback
- [ ] Search aliases and links from relevant symptoms/tasks
- [ ] Code/test source checked for the release being documented
