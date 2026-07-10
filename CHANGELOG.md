# Changelog

All notable user-facing changes to Synthborn: Terrascape are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add user-facing changes under Added, Changed, Fixed, Performance, Security, or
Compatibility. During release preparation, move them into a dated version section. -->

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

[Unreleased]: https://github.com/codelab-chaos/synthborn-terrascape/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/codelab-chaos/synthborn-terrascape/releases/tag/v0.1.0
