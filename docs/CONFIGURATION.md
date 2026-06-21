# Synthborn: Terrascape Configuration

Terrascape creates `terrascape.properties` in the plugin data folder on first
startup. Restart the Hytale server after changing it.

Values in the file can be overridden with Java system properties. Prefix config keys
with `terrascape.`, for example:

```sh
-Dterrascape.http.port=5961
```

The existing deployment environment variables still work for the common boot options:

| Option | Purpose | Env override |
| --- | --- | --- |
| `http.host` | Address the web server binds to. Keep `127.0.0.1` unless the reverse proxy or host firewall is ready. | `TERRASCAPE_HOST` |
| `http.port` | Web server port. | `TERRASCAPE_PORT` |
| `features.experimentalDetails` | Enables enhanced terrain detail requests. | `TERRASCAPE_EXPERIMENTAL_DETAILS` |
| `folders.assetsRoot` | Optional extracted Hytale asset root for lazy mob icons. | `TERRASCAPE_ASSETS_ROOT` |
| `folders.assetsZip` | Optional `Assets.zip` path for lazy mob icons. | `HYTALE_ASSETS_ZIP` |
| `security.adminToken` | Optional token for admin/debug web endpoints. | `TERRASCAPE_ADMIN_TOKEN` |
| `cors.enabled` | Allow browser apps on other origins to call the APIs. Off by default. | `TERRASCAPE_CORS_ENABLED` |
| `cors.allowedOrigins` | Comma-separated exact origins permitted when CORS is enabled. | `TERRASCAPE_CORS_ORIGINS` |

## Sections

`HTTP` controls the bind address and port.

`Worlds` controls visibility. Leave `worlds.allowlist` blank to expose every loaded
world, or set comma-separated names such as `default, arena`.

`Security` controls privileged web access. Set `security.adminToken` before exposing any
debug or future admin web endpoint outside localhost. Clients can send it as either
`Authorization: Bearer <token>` or `X-Terrascape-Admin-Token: <token>`.

`CORS` controls cross-origin browser access to the APIs. It is **off by default** — the
bundled viewer is same-origin and needs none, so no CORS headers are emitted and browsers
refuse cross-origin reads. Enable it only to let a browser app hosted on another domain
call these APIs: set `cors.enabled=true` and list exact origins (scheme + host + port) in
`cors.allowedOrigins`, e.g. `https://map.example.com,https://admin.example.com:8443`. The
matching `Origin` is echoed back (never a blanket `*`) and credentialed requests are
permitted. `*` is accepted to mean "any origin" but is discouraged once credentials are in
play. CORS is a browser control only — it does not replace the access gate, which still
authorizes every request. Non-browser API clients (scripts, servers) are unaffected by it.

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
