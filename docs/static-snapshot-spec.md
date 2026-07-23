# Terrascape Static Snapshot Specification

Status: Proposed, post-alpha

## Goal

Allow an administrator to export a bounded portion of Terrascape's existing terrain and
map-tile caches as a self-contained, read-only website. The exported site can be hosted
without Hytale or a running Terrascape server, including from a static host such as
GitHub Pages.

The snapshot should look and navigate like the normal Terrascape viewer while making it
obvious that its contents were captured at a specific time and are not live.

## Non-Goals

The first version does not:

- simulate a Hytale server or provide a writable/offline game;
- run chat, commands, RCON, access-link generation, or any other server API;
- export players, mobs, chat history, tokens, credentials, metrics, or private server
  configuration;
- generate unexplored chunks merely because they fall inside an export boundary;
- publish or manage a GitHub repository on the administrator's behalf; or
- replace the normal live Terrascape deployment mode.

## Operator Experience

An administrator selects a snapshot name, world, center chunk, radius, and terrain
profile. Terrascape scans the selected area and exports only valid cache entries that
already exist. The completed output directory can be previewed locally, zipped, copied
to any static web host, or committed to a repository configured for GitHub Pages.

The initial command surface is proposed as:

```text
/terrascape snapshot export <name> <world> <centerChunkX> <centerChunkZ> <radius> <profile>
```

The command is administrator-only, runs asynchronously, and reports progress, skipped
chunks, the final file count, and the final byte size. `profile` selects one compatible
mesh-cache layer, such as `surface` or `surface-details`; one export must not silently
mix terrain profiles.

The default export policy is `cache-only`. If a selected chunk lacks either requested
asset, the exporter records the omission and continues. It does not request the chunk
from Hytale or cause terrain generation.

## Snapshot Package

The output is a portable directory with only relative URLs:

```text
<snapshot-name>/
  index.html
  styles.css
  dist/terrascape.js
  snapshot.json
  SHA256SUMS
  data/
    <world-id>/
      terrain/<chunk-x>_<chunk-z>.glb
      tiles/<chunk-x>_<chunk-z>.png
```

The package includes the version of the browser assets that created it. It must work at
a domain root and below a path prefix such as
`https://example.github.io/terrascape-snapshot/`.

### Manifest

`snapshot.json` is the source of truth for static mode. A version 1 manifest has this
shape:

```json
{
  "schema": "terrascape-static-snapshot/v1",
  "title": "Survival world - July 2026",
  "createdAt": "2026-07-14T20:15:00Z",
  "terrascapeVersion": "0.1.0",
  "terrainFormatVersion": "v26",
  "mode": "static",
  "features": {
    "terrain": true,
    "mapTiles": true,
    "worldTime": "frozen",
    "liveEntities": false,
    "serverMetrics": false,
    "webConsole": false,
    "accessLinks": false,
    "telemetry": false
  },
  "worlds": [
    {
      "id": "default",
      "label": "default",
      "terrainProfile": "surface-details",
      "time": {
        "hour": 16,
        "dayProgress": 0.68,
        "moonPhase": 2,
        "sunlightFactor": 0.55,
        "dateTime": "Day 42, 16:19",
        "sunDirection": { "x": 0.31, "y": 0.55, "z": -0.78 }
      },
      "center": { "chunkX": 12, "chunkZ": -4 },
      "radius": 10,
      "chunks": [
        {
          "x": 12,
          "z": -4,
          "terrain": "data/default/terrain/12_-4.glb",
          "tile": "data/default/tiles/12_-4.png"
        }
      ]
    }
  ],
  "fileCount": 8,
  "totalBytes": 10485760
}
```

Chunk entries are sparse: only exported assets are listed. A chunk may contain terrain,
a map tile, or both. World ids and file paths are sanitized by the exporter and cannot
escape the snapshot directory. Future schema versions may shard very large chunk lists,
but the first version uses one manifest.

## Export Contract

The exporter must:

- read from the configured terrain and map-tile cache roots without mutating them;
- accept one explicit terrain profile and include only cache entries compatible with
  that profile and the current terrain format version;
- restrict files to the selected world and chunk boundary;
- copy browser resources and selected cache files into a staging directory;
- validate every manifest path, GLB, and PNG before publishing the directory;
- write `SHA256SUMS` for integrity checks;
- publish atomically by renaming the completed staging directory;
- refuse to overwrite an existing snapshot unless the administrator explicitly
  requests replacement;
- enforce configurable maximum radius and output-byte limits; and
- emit an operator-readable report of exported, missing, invalid, and rejected files.

