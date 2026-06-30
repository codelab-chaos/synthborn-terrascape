# Terrascape Operations Manual

A task-oriented runbook for building, deploying, exposing, and operating the
Terrascape web map server. It is aimed at **server owners and admins** — this is the
complete server + configuration guide.

Each section answers "**how do I do X**" rather than documenting internals. For how
players actually *use* the web viewer (controls, panels, follow modes), see
[Using the map viewer](../README.md#using-the-map-viewer) in the README.

> Conventions: shell commands run from the repo root unless noted. "The server"
> means the Hytale dedicated server running the Terrascape mod, which serves the
> viewer over HTTP.

---

## Quick reference

| Thing | Value |
| --- | --- |
| Web viewer port | `5960` (`http.port` default) |
| Default bind | `127.0.0.1` (localhost only — set `0.0.0.0` to expose) |
| Plugin jar | `build/libs/Terrascape-<version>.jar` |
| Install location | `<save>/mods/` |
| Plugin data dir | `<save>/mods/terrascape/` |

| Task | Command |
| --- | --- |
| Build the jar (+ web bundle) | `./gradlew build` |
| Build web bundle only | `npm run build:web` |
| Install the jar into a local save | `./gradlew deploy` |
| Run unit tests (Java + web) | `npm test` |
| Run live e2e suite | `npm run testlive` |
| Run perf suite | `npm run perf` |

> The `npm run deploy*` commands are the Synthborn project's own scripted deploy
> harness (SSH + RCON, and a multi-mod `combined` target) — see
> [Deploy & server lifecycle](#deploy--server-lifecycle). For a standalone Terrascape
> install, the jar drop above is all you need.

---

## Build & package

**To build the deployable plugin jar:**

```sh
./gradlew build
```

This chains `buildWeb` (webpack → `src/main/resources/web/dist/terrascape.js`) →
`processResources` → `fatJar`, producing `build/libs/Terrascape-<version>.jar`
with all web assets (`index.html`, `styles.css`, `npc-details.json`, textures,
and the JS bundle) packaged inside.

**To rebuild only the browser bundle** (after editing TypeScript under `web/src/`):

```sh
npm run build:web
```

The bundle (`web/dist/terrascape.js`) is a generated artifact — it is gitignored
and produced fresh on every build. Do not edit or commit it.

---

## Deploy & server lifecycle

### Installing Terrascape (standalone)

Terrascape runs on its own — it needs no companion mods. To install or update it:

1. Get the jar — build it (`./gradlew build` → `build/libs/Terrascape-<version>.jar`)
   or download a release.
2. Copy the jar into your save's `mods/` folder. Locally, `./gradlew deploy` does this
   for you (override the destination with `-PmodsDir="/path/to/save/mods"`).
3. Restart the Hytale server through your normal server controls.
4. Clear server-side caches when needed with `/terrascape clearcache` in-game.

That's the whole lifecycle for a standalone install.

### Synthborn deploy harness (developers)

This is for **Synthborn developers**, not mod installers — Terrascape installs and runs
standalone (above), and every installer-facing section of this manual assumes that.

The repo ships a scripted deploy harness (`tools/deploy.js`) used to push to the
Synthborn project's own servers for automated deployments. It deploys over SSH and drives
restart/start/stop/health through **Terrascape's own embedded RCON** (the `default`
target no longer ships a separate RCON mod). It can also co-deploy other Synthborn addons
via the `combined` target. **None of it is required to run Terrascape standalone.** The
broader cross-addon setup will be covered in the forthcoming Synthborn integration docs.

> **Command execution needs the RCON password.** `stop`/`restart`/`rcon` send commands
> through embedded RCON, which accepts only `rcon.password` from `terrascape.properties`.
> Put the same value in local `SYNTH_RCON_PASSWORD`. `start`, `status`, `build`,
> `deploy`, and `wipe` do not need that password. (The `combined` target still uses the
> separate Synthborn RCON mod, which is internal/unpublished.)

**First-time setup** — copy the example env file and fill it in:

```sh
cp remote-host.env.example remote-host.env   # repo root, gitignored
```

| Key | Purpose |
| --- | --- |
| `HYTALE_REMOTE_SSH` *or* (`HYTALE_REMOTE_HOST` + `HYTALE_REMOTE_USER`) | SSH target (an alias from `~/.ssh/config`, or user@host) |
| `HYTALE_REMOTE_SAVES` | Path to the Hytale `Saves` directory on the server |
| `HYTALE_REMOTE_INSTALL` | Path to the Hytale install on the server |
| `SYNTH_RCON_PASSWORD` | Same value as server-side `rcon.password`; required for RCON commands |

Optional: `SYNTH_RCON_HOST` (override RCON/health host), `HYTALE_LOCAL_SAVES` /
`HYTALE_LOCAL_INSTALL` (for `--local` deploys; on WSL point `HYTALE_LOCAL_SAVES` at the
Windows `…/Hytale/UserData/Saves` mount).

**First install on a fresh server is manual** — there's no RCON to automate the very
first transition (the harness stops a server *through* RCON, which the old/absent build
doesn't have). Bring up a clean Terrascape install like this:

```sh
node tools/deploy.js wipe                 # dry run — lists what would be removed
node tools/deploy.js wipe --yes           # remove old Synthborn jars + data dirs (keeps Hytale builtins)
node tools/deploy.js deploy               # copy the new Terrascape jar (no RCON/token needed)
node tools/deploy.js start                # starts with Terrascape RCON enabled
```

After first start, edit the generated server-side `terrascape.properties` and set
`rcon.password=<long random password>`, then restart the server. Put that same password in
local `remote-host.env` as `SYNTH_RCON_PASSWORD` before running command-driving operations
such as `restart`, `stop`, or `rcon`. `status` checks RCON health and does not need a
password.
`wipe` only touches this repo's own jars and their `<Group>_<Name>` data dirs (current +
legacy names from `deploy-config.js`); `--keep-data` preserves the data dirs, and `--yes`
is required to actually delete. Add `--local` to operate on the local save instead of SSH.

**Commands:**

| Task | Command |
| --- | --- |
| Build + deploy + restart + verify | `npm run deploy` |
| Health check only | `npm run deploy:status` |
| Tail logs (120 lines) | `npm run deploy:logs` |
| Search logs | `node tools/deploy.js grep "<pattern>" -n 200` |
| Stop / start without redeploy | `node tools/deploy.js stop` / `start` |
| Show newest deployed jar | `node tools/deploy.js newest` |
| Send an RCON command | `node tools/deploy.js rcon -- terrascape clearcache` |
| Wipe this repo's mods (clean install) | `node tools/deploy.js wipe [--yes] [--keep-data]` |
| List configured targets | `node tools/deploy.js targets` |

Useful flags: `--target <name>`, `--local` (skip SSH), `--max-ram N` / `--min-ram N`
(override JVM heap GB), `-n N` (log line count). The `combined` target additionally
co-deploys other Synthborn addons — the project's integration save, which will be
documented in the forthcoming Synthborn integration docs.

---

## Making the map site public

**To make the map viewer reachable from outside the server host:**

1. **Bind to all interfaces.** By default Terrascape binds `127.0.0.1` (localhost
   only). In `terrascape.properties` set:

   ```properties
   http.host=0.0.0.0
   http.port=5960
   ```

   (Or via env: `TERRASCAPE_HOST=0.0.0.0`, `TERRASCAPE_PORT=5960`.)

2. **Open the firewall / port-forward** the web viewer port (`5960`, or whatever you
   set `http.port` to) on the host and any upstream network. The game's own UDP port
   should **not** be exposed for the map to work.

3. **Decide who can view it** (see [Access control](#access-control--tokens)):
   - Public read access → leave `access.mode=public` (default).
   - Token-gated → set `access.mode=restricted` and hand out map links.

4. **(If serving the viewer from another web origin)** enable CORS:

   ```properties
   cors.enabled=true
   cors.allowedOrigins=https://map.example.com
   ```

   When enabled, Terrascape echoes the matching request `Origin` back (never `*`)
   and allows credentials. Leave disabled if the browser loads the viewer from the
   same host:port that serves the API.

5. **(Recommended) front it with TLS.** Terrascape serves plain HTTP. For a public
   site, put it behind a reverse proxy (nginx/Caddy) terminating HTTPS, and set
   `access.publicBaseUrl=https://map.example.com` so in-game `/terrascape maplink`
   output points at the public URL.

6. **Restart** to apply: `npm run deploy` (or `node tools/deploy.js restart`).

---

## Access control & tokens

Terrascape has separate gates for map viewing, map-side command execution, static web
ops access, and standalone RCON. The naming rule is:

- `access.*Token*` = generated per-user map tokens, the static debug token, and map-token TTLs.
- `rcon.password` = static password for the standalone RCON service.

**To require a token for the map** (`access.mode=restricted`):

- Set in `terrascape.properties`: `access.mode=restricted`
  (or env `TERRASCAPE_ACCESS_MODE=restricted`).
- In `public` mode (default) anyone with network access can view the map.

**To mint a viewer link** (in-game, restricted mode):

- Run `/terrascape maplink` (or `/terrascape maptoken`). Requires the
  `terrascape.map.use` permission; admins additionally get an `admin`-scoped token.
- Viewer tokens last `access.mapTokenTtlHours` hours (default `24`). Tokens minted by admins
  with the `admin` scope last `access.adminMapTokenTtlHours` hours (default `4`). Minting is
  rate-limited per player (back-off 0s → 60s → 5m → 30m → 2h).
- The link carries the token as `?key=<token>`, which the browser promotes to a
  `terrascape_key` cookie. Tokens may also be sent as `Authorization: Bearer <token>`.
- Only a one-way HMAC-SHA256 hash of each token is stored (in `access-tokens.json`);
  the raw token can never be recovered from disk.

**To enable ops/monitoring endpoints without a user token** (static debug token):

- Set `access.debugToken=<secret>` (or env `TERRASCAPE_ACCESS_DEBUG_TOKEN`).
- Present it as `X-Terrascape-Debug-Token: <secret>` or `Authorization: Bearer
  <secret>`. This unlocks admin-scoped endpoints (`/api/metrics`,
  `/api/mob-debug/{world}`) even in restricted mode.

**What an unauthorized request gets** (restricted mode, no token): static pages
return a `401` "access required" page; API endpoints return
`401 {"ok":false,"error":"access_required"}`.

**To limit which worlds are visible:** set `worlds.allowlist=world1,world2`
(empty = all worlds visible).

---

## In-game commands & permissions

The `/terrascape` command is the in-game control surface. It uses two Hytale
permission nodes (both appear in `/perm` listings and tab-completion). The built-in
`hytale:Admin` group holds the `*` wildcard, so operators satisfy both automatically.

| Permission | Grants |
| --- | --- |
| `terrascape.map.use` | Mint a personal map link (`maplink` / `maptoken`) |
| `terrascape.admin` | All subcommands, plus an `admin`-scoped web session |

| Subcommand | Permission | Purpose |
| --- | --- | --- |
| `/terrascape maplink` | `terrascape.map.use` | Mint a shareable map link (token in the URL) |
| `/terrascape maptoken` | `terrascape.map.use` | Mint just the raw token |
| `/terrascape status` | `terrascape.admin` | Print server/HTTP status |
| `/terrascape sample <chunkX> <chunkZ>` | `terrascape.admin` | Write a terrain sample to the `samples/` folder |
| `/terrascape clearcache [all\|mesh\|tiles]` | `terrascape.admin` | Clear server caches (default `all`) |

> **Do not grant `terrascape.admin` to regular players** — it can inspect server
> state, write sample terrain files, and delete cache files under the data directory.

**To let a player use the web map**, grant the map node with the native permission
commands (no Terrascape-specific allowlist); they then run `/terrascape maplink`:

```text
/perm user <player> add terrascape.map.use     # one player
/perm group <group> add terrascape.map.use     # everyone in a group
/perm user <player> remove terrascape.map.use  # revoke
```

### Token scopes

Each minted token carries **scopes** — a capability snapshot of the minting player's
permissions at `maplink` time. Scope changes take effect on the next mint (bounded by
the token TTL).

| Scope | Granted to | Unlocks |
| --- | --- | --- |
| `map` | any `terrascape.map.use` holder | the viewer and read-only map APIs |
| `admin` | `terrascape.admin` holders | admin-only web APIs and the map API command proxy |

Because scopes ride in the token, an admin who opens the map with their own link
reaches admin APIs without any shared secret. Privileged debug APIs must still be enabled
by config (`features.mobDebugEndpoint` defaults to `false`); when enabled, a caller is
authorized by **either** an `admin`-scoped token **or** the configured
`access.debugToken`.

### Map API command proxy

The bundled Terrascape browser client must run server commands only through the map API:

- `POST /api/rcon/command` with `{"command":"<cmd>"}`.
- Requires a valid per-user map token carrying both `map` and `admin` scopes.
- This endpoint is still locked when `access.mode=public`; public visibility alone is not
  a command credential.
- `access.debugToken` and `rcon.password` do not authorize this endpoint.

This route is for browser/map workflows. Standalone RCON below is a separate operator/tooling
surface with its own password and port.

---

## RCON (optional command endpoint)

RCON is an opt-in HTTP/JSON endpoint that runs server commands remotely. **It is hard
off by default** (`rcon.enabled=false`) — installing Terrascape does not open it. It is
disabled-and-fail-closed, so it never runs commands without the configured RCON password.

**To enable it**, set both the enable flag and a password in `terrascape.properties`:

```properties
rcon.enabled=true
rcon.password=<long random password>
```

The password lives only in the server-side config file; the web interface does not serve
`terrascape.properties`, `server-config.json`, or `access-tokens.json`.

- **RCON password required** — map tokens, admin-scoped map tokens, `access.debugToken`,
  map API command-proxy credentials, missing passwords, and wrong passwords do not authorize
  standalone RCON commands.
- **Every command request needs the password**, sent as `X-SynthRCON-Token: <password>` or
  `Authorization: Bearer <password>`.
- **Localhost-only** by default (`rcon.host=127.0.0.1`); non-loopback callers are rejected
  unless `rcon.allowRemote=true`, which still requires the RCON password.

| Key | Default | Purpose |
| --- | --- | --- |
| `rcon.enabled` | `false` | Master switch — off until explicitly enabled |
| `rcon.host` | `127.0.0.1` | Bind address (localhost unless exposing) |
| `rcon.port` | `25578` | Terrascape's reserved RCON port (each mod uses its own) |
| `rcon.password` | _(blank)_ | Shared RCON password; required when enabled |
| `rcon.allowRemote` | `false` | Permit non-loopback callers (password still required) |

Each key also has a `TERRASCAPE_RCON_*` env override for bind settings, e.g.
`TERRASCAPE_RCON_ENABLED`. For the developer deploy harness, set local
`SYNTH_RCON_PASSWORD` to the same value as server-side `rcon.password`.

**Wire contract** (stable across mods, so one mod can call another's port):

- `GET /health` → `{"ok":true,"service":"Terrascape"}`
- `POST /command` with `{"command":"<cmd>"}` and header `X-SynthRCON-Token: <password>` →
  `{"ok":true,"command":"…","messages":[…]}`

> RCON runs commands with full server authority — treat `rcon.password` like a root
> password. Keep the endpoint on localhost or behind a trusted network, and never expose
> the port publicly. (A future admin-token-gated web console will offer a safer
> in-browser path.)

---

## Configuration reference

`terrascape.properties` is created in the plugin data directory on first run, with
documented defaults. **Restart the server after editing it.** Resolution order
(highest wins): `terrascape.*` / unprefixed system properties → `TERRASCAPE_*` env
vars → the properties file → built-in defaults. Relative folder paths resolve under
the data directory.

**To override a key without editing the file**, pass a system property — prefix the
key with `terrascape.`:

```sh
-Dterrascape.http.port=8080
```

The common boot options also have environment-variable overrides:

| Key | Purpose | Env override |
| --- | --- | --- |
| `http.host` | Bind address (keep `127.0.0.1` unless a proxy/firewall is ready) | `TERRASCAPE_HOST` |
| `http.port` | Web server port | `TERRASCAPE_PORT` |
| `access.mode` | `public` or `restricted` view gating | `TERRASCAPE_ACCESS_MODE` |
| `access.publicBaseUrl` | URL used in `/terrascape maplink` output | `TERRASCAPE_PUBLIC_URL` |
| `access.debugToken` | Static token for ops/debug web endpoints | `TERRASCAPE_ACCESS_DEBUG_TOKEN` |
| `rcon.password` | RCON command password | `TERRASCAPE_RCON_PASSWORD` |
| `cors.enabled` | Allow cross-origin browser apps to call the APIs | `TERRASCAPE_CORS_ENABLED` |
| `cors.allowedOrigins` | Comma-separated exact origins when CORS is on | `TERRASCAPE_CORS_ORIGINS` |
| `features.experimentalDetails` | Enhanced terrain detail requests | `TERRASCAPE_EXPERIMENTAL_DETAILS` |
| `folders.assetsRoot` | Extracted Hytale asset root for lazy mob icons | `TERRASCAPE_ASSETS_ROOT` |
| `folders.assetsZip` | `Assets.zip` path for lazy mob icons | `HYTALE_ASSETS_ZIP` |

Key groups (see the generated file's comments for the full list and defaults):

| Group | Purpose | Notable keys |
| --- | --- | --- |
| `http.*` | Network binding | `http.host` (`127.0.0.1`), `http.port` (`5960`) |
| `access.*` | View gating, debug auth, and generated map-token TTLs | `access.mode` (`public`), `access.debugToken`, `access.mapTokenTtlHours` (`24`), `access.adminMapTokenTtlHours` (`4`), `access.publicBaseUrl` |
| `cors.*` | Cross-origin | `cors.enabled` (`false`), `cors.allowedOrigins` |
| `rcon.*` | Command endpoint (opt-in) | `rcon.enabled` (`false`), `rcon.port` (`25578`), `rcon.password` — see [RCON](#rcon-optional-command-endpoint) |
| `worlds.*` | Visibility | `worlds.allowlist` |
| `features.*` | Endpoint toggles | `entityStream`, `playerAvatars`, `clientTelemetry`, `metricsEndpoint`, `mobDebugEndpoint` (`false`), `experimentalDetails` |
| `map.*` | Map tiles | `map.tileSize` (`32`), `map.generateRadius` (`20`), `map.maxRegionRadius` (`108`) |
| `mesh.*` | Terrain meshing | `mesh.terrainFormatVersion` (`v26`), `mesh.maxConcurrentGenerations` (`1`), timeouts |
| `cache.*` | In-memory caches | terrain / map-region / map-tile entry & byte limits |
| `entities.*` | Live feed | `maxMobSnapshots` (`256`), `mobRadarRadius` (`500`), `streamIntervalMillis` (`1000`) |

Client-facing display toggles live in a separate `server-config.json` (data dir):
`showMobsEnabled`, `showPlayersEnabled`, `mapTilesEnabled`, `autoStreamEnabled`
(all default `true`). These are published in `/api/worlds` and gate live results.

---

## Running-server file layout

After installing the Terrascape jar and starting the server once, the save folder
looks like this. The jar lives in `<save>/mods/`; Terrascape's runtime files live in
its plugin data directory, which the Hytale server names `<Group>_<Name>` from the
manifest — for Terrascape that is `com.codelabchaos_Terrascape`.

```
<Hytale Saves>/
└── <your-save>/
    ├── logs/                                # server logs
    ├── mods/
    │   ├── Terrascape-<version>.jar          # the Terrascape plugin
    │   └── com.codelabchaos_Terrascape/      # ── Terrascape plugin data directory ──
    │       ├── terrascape.properties         # config (created on first run)
    │       ├── server-config.json            # client display toggles
    │       ├── access-tokens.json            # hashed map tokens + HMAC secret
    │       ├── terrain/                      # cached terrain mesh GLBs
    │       ├── map-region/                   # cached map-region PNGs
    │       ├── map-tile/                     # cached map-tile PNGs
    │       ├── samples/                      # /terrascape sample output
    │       ├── player-avatars/               # cached player skin PNGs
    │       └── mob-icons/                    # cached/lazy-loaded mob icons
    └── …                                     # Hytale's own save data (world, region files)
```

Notes:
- This assumes Terrascape is the only mod installed. Other mods (including Hytale's own
  builtins like `Hytale_HytaleGenerator`) sit alongside under `mods/` and don't affect it.
- The folder names under the data dir are configurable via the `folders.*` keys —
  the tree shows the defaults (`terrain`, `map-region`, `samples`,
  `player-avatars`, `mob-icons`).
- `access-tokens.json` holds only HMAC hashes + a secret key; it is safe against
  token recovery but should still not be world-readable.
- The cache directories are safe to delete when the server is stopped (or cleared
  live with `/terrascape clearcache` in-game); they rebuild on demand.
- The data directory name is derived from the manifest `Group`/`Name`; confirm the
  resolved path from the startup log line `Terrascape config loaded from …`.

---

## Validate & test

| Task | Command |
| --- | --- |
| Both unit tiers (Java + web) | `npm test` |
| Java unit tests only | `npm run test:java` |
| Web unit tests only | `npm run test:web` |
| Unit tests with coverage (both) | `npm run test:unit` (alias for `npm run coverage`) |
| Live browser e2e suite | `npm run testlive` |
| e2e headed / UI mode | `npm run testlive:headed` / `npm run testlive:ui` |
| Full release gate | `npm run test:release` (both unit tiers + `testlive`) |

`testlive` builds the bundle then runs Playwright against the served viewer — it
needs a reachable Terrascape server (URL resolved from `remote-host.env` /
`TERRASCAPE_URL`).

---

## Performance

| Task | Command |
| --- | --- |
| Default suite (wet then dry) | `npm run perf` |
| Warm-cache pass only | `npm run perf:dry` |
| Cleared-cache pass only | `npm run perf:wet` |
| Fast smoke gate | `npm run perf:smoke` |
| Full scenario matrix (×2) | `npm run perf:extensive` |
| Radius sweep | `npm run perf:radius` |
| Mob-view suite | `npm run perf:mob` |
| Capture a baseline | `npm run perf:baseline` |
| Serve metrics report | `npm run perf:report` |
| Deploy then measure | `npm run perf:postdeploy` |

Any extra flags pass through to the tool, e.g.
`npm run perf:extensive -- --wet` or
`npm run perf:postdeploy -- --extensive --clear-server-cache`. Run
`node tools/run-terrascape-perf.js --help` for the full flag list (`--runs`,
`--enforce`, `--threshold`, `--headed`, …).

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Terrascape didn't start | server log should show `Terrascape started`; confirm the jar is in `<save>/mods/` |
| Map not reachable externally | `http.host=0.0.0.0`? firewall/port-forward open for the web viewer port? |
| Browser blocks API calls | cross-origin — set `cors.enabled=true` + `cors.allowedOrigins` |
| "access required" / 401 | `access.mode=restricted` — mint a link with `/terrascape maplink`, or set `access.mode=public` |
| Stale terrain / map tiles | `/terrascape clearcache` in-game, or stop the server and delete the cache folders |
| Where did config go? | startup log: `Terrascape config loaded from <path>` |
| Deploy harness can't connect | (developers) `remote-host.env` keys set? SSH alias reachable? `npm run deploy:status` |
```
