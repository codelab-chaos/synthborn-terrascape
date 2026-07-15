# Synthborn: Terrascape Sprint Board

This is the active delivery board for the first public Terrascape alpha on the
CurseForge mod board.

Code is the source of truth. If this board disagrees with current implementation,
update the board unless the mismatch is intentionally being made into release work.
Historical MVP stories have been compressed near the bottom so the top of this file
stays focused on what must happen before release.

References:

- Capability inventory: `docs/terrascape-capabilities.md`
- Design reference: `docs/terrascape-design.md`
- Static snapshot specification: `docs/static-snapshot-spec.md`
- Operations manual: `docs/operations-manual.md`
- Architecture/performance review: `docs/terrascape-architecture-review.md`
- CurseForge moderation policy:
  `https://support.curseforge.com/support/solutions/articles/9000197279-moderation-policies`

## Status Legend

- `Open` - not started or not yet validated
- `In Progress` - work has started
- `In Review` - implemented or drafted, needs release review/evidence
- `Blocked` - waiting on a decision, dependency, or external state
- `Done` - accepted for the alpha release
- `Deferred` - intentionally not part of this alpha

## Current Focus

Current sprint focus: **Alpha 0 public release to CurseForge**.

The alpha release should prove that a server owner can install Terrascape as a
dedicated-server mod, start a Hytale server, open the browser map, and understand the
current limitations without needing Synthborn-internal context.

Release criteria are:

- Feature behavior is finalized through hands-on testing against the Apex-hosted
  dedicated validation server.
- The identity-aware web chat console is complete, permission-safe, and available only
  to visitors who opened a valid personal map link.
- User and admin docs explain exactly how to install, operate, secure, and troubleshoot
  the alpha.
- GitHub build automation produces the release artifact, and CurseForge deployment is
  automated if the platform allows it.
- A hidden CurseForge product page/install flow is tested from the downloaded artifact.
- The first public build is reviewed and submitted for CurseForge acceptance.

## Alpha Release Board

### Priority 1 - Finalize Features On Dedicated Servers

Status: Implemented; Mac dedicated-server RC validated, Apex-hosted validation pending

Release blocker: Yes

Acceptance:

- Apex-hosted validation covers a restricted provider environment that real server owners
  are likely to use.
- Feature behavior is considered stable enough for alpha: terrain loading, map tiles,
  players, mobs, time/lighting, settings, access mode, tokens, RCON, cache clearing, and
  first-run config generation, with the web chat console tracked separately in Priority 2.
- Validation notes identify server type, date, commit, artifact/build, Hytale version,
  host/network shape, and exact commands/URLs used.
- Release validation does not deploy to or mutate `synthborn-combined`.
- Any feature issue found during Apex-hosted validation is either fixed or explicitly
  listed as an alpha known limit before release.

Validation:

- Run `node tools/hosted-services/deploy.js build-test-deploy` to build/test locally and
  upload to the Apex-hosted validation environment.
- Restart the Apex server from the provider panel.
- Run `node tools/hosted-services/deploy.js validate` against the hosted server.
- Confirm `GET /api/worlds` returns at least one allowed world.
- Supply a current real personal map token to the hosted runtime smoke test, then validate
  standalone RCON and the identity-bound Terrascape console API without synthetic users.
- Run `npm run perf:smoke` and record the result.
- Validate public viewing with `access.mode=public`.
- Validate restricted viewing with a generated `/terrascape maplink`.
- Validate admin token behavior with `/terrascape maptoken`.
- Validate listing and individual revocation with `/terrascape tokens` and
  `/terrascape revoketoken <linkId>`.
- Validate the identity-bound web console and standalone RCON rejection/acceptance paths.
  Synthetic smoke tokens must remain unable to use the player console.
- Record results in the release evidence template.

Supporting tasks:

- Build the release candidate jar from a clean checkout.
- Run `./gradlew build`.
- Inspect the produced `build/libs/Terrascape-<version>.jar`.
- Confirm the jar contains `index.html`, `styles.css`, `dist/terrascape.js`,
  `npc-details.json`, `server-config.json`, and packaged static assets.

### Priority 2 - Ship The Identity-Aware Web Chat Console

Status: In Review; offline permission matrix validated, live-online chat validation pending

Release blocker: Yes

Goal:

Add a modern map-overlay chat console for identified server users. A personal
`/terrascape maplink` should establish the user's identity and permissions so ordinary
players can send chat, while moderators and administrators can use only the commands
their Hytale permissions allow.

User interface and interaction acceptance:

- The console is a top-level, semi-transparent overlay above the 3D map rather than a
  settings-panel control.
