# Changelog

All notable user-facing changes to Synthborn: Terrascape are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add user-facing changes under Added, Changed, Fixed, Performance, Security, or
Compatibility. During release preparation, move them into a dated version section. -->

## [0.1.1-beta.2] - 2026-09-10

### Compatibility

- Updated the compile and test baseline to Hytale Server 0.6.5 (Update 6), with
  a minimum-only server requirement of `>=0.6.4`.
- Migrated terrain reads to chunk/section components and mob scanning to component
  queries; removed deprecated legacy entity and string-based health lookups.
- Refreshed the bundled NPC catalog to 999 roles from Update 6 assets.

### Fixed

- Restored terrain biome tint sampling after Update 6 removed `WorldChunk.getTint`.
- NPC catalog generation now uses current Basecamp labels instead of Overseer's
  separately maintained label copy.

## [0.1.1-beta.1] - 2026-07-14

### Added

- Added an identity-aware web chat console for personal map links, including private
  history, ordinary chat, permission-checked commands, captured command output, and
  keyboard/resizable-panel interactions.
- Added active-link listing and individual link revocation with safe link IDs.
- Added configurable public map-link base URLs for reverse-proxy and custom-domain
  deployments.
- Added Synthborn/Terrascape title hierarchy and an Early Access title stamp.

### Changed

- Personal map links now identify their player while the player is offline; opening the
  map no longer requires the linked player to be connected to the game server.
- Terrain promotion pacing is server-owned, range-checked, hidden from browser overrides,
  and documented with conservative starting values.
- The cache action is labeled **Clear Browser Cache** to make its client-only scope clear.
- User-facing roadmap material excludes internal delivery milestones.

### Fixed

- Registered Terrascape commands with command completion while keeping internal sample
  and smoke-token commands hidden.
- Web-console command authorization now resolves the linked player's current Hytale
  permissions, so ordinary users, moderators, and operators retain their normal command
  boundaries even while offline.
- Deployment now replaces older Terrascape jar versions instead of leaving duplicate
  plugin IDs in the server's `mods` directory.

### Performance

- Cached terrain meshes are read eagerly in one IndexedDB transaction, prepared in a
  deterministic near-first/noise order, and promoted within frame budgets without an
  artificial reveal timer.
- Terrain cache writes are coalesced into bounded IndexedDB transactions.
- Cached map tiles use independent acquisition and frame-budgeted scene promotion, with
  spatially staggered reveals and bounded network concurrency.

### Security

- Console endpoints require a current identity-bound personal map token; anonymous,
  synthetic, expired, revoked, and legacy unbound credentials fail closed.
- Request-scoped identity isolation, token revocation, rate limits, bounded input/history,
  and permission enforcement have focused Java, browser, and live regression coverage.

## [0.1.0] - 2026-07-09

### Initial beta core features

- **Live 3D world** — stream terrain meshes from a running Hytale server into an
  interactive browser map that updates as viewers move through the world.
- **Mobs & players** — display live mob cards with health, attack, and stack information,
  player markers, and an online-player sidebar.
- **Follow & first-person views** — focus on a player, follow them from an isometric
  camera, or view the world through their eyes.
- **Day/night cycle** — show the current world time in the sky ribbon and optionally
  synchronize map lighting with the server's day/night cycle.
- **Map-tile backdrop** — use top-down map tiles to fill the landscape beyond the loaded
  3D terrain meshes.
- **Tunable rendering** — configure mesh distance, shading, water, fog, cosmetic detail,
  visual detail, and loading budgets from the live settings panel.
- **Shareable links** — provide open-access maps or issue token-gated map links to
  individual players.

### Release scope

- **Dedicated-server mod** — install Terrascape on the server; map viewers need only a
  compatible web browser.
- **Hytale compatibility** — supports Hytale Server 0.5.x and requires Java 25 on the
  server.

[Unreleased]: https://github.com/codelab-chaos/synthborn-terrascape/compare/v0.1.1-beta.2...HEAD
[0.1.1-beta.2]: https://github.com/codelab-chaos/synthborn-terrascape/compare/v0.1.0...v0.1.1-beta.2
[0.1.1-beta.1]: https://github.com/codelab-chaos/synthborn-terrascape/compare/v0.1.0...v0.1.1-beta.1
[0.1.0]: https://github.com/codelab-chaos/synthborn-terrascape/releases/tag/v0.1.0
