# SynthTerrascape Configuration

SynthTerrascape creates `terrascape.properties` in the plugin data folder on first
startup. Restart the Hytale server after changing it.

Values in the file can be overridden with Java system properties. Prefix config keys
with `terrascape.`, for example:

```sh
-Dterrascape.http.port=5961
```

The existing deployment environment variables still work for the common boot options:

| Option | Purpose | Env override |
| --- | --- | --- |
| `http.host` | Address the web server binds to. Keep `127.0.0.1` unless the reverse proxy or host firewall is ready. | `SYNTH_TERRASCAPE_HOST` |
| `http.port` | Web server port. | `SYNTH_TERRASCAPE_PORT` |
| `features.experimentalDetails` | Enables enhanced terrain detail requests. | `SYNTH_TERRASCAPE_EXPERIMENTAL_DETAILS` |
| `folders.assetsRoot` | Optional extracted Hytale asset root for lazy mob icons. | `SYNTH_TERRASCAPE_ASSETS_ROOT` |
| `folders.assetsZip` | Optional `Assets.zip` path for lazy mob icons. | `HYTALE_ASSETS_ZIP` |
| `security.adminToken` | Optional token for admin/debug web endpoints. | `SYNTH_TERRASCAPE_ADMIN_TOKEN` |

## Sections

`HTTP` controls the bind address and port.

`Worlds` controls visibility. Leave `worlds.allowlist` blank to expose every loaded
world, or set comma-separated names such as `default, arena`.

`Security` controls privileged web access. Set `security.adminToken` before exposing any
debug or future admin web endpoint outside localhost. Clients can send it as either
`Authorization: Bearer <token>` or `X-Terrascape-Admin-Token: <token>`.

`Folders` controls generated cache/output locations. Relative paths resolve under the
plugin data folder. Keep cache folders there for `/terrascape clearcache`.

`Mesh generation` controls terrain request timeouts, batch size, format version, and
server-side generation concurrency.

`In-memory caches` controls volatile cache entry and byte limits. Disk cache cleanup is
still manual through `/terrascape clearcache`.

`Features` enables optional endpoints and network behaviors. `features.mobDebugEndpoint`
defaults to `false`; enable it only for private debugging or with `security.adminToken`
set.

`Map tiles` controls map-region image sizing, maximum requested radius, and how far from
the requested center the server may ask Hytale to generate missing map tiles.

`Live entities` controls mob feed size, radar radius, entity stream cadence, and player
avatar cache limits.