- The overlay has a modern, readable layout with a scrollable history, prompt/input,
  connection and error states, and clear minimize/close controls.
- The console is resizable within sensible minimum and maximum dimensions and adapts to
  narrow browser windows without covering the entire map.
- Pressing `T` while normal map controls are active opens the console and focuses the
  input cursor. It must not retrigger while typing in an input or another editable UI
  element.
- Hiding and reopening the console preserves history for the active browser session.
- History distinguishes player chat, server/system messages, submitted commands,
  command output, and errors. Persistence across page reloads must be decided and
  documented before implementation is accepted.
- When the console is unavailable, it is not rendered and the `T` shortcut does nothing.

Access and configuration acceptance:

- The console is shown only when the browser session contains a valid, unexpired token
  created for a real server user through `/terrascape maplink`.
- In `access.mode=public`, anonymous visitors may view the map but do not see or call the
  console. Opening a valid personal map link enables the console for that session.
- In `access.mode=restricted`, an ordinary valid map link grants map access and the
  user-level chat capability; additional command capabilities still depend on the
  identified user's permissions.
- A clearly named server-side setting, proposed as `features.webConsole`, can disable the
  console completely. Disabling it removes the advertised client capability and makes
  every console API fail closed; hiding only the UI is not sufficient.
- Expired, revoked, malformed, anonymous, or unresolvable identities cannot send chat or
  commands.

Identity and command-processing acceptance:

- Keep the existing `/terrascape maplink` experience, random token generation, URL/cookie
  handling, expiration, and one-way token hashing. This story does not introduce a
  separate console credential or token system.
- Extend the server-side token record so the stored token hash is associated with the
  minting player's stable UUID and enough display metadata to resolve the current server
  identity. Raw tokens remain one-way hashed at rest.
- The server exposes only the minimum session metadata the browser needs to render the
  console and available capabilities; the browser cannot assert or replace its identity.
- Ordinary text is delivered to in-game chat as the identified user, with an explicit
  web-origin marker if needed to prevent impersonation or moderation ambiguity.
- Online chat passes through `PlayerChatEvent`; offline `[Web]` chat is delivered directly
  and therefore bypasses event-based moderation plugins. This limitation is documented.
- The console API resolves the authenticated user from the presented map token and sends
  chat or slash-command input to Hytale as that user. The request body never supplies the
  authoritative username, UUID, or role.
- Slash commands are evaluated as that identified user through the Hytale permission
  system. Player, moderator, and administrator behavior follows their real permissions,
  not a client-provided role.
- If current permissions or identity cannot be resolved safely, command execution fails
  closed with a useful response.
- Console requests and results are logged with user UUID/name and action type, but never
  with raw access tokens or private message contents beyond the server's normal chat-log
  policy.
- The current generic `TerrascapeWeb` command sender, whose `hasPermission` methods always
  return `true`, is removed from the user-facing console path. No map token may become a
  full-authority command credential merely because it reached the endpoint.
- The existing `/api/rcon/command` transport is either replaced with a clearly named
  user-console API or narrowed so its authentication, identity, chat, and command
  semantics match this contract. Standalone password-based RCON remains separate.

Validation:

- Verify the console is absent for an anonymous public-map session and present after
  opening a valid personal map link.
- Verify `features.webConsole=false` disables both the overlay and all console endpoints.
- Verify `T` opens and focuses the prompt, does not fire while typing, and does not steal
  focus from other editable controls.
- Verify resizing, scrolling, hide/reopen history, narrow-screen layout, loading, error,
  disconnect, and expired-session states.
- Verify an ordinary player can send chat but cannot run unauthorized commands.
- Verify the same valid personal link can send marked web chat and authorized commands
  while its linked player is offline.
- Verify moderator and administrator commands are accepted or rejected using the
  identified user's actual Hytale permissions.
- Verify the in-game sender and audit log identify the map-link owner and cannot be
  spoofed by request payloads, cookies, headers, or browser state.
- Verify revoked/expired links, deleted users, malformed requests, oversized input,
  command timeouts, and reconnect behavior all fail safely.
- Add Java authorization/identity tests, web unit tests for console state and keyboard
  behavior, and a live browser test covering chat plus the permission matrix.
- Update the README, Operations Manual, and known limitations only after validated console
  behavior matches their claims. CurseForge listing copy is maintained separately.

Current implementation gap:

- Identity-bound tokens, Terrascape-owned `/api/console/*` endpoints, bounded chat
  history, the resizable overlay, `T`/`Esc` interactions, rate limits, and offline-capable
  identity/permission-bound chat and command dispatch are implemented with focused Java
  and browser unit coverage. Request-local auth isolation and individual token revocation
  have regression tests. The former browser `/api/rcon/command` full-permission sender has
  been removed.
