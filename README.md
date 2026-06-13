# SynthTerrascape

## Shared Reference Docs

Shared Synthborn/Hytale reference material lives in [`../synthborn-basecamp/docs/`](../synthborn-basecamp/docs/README.md). For generated lookup data, start at [`../synthborn-basecamp/docs/refs/`](../synthborn-basecamp/docs/refs/README.md): SDK signatures, labels, recipes/loot, prefab indexes, and asset notes.

## Build

```sh
./gradlew build
```

The Gradle build compiles the Java plugin and runs `npm run build:web` for the bundled web UI.

## Remote Deploy

Terrascape owns its deployment script in this repo. Configure the remote Mac once:

```sh
cp remote-host.env.example remote-host.env
```

Normal loop:

```sh
node tools/deploy.js restart
```

Useful variants:

```sh
node tools/deploy.js targets
node tools/deploy.js status
node tools/deploy.js stop --force
node tools/deploy.js start --wait
node tools/deploy.js logs -n 120
node tools/deploy.js grep "SynthTerrascape started|ERROR|WARN" -n 80
node tools/deploy.js rcon -- terrascape clearcache
```

Target defaults:

```text
Save: synth-worldview-mvp
Game: macbook-server.org:5521
RCON: macbook-server.org:25578
```

## Combined Integration Target

The `combined` target runs SynthRCON, SynthUnits, SynthOverseer, and SynthTerrascape
in one integration save.

```sh
# Remote Mac integration save
node tools/deploy.js --target combined restart

# Local integration save; set HYTALE_LOCAL_SAVES/HYTALE_LOCAL_INSTALL if platform defaults do not apply
node tools/deploy.js --target combined --local restart
```

Target defaults:

```text
Save: synthborn-combined
Game: macbook-server.org:5522
RCON: macbook-server.org:25579
Terrascape HTTP: macbook-server.org:5961
```

## Tools

Terrascape-specific diagnostics live in this repo.

| Tool | Purpose | Usage |
|------|---------|-------|
| `tools/probe-blocks.js` | Query the Terrascape HTTP worldview probe around a coordinate and print block/layer summaries. | `node tools/probe-blocks.js --world default --at -1370 131 -1213`; add `--url`, `--out`, or `--summary-only`. |
| `tools/parse-client-log.js` | Summarize Terrascape client telemetry events from a log file. | `node tools/parse-client-log.js <log-path>` |
| `tools/bridge-probe.json` | Sample probe response for comparison and regression notes. | Data fixture only. |
