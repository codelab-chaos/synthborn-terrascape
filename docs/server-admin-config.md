# Server-Admin Configuration — Proposal (for review)

Status: **proposal / not started**. A simple, flat `server-config.json` that lets a server
admin govern the client options **that cost the server** — feed polling, tile generation, and
mesh load/detail/pacing. Pure client-side render options (fog, shade, sky, water, mob headshot
blocks) are intentionally **out of scope**; they don't hit the server.

This lands before the metrics work, since the upcoming server→client APIs add more server
load and admins need one place to cap it.

## Scope criteria

Include an option **only if it changes how hard the server works** — requests it serves, or
meshes/tiles it generates/paces. Render-only options stay fully user-controlled.

> **Panels are not hidden — individual controls are governed.** The Experimental panel stays
> available to users because it holds render-only options (fog, water). The two server-pacing
> controls inside it (voxel spawn/frame, spawn/ms) are still individually governable; the rest
> of the panel is untouched.

## The file: `server-config.json`

The shipped default (all options on, no restrictions) is bundled in the jar at
[`src/main/resources/server-config.json`](../src/main/resources/server-config.json) — this is
both the default and the validation schema. On first run the server copies it into the mod's
data dir (`<save>/mods/com.codelabchaos_Terrascape/server-config.json`); admins edit that file
and restart to import changes.

**Load policy:** malformed JSON is a hard error (load fails, logged, so it's obvious). A missing
file, missing keys, unknown keys, or wrong-typed values warn on startup and fall back to the
bundled default per key — the server still starts.

Flat JSON, hand-editable, next to the existing config. Conventions:

- `*Enabled: false` → the matching control is **greyed out** (disabled, not removed) and the
  server stops serving that feature.
- `*Options: [...]` → the exact choices the select/slider offers. Server **validates** any
  incoming value against this allowlist (numeric/enum only — never executed), so a hand-built
  request can't exceed it. Listing a single value effectively **pins** the control.
- `*Default` → the starting value.
- Missing file or missing key → that option is fully open (current behavior). Back-compatible.

Both sides honor it: the server clamps/gates (source of truth), the client reflects it in the UI.

## Example

```json
{
  "showMobsEnabled": true,
  "mobUpdateRateOptions": [0.2, 0.5, 1, 2],
  "mobUpdateRateDefault": 0.2,

  "showPlayersEnabled": true,
  "playerUpdateRateOptions": [0.5, 1, 2, 4],
  "playerUpdateRateDefault": 1,

  "mapTilesEnabled": true,

  "chunksLoadedAtOnceOptions": [1, 2, 4, 6],
  "chunksLoadedAtOnceDefault": 4,

  "spawnPerFrameOptions": [1, 2, 4],
  "spawnPerFrameDefault": 2,
  "spawnBudgetMsOptions": [2, 4, 8],
  "spawnBudgetMsDefault": 4,

  "streamRadiusOptions": [2, 4, 6, 8],
  "streamRadiusDefault": 4,
  "autoStreamEnabled": true,

  "cosmeticBlocksOptions": ["off", "baked", "split"],
  "visualDetailOptions": ["basic", "structures", "all"],
  "experimentalDetailEnabled": false
}
```

## Options (server-impacting only)

| Config key(s) | Control | Server cost |
|---------------|---------|-------------|
| `showMobsEnabled`, `mobUpdateRate*` | `show-mobs`, `mob-update-rate` | live mob feed polling |
| `showPlayersEnabled`, `playerUpdateRate*` | `show-players`, `player-update-rate` | player feed polling |
| `mapTilesEnabled` | `map-tiles` | map tile generation/serving |
| `chunksLoadedAtOnce*` | `terrain-load-slots` | parallel mesh fetch/parse |
| `spawnPerFrame*`, `spawnBudgetMs*` | `terrain-spawn-frame`, `terrain-spawn-budget` | paces mesh delivery → drives fetch pressure |
| `streamRadius*`, `autoStreamEnabled` | `radius`, `auto-stream` | number of chunks requested (**heaviest lever**) |
| `cosmeticBlocksOptions` | `cosmetic-blocks-mode` | mesh size / generation cost |
| `visualDetailOptions` | `visual-detail-mode` | mesh detail generation cost |
| `experimentalDetailEnabled` | experimental detail | extra generation cost |

These resolve into the existing `TerrascapeConfig` sections (`Features`, `Mesh`, `MapView`,
`Entities`) rather than duplicating them.

**Stream radius** is the strongest knob on server load (radius² chunks). Treated as
admin-governed: the admin sets the allowed `streamRadiusOptions` and default; a single-entry
list pins it to a fixed radius. Still presented in the client UI, but bounded by the admin.

## Explicitly out of scope (render-only, stay user-controlled)

`fog*`, `shade*`, `tree-shade`, `land-motion`, `sync-time`, `sky-*`, `water-mode`,
`mob-blocks`, `debug-bounds`. No server cost → no admin config. Fog and water live in the
Experimental panel and keep it user-relevant.

## Client/server contract

- Server publishes the effective config (e.g. `GET /api/config`, or folded into bootstrap).
- Client applies it before restoring saved view-state: `*Enabled:false` greys the control and
  ignores any saved "on" preference; `*Options` populates the select and snaps a saved value
  into the allowed set; `*Default` seeds when there's no saved value.
- Server independently validates/clamps every request param and gates disabled feeds.

## Open questions

- **Spawn pacing** (`spawnPerFrame`/`spawnBudgetMs`): include as governed (current draft) or
  leave fully to the user? They're client-side render pacing that *indirectly* increases fetch
  pressure — borderline.
- **Stream radius**: keep user-selectable within the admin's allowlist (current draft), or make
  it a single fixed admin value with no client control?
- One endpoint (`/api/config`) or fold into the existing bootstrap payload?
- Hot-reload via `/terrascape reload`, or restart-only to start?
- Rate values in the file: per-second (matches the UI, as above) or milliseconds (matches
  server internals)? Pick one, convert at the boundary.
