# Synthborn: Terrascape

Synthborn: Terrascape is a Hytale server plugin (`com.codelabchaos.terrascape`) that streams
live world terrain and entity data to a bundled Three.js web viewer. The server meshes
chunks into glTF over HTTP (`/api/terrain/<world>/<x>/<z>.glb`), publishes the world list
and feature flags (`/api/worlds`), and serves the browser app from the running mod jar.

## Project Layout

```
src/main/java/com/codelabchaos/terrascape/   Plugin: HTTP server, terrain mesher, commands, config
  ├─ terrain/                                 Chunk sampling, meshing, glTF writing
  ├─ web/                                      Embedded HTTP endpoints
  ├─ commands/                                 /terrascape admin command
  └─ config/                                   terrascape.properties loading
src/main/resources/
  ├─ manifest.json                            Hytale plugin manifest
  └─ web/                                       Browser viewer (served from the jar)
      ├─ index.html, styles.css, textures/     Static shell + assets
      ├─ dist/terrascape.js                    Webpack bundle (built, committed)
      └─ src/                                   TypeScript sources (entry: app.ts)
```

The web client is organized by concern:

| Folder | Responsibility |
|--------|----------------|
| `common/` | Pure logic — state, chunk planning, terrain request/stream, view & feed policies. Unit-tested. |
| `scene/` | Three.js scene: viewport, lighting, postprocessing, water, frame loop. |
| `terrain/` | Terrain loading, sourcing, and chunk placeholders/debug. |
| `tile-map/` | 2D map backdrop and instanced map tiles. |
| `entities/` | Entity feed, mob cards, NPC catalog, player markers, world-time feed. |
| `camera/` | Camera director and fly camera. |
| `ui/` | DOM/HUD: world selector, metrics, FPS, time ribbon, view persistence, readouts. |
| `platform/` | Client logging and mesh cache. |
| `library/` | Reusable UI controls (collapsible sections, dialogs, tri-state, control values). |

## Build

```sh
./gradlew build
```

The Gradle build compiles the Java plugin and runs `npm run build:web` (webpack) via the
`buildWeb` task, bundling the viewer into `src/main/resources/web/dist/terrascape.js`
before it is packaged into the jar.

## Testing

Web unit tests cover the pure-logic `common/` modules using TypeScript plus Node's
built-in test runner (not Jest). The focused unit compile lives at
[`tests/tsconfig.web-unit.json`](tests/tsconfig.web-unit.json). Playwright drives the
served viewer (`tests/terrascape.spec.js`) against the URL resolved from
`remote-host.env`.

```sh
npm run test:unit            # compile + run common/ unit tests
npm run test:unit:coverage   # unit tests with coverage on common/ modules
npm run test:web             # build the bundle, then Playwright against the viewer
npm run test:java            # Gradle Java tests
npm run test:release         # Java tests + web unit tests + Playwright suite
```

## Configuration

Terrascape creates `terrascape.properties` in the plugin data folder on first
startup. The file groups HTTP, world visibility, folder, mesh, cache, feature, map, and
entity options for server admins; any key can be overridden with a `-Dterrascape.<key>`
system property or the documented env vars. See [`CONFIGURATION.md`](docs/CONFIGURATION.md).

## Permissions

The `/terrascape` command is admin-only through `terrascape.admin`. Web debug/admin
surfaces are default-off or token-protected; see [`PERMISSIONS.md`](docs/PERMISSIONS.md).

## Deploy

Terrascape owns its deployment script in this repo. Configure the remote Mac once:

```sh
cp remote-host.env.example remote-host.env
```

The normal loop builds the target's modules, copies the jars to the save, restarts the
server, and waits for RCON health:

```sh
npm run deploy                 # node tools/deploy.js restart   (default target)
npm run deploy:combined        # node tools/deploy.js --target combined restart
npm run deploy:combined:local  # combined target, local save
```

### Command surface

`node tools/deploy.js [--target <name>] [--remote|--local] <command>`:

| Command | Purpose |
|---------|---------|
| `build` | Build the target's module jars only. |
| `deploy [--restart] [--verify]` | Copy jars to the save; optionally restart/verify. |
| `restart [--max-ram N] [--min-ram N]` | Stop, start, and wait for RCON health. |
| `start [--wait]` / `stop [--force]` | Lifecycle control. |
| `status` / `verify` | Health check / log verification. |
| `logs [-n N]` / `grep <pattern> [-n N]` | Tail or search server logs. |
| `newest` | Show the newest deployed jar. |
| `rcon -- <command>` | Run an RCON command, e.g. `rcon -- terrascape clearcache`. |
| `targets` | List configured targets. |

### Targets

| Target | Save | Game bind | RCON | Terrascape HTTP | Modules |
|--------|------|-----------|------|-----------------|---------|
| `default` | `synth-worldview-mvp` | `0.0.0.0:5521` | `25578` | — | SynthRCON, Terrascape |
| `combined` | `synthborn-combined` | `0.0.0.0:5522` | `25579` | `5961` | SynthRCON, SynthUnits, SynthOverseer, Terrascape |

The remote host (`macbook-server.org` by default) and save paths come from
`remote-host.env`. The `combined` target runs the full Synthborn integration save. See
[`REMOTE_DEPLOYMENT.md`](REMOTE_DEPLOYMENT.md) for the build → deploy → restart → verify
workflow; the web UI is served from the running jar, so resource changes only appear
after a restart.

## Tools

Terrascape-specific diagnostics and generators live in this repo.

| Tool | Purpose | Usage |
|------|---------|-------|
| `tools/probe-blocks.js` | Query the HTTP worldview probe around a coordinate and print block/layer summaries. | `node tools/probe-blocks.js --world default --at -1370 131 -1213` (`--url`, `--out`, `--summary-only`) |
| `tools/parse-client-log.js` | Summarize Terrascape client telemetry events from a log file. | `node tools/parse-client-log.js <log-path>` |
| `tools/sample-mob-feed.js` | Capture sample entity-feed payloads for fixtures/regression. | `node tools/sample-mob-feed.js` |
| `tools/generate-grid.js` | Generate grid/tile data for the map backdrop. | `node tools/generate-grid.js` |
| `tools/generate-npc-details.js` | Build `web/npc-details.json` from source data. | `node tools/generate-npc-details.js` |
| `tools/run-terrascape-perf.js` | Run the terrain/render performance suites. | `npm run perf` (`perf:dry`, `perf:wet`, `perf:smoke`, `perf:extensive`, …) |
| `tools/run-terrascape-mob-view-perf.js` | Run the mob-view performance suite. | `npm run perf:mob` |
| `tools/bridge-probe.json` | Sample probe response for comparison and regression notes. | Data fixture only. |

Performance suite configs live in `tools/perf-suite-*.json`. Post-deploy perf runs are
available via `npm run perf:postdeploy` and `perf:postdeploy:extensive`.

## Shared Reference Docs

Shared Synthborn/Hytale reference material lives in
[`../synthborn-basecamp/docs/`](../synthborn-basecamp/docs/README.md). For generated
lookup data, start at
[`../synthborn-basecamp/docs/refs/`](../synthborn-basecamp/docs/refs/README.md): SDK
signatures, labels, recipes/loot, prefab indexes, and asset notes.
</content>
</invoke>