- The 2026-07-14 Mac dedicated-server run validated one real identity-bound token while
  the player was offline: ordinary access could chat but not run Terrascape/admin commands,
  the kick permission admitted `/kick` argument validation without granting unrelated
  commands, and restoring the Admin group restored `/terrascape status`. The same token
  retained its scope throughout, proving command authorization consulted current Hytale
  permissions. Command output is captured in the linked browser session's history.
- A connected game client was not available during that run, so the online
  `PlayerChatEvent` path remains covered by Java tests rather than claimed as a live check.

### Priority 3 - Finish User/Admin Docs And Build Automation

Status: In Progress

Release blocker: Yes

Acceptance:

- User-facing docs explain what Terrascape is, how to open the map, and how to use the
  current viewer.
- Admin-facing docs explain install, first start, config, permissions, access tokens,
  CORS/TLS, RCON, cache clearing, validation, and troubleshooting.
- README viewer instructions match the current UI: flight controls, player modes,
  settings panel, mobs, mob blocks, map tiles, water, and render details.
- README install instructions match the CurseForge artifact name and hidden-page install
  path.
- `/terrascape` permissions and commands are documented.
- Docs explicitly call out current alpha limitations.
- GitHub Actions builds the jar from a clean checkout.
- GitHub Actions runs Java and web unit tests on PR/main.
- GitHub Actions produces a release artifact suitable for CurseForge upload.
- CurseForge deployment/upload is automated through GitHub if supported by the
  CurseForge project/API; if not, the manual upload process is documented.

Validation:

- Review README and operations manual against the release candidate.
- A fresh operator can follow the docs to install, start, open the map, run
  `/terrascape status`, create/list/revoke a link, and clear the cache.
- A GitHub workflow run shows successful build, Java tests, web tests, and artifact
  creation.
- CurseForge upload automation either succeeds in a dry run/staging path or is marked
  unsupported with a documented manual process.

Known-limit documentation must include:

- Current terrain sampling uses loaded chunks and the non-ticking chunk path; an
  explicit explored-chunk index guard is not yet implemented.
- Server-side disk cache limits are not yet enforced by count/bytes/age; admins can
  clear caches with `/terrascape clearcache`.
- Live mobs are an alpha layer: the map shows entities the server can honestly observe,
  but Hytale entity-source coverage may miss some nearby animals/NPCs/hostiles.
- Client terrain loading currently uses bounded concurrent single-GLB requests; the
  server batch endpoint exists but is not the active client path.
- Terrascape serves plain HTTP by default; public exposure should use firewall care,
  `access.mode=restricted` when appropriate, and TLS/reverse proxy guidance from the
  operations manual.

### Priority 4 - Validate Install From Hidden CurseForge Page

Status: Open

Release blocker: Yes

Acceptance:

- CurseForge project/listing exists as a hidden or draft product page.
- Hidden page has final-ish name, summary, description, categories, supported
  Hytale/server version, license, source link, screenshots, and install instructions.
- Listing copy clearly says Terrascape is a dedicated-server mod and players only need a
  browser link.
- CurseForge moderation checklist below is complete before submission.
- The hidden-page artifact is the validated release candidate from Priority 1.
- A fresh server install using the CurseForge interface/download starts successfully.
- First run creates `terrascape.properties` and `server-config.json`.
- The viewer opens at the configured host/port.
- `/terrascape status`, link management, and `/terrascape clearcache` work from the
  installed artifact.

Validation:

- Download/install through the hidden CurseForge interface, not from local build output.
- Test on a clean save or clean validation environment.
- Record exact CurseForge file/version, server environment, and install steps.
- Confirm the hidden page copy and screenshots match the installed behavior.

CurseForge moderation checklist:

- Name is `Synthborn: Terrascape`; it does not include the game name, loader, version,
  file version, or other technical metadata.
- Summary is one English sentence and is not copied verbatim from the description.
- Description starts with functional information: dedicated-server web map, live 3D
  terrain, players, mobs, time/lighting, access links, admin controls, and alpha limits.
- Project page includes install/use/support information directly on CurseForge, not only
  by linking to external docs.
- No external download links are included in the project description or release notes.
- Any source, issue tracker, Discord, docs, or other functional external links are kept
  clearly secondary to the CurseForge-hosted description.
- No donation, affiliate, personal-site, hosting-provider, portfolio, or cross-hosting
  promotional content appears above the functional project description; omit it unless it
  is release-critical.