Map-region caches are not part of version 1 because the current browser uses per-chunk
map tiles. Cache metadata may be used during validation but is not copied unless the
static viewer needs it.

### Future Prewarm Mode

A later `bounded-prewarm` policy may fill missing cache entries before export. It must be
opt-in, administrator-only, restricted to a named world and finite chunk boundary, and
guarded by the explored/on-disk chunk index. It must show an estimated chunk count and
size before starting, respect normal generation concurrency limits, and never generate
unexplored world data. This policy is not required for the first release.

## Viewer Behavior

The browser uses one viewer codebase for live and static deployments. At startup it
checks for `snapshot.json` relative to `index.html`:

- a valid manifest starts static mode;
- no manifest starts the current live-server mode; and
- an invalid or unsupported manifest shows a clear error without falling back to live
  APIs accidentally.

Static mode retains terrain navigation, map tiles, world selection, local display
settings, lighting controls, and the frozen captured time when provided. It displays a
persistent label such as `Static snapshot - captured July 14, 2026 - not live`.

Static mode hides or disables:

- player and mob feeds;
- entity streaming and polling;
- server time synchronization;
- server metrics and telemetry;
- the web chat console and its keyboard shortcut;
- map-link and map-token behavior;
- RCON and all other command submission; and
- server cache-management actions.

The viewer loads only paths present in the manifest. Missing assets are treated as known
gaps and are not repeatedly requested. Once the page is loaded, normal exploration must
not issue requests to `/api/*`.

## Security And Privacy

A snapshot contains public static files and has no Terrascape authentication layer. If
the hosting service does not add access control, anyone with the URL can download every
asset in the snapshot.

The exporter uses an allowlist of asset types. It must never copy
`terrascape.properties`, `server-config.json`, access-token records, raw tokens, RCON
passwords, chat history, logs, player identities, mob snapshots, server metrics, or
arbitrary files from plugin data directories. The export report must not print secrets.

## Static Hosting Constraints

All browser resource and data paths must be relative so the same package works on local
HTTP servers, GitHub Pages project sites, object storage, and conventional web hosts.
Opening `index.html` directly through `file://` is not supported; administrators should
use a local HTTP server for previews.

GitHub Pages is appropriate for modest snapshots, but its published-site size and
bandwidth limits make it a poor fit for very large worlds. Terrascape should report the
snapshot size before publishing and document object storage or another static host as
the alternative. Git LFS is not a solution for files served by GitHub Pages.

Hosting guidance must link to the current official
[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
and
[Git LFS documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
rather than copying limits that may change.

## Failure Behavior

- An invalid world, negative radius, unsupported profile, unsafe snapshot name, or
  exceeded configured limit fails before files are copied.
- Individual missing cache entries are reported as gaps and do not fail the export.
- Invalid cache files are skipped and reported.
- Cancellation or process failure removes the staging directory and leaves any prior
  completed snapshot untouched.
- A manifest schema newer than the viewer supports produces an explicit compatibility
  error.
- Static hosting without a backend remains usable; backend failures are irrelevant
  because static mode makes no API requests.

## Acceptance Criteria

- An administrator can export a bounded, cached area and serve the output with a simple
  static HTTP server.
- The same output works from a GitHub Pages project subpath without editing files.
- Terrain and map tiles match the selected world, coordinates, terrain format, and
  terrain profile.
- Exporting in `cache-only` mode causes no Hytale chunk reads and no cache generation.
- Known missing chunks appear as gaps without retry loops or repeated 404 noise.
- The page clearly identifies itself as a dated, read-only snapshot.
- Static mode makes no `/api/*` requests and exposes no console, live entities, metrics,
  token controls, or write actions.
- Automated tests scan the package for credentials and private configuration names.
- Export validation rejects traversal paths, symlinks escaping the cache root, invalid
  files, oversized output, and manifest/file mismatches.
- Existing live-server viewer behavior remains unchanged when `snapshot.json` is absent.

## Delivery Phases

1. **Cache-only exporter:** manifest, portable resource paths, one terrain profile,
   per-chunk map tiles, static viewer mode, integrity report, and local preview tests.
2. **Static-host validation:** GitHub Pages subpath test, snapshot size reporting,
   documentation, and repeatable publishing example.
3. **Optional bounded prewarm:** explored-chunk guard, estimate/confirmation flow,
   cancellation, and generation-limit enforcement.
4. **Scale improvements:** sharded manifests, compressed distribution archives, and
   optional object-storage publishing guidance.