- Avatar is a non-webp, non-solid, non-copyrighted 400x400 image; use
  `images/curseforge-avatar.png`.
- Gallery images are screenshots from the actual shipped viewer/server behavior. Any
  AI-generated, edited, or enhanced showcase image that could misrepresent the mod is
  avoided or clearly disclaimed.
- License is MIT, source link points to this project, and any third-party assets bundled
  in the jar have redistributable licenses/attribution recorded.
- File upload is the release-candidate jar produced by the validated build, with no
  unrelated preview images, docs, logs, credentials, or local validation files bundled.

### Priority 5 - Review And Submit First Build For Acceptance

Status: Open

Release blocker: Yes

Acceptance:

- Release notes summarize alpha capabilities, install steps, security defaults, known
  limits, validation evidence, and where to report issues.
- Release notes include Apex-hosted validation results.
- Release notes include commit, artifact, CurseForge file/version, test results, perf
  smoke result, access/security checks, and fresh install result.
- Architecture/performance review has an alpha disposition note or release decision.
- CurseForge listing, docs, release notes, artifact, and evidence all describe the same
  build.
- The first build is submitted for CurseForge acceptance.

Validation:

- Review release notes against README, operations manual, and CurseForge draft.
- Review all release evidence with the team.
- Submit the hidden-page build for acceptance.
- Record acceptance result and any reviewer feedback.

Architecture review disposition:

- Handled for alpha: eager batched browser-cache reads/writes, bounded concurrent terrain
  and tile acquisition, frame-budgeted terrain/tile promotion, spatial reveal ordering,
  shorter rise motion, and server-governed tuning bounds.
- Still valid but post-alpha: service extraction from `TerrascapeWebServer`, custom
  binary terrain format, primitive mesh buffers, greedy meshing, worker decode, and
  a region-atlas/instanced map backdrop. The current per-tile mesh path is responsive at
  bounded radii but the 1,089-tile default horizon is not a valid SwiftShader perf target.
- Needs explicit release decision: active client path no longer uses the server terrain
  batch endpoint.

## Current Code Truth Snapshot

This section summarizes the behavior the release board is based on.

### Implemented For Alpha

- Dedicated-server plugin shell, manifest, startup/shutdown lifecycle, and plugin data
  directory.
- Embedded JDK HTTP server serving the browser app and APIs.
- `terrascape.properties` config loader with defaults, env/system-property overrides,
  HTTP bind/port, world allowlist, folders, mesh limits, cache settings, feature flags,
  access mode, CORS, entities, and RCON.
- `server-config.json` for server-governed client controls such as mobs, players, map
  tiles, auto-stream, stream radius, load concurrency, and update rates.
- `/terrascape status`, `clearcache`, `maplink`, `maptoken`, `tokens`, and `revoketoken`.
- Public/restricted map access with generated per-user map tokens, admin scopes, safe Link
  IDs, active-link listing, and individual persisted revocation.
- Standalone RCON is opt-in, password-gated, and independent from map tokens.
- Heightfield terrain from real chunk data, GLB encoding, single terrain endpoint,
  memory/disk terrain cache, pending request coalescing, and generation semaphore.
- Server `/api/terrain/batch` and map batch endpoints exist, but the current browser
  terrain loader uses bounded concurrent single-GLB requests.
- Full-screen Three.js viewer, terrain streaming around camera movement, chunk retention
  and disposal, debug bounds, camera controls, saved view state, map tile backdrop, water
  modes, lighting/time ribbon, metrics, and browser cache clearing.
- Player feed, player markers, player focus/follow/eye view.
- Live mob feed and SSE entity stream with polling fallback.
- Mob badges/headshot blocks, static NPC detail lookup, generated/lazy icon serving, and
  category-based fallbacks.
- README, operations manual, deploy harness, test scripts, e2e suite, and perf tools.

### Known Alpha Gaps

- Explicit explored/unexplored chunk index guard is not implemented.
- Server disk caches do not yet enforce count/byte/age limits automatically.
- Live mob observation depends on current Hytale entity query coverage and should be
  treated as alpha.
- Client terrain batch loading is not currently wired despite the server batch endpoint.
- GitHub Release build and CurseForge upload workflows are implemented locally; the first
  tagged release, protected environment configuration, and real API upload remain to be
  validated.
- CurseForge listing/artifact validation is not complete.

## Post-Alpha Backlog

These items are intentionally not required for the first CurseForge alpha unless they
are promoted back into the release board above.

### Terrain Safety And Cache Policy

- Add explicit explored/on-disk chunk index guard before terrain reads.
- Add a configurable policy for loaded-only, non-ticking, or future async chunk reads.
- Enforce server disk cache limits by count, bytes, age, or operator policy.
- Mark stale chunks near players and refresh safely.
- Detect dirty chunks and notify viewers to reload affected terrain.

### Terrain Rendering And Data Path

- Decide whether to restore client terrain batch loading, replace it with a binary batch
  path, or remove/deprioritize the server batch endpoint.
- Replace boxed mesh builder storage with primitive growable arrays.
- Add custom binary terrain chunks and direct `BufferGeometry` construction.
- Move terrain decode/build to a Web Worker.
- Add greedy meshing for top and side quads.
- Add block texture atlas rendering.
- Add bounded exposed-face scanning below the heightmap.
- Revisit enhanced structure/tree/foliage detail generation behind server flags.
- Re-enable region LOD only after retain/load policy is stable.

### Map Tile Scale

- Decide between per-tile meshes and region-texture/instanced layers for the broad map
  backdrop.
- Add tile atlas or region cache keys to reduce texture/object churn at large radii.
- Keep map tile behavior measurable under perf gates.

### Entity And Mob Layers

- Improve live entity-source coverage for animals, NPCs, and hostiles.
- Keep the mob feed honest: do not smooth, cache, or invent missing live mobs.
- Add optional spawn-marker overlay separate from live mobs.
- Expand creature icon mapping/atlas coverage.
- Continue improving `npc-details.json` metadata quality.

### Static Snapshot Hosting

- Implement the cache-only exporter and static viewer mode defined in
  `docs/static-snapshot-spec.md`.
- Export only a bounded, administrator-selected world area and one compatible terrain
  profile; never generate unexplored chunks in the default export path.
- Validate the read-only package locally and from a GitHub Pages project subpath.
- Keep live entities, metrics, access credentials, chat, commands, and private server
  configuration out of the snapshot.
- Consider bounded cache prewarming only after the explored/on-disk chunk guard exists.

### Operations And Release Process

- Automate production deployment and post-deploy validation.
- Add richer release evidence capture.
- Add recurring perf baselines and trend reports.
- Add support/triage templates after the first public feedback arrives.

## Completed Work Summary

Historical MVP stories were compressed on 2026-07 for the CurseForge alpha board. Use git
history for detailed implementation notes. The current completed surface is:

### Platform And Server

- Plugin skeleton, manifest, lifecycle logging, and data directory creation.
- Config loader and default config file generation.
- HTTP server, static web assets, `/api/worlds`, terrain APIs, entity APIs, metrics, and
  command proxy.
- Admin command surface and permissions.
- Public/restricted map access, generated map tokens, static debug token for admin APIs,
  CORS, and opt-in standalone RCON.

### Terrain Pipeline

- Real `WorldChunk` terrain sampling for height/block/fluid/tint data.
- Block metadata color mapping and conservative fallback palette.
- Heightfield mesher, water primitive routing, GLB encoder, and terrain serving.
- Memory cache, disk cache, pending future coalescing, and generation concurrency limit.
- Experimental detail, water, and LOD work exists but some paths remain gated or parked.

### Browser Viewer

- Full-screen Three.js app with terrain loading and retained grid streaming.
- Fly camera, middle-mouse pan, capped zoom, keyboard navigation, coordinate readout, and
  saved camera/view state.
- Debug bounds, map tile backdrop, water modes, day/night ribbon, lighting controls,
  render metrics, resource disposal, and browser cache audit/clear.
- Server-driven UI control limits through `server-config.json`.

### Players, Mobs, And NPC Metadata

- Online player feed, markers, player list, focus/follow/eye-view controls, and player
  visibility toggle.
- Reopened mob feed, source diagnostics, SSE entity stream, polling fallback, mob
  visibility toggle, mob badges, headshot blocks, and category color/icon fallback.
- NPC detail generator and bundled `npc-details.json` lookup.
- Generated/lazy mob icon serving path.

### Docs, Tests, And Tools

- README with viewer, install, admin, build, test, and tool guidance.
- Operations manual with install/update, deploy, access, RCON, config reference,
  validation, performance, and troubleshooting.
- Java unit tests, web unit tests, Playwright live tests, release test command, perf
  smoke/extensive tools, deploy harness, and metrics report tooling.

## Release Evidence Template

```text
Release candidate:
Commit:
Artifact:
Artifact size:
Validation date:
Validated by:

Build:
Unit tests:
Apex-hosted validation:
Live browser tests:
Perf smoke:
Access/security checks:
Hidden CurseForge install check:
CurseForge submission:

Known issues:
Release decision:
```
