# Synthborn: Terrascape Permissions

## In-Game Commands

`/terrascape` is registered with the Hytale permission `terrascape.admin`.

That permission currently gates:

- `/terrascape status`
- `/terrascape sample <chunkX> <chunkZ>`
- `/terrascape clearcache`

Do not grant `terrascape.admin` to regular players. The command can inspect server
state, generate sample terrain files, and delete Terrascape cache files under the plugin
data directory.

## Web Viewer

The normal web viewer and read-only map APIs are designed for player/operator viewing,
subject to the configured HTTP bind address, firewall, reverse proxy, and
`worlds.allowlist`.

Privileged debug/admin web APIs must be explicitly enabled by config. For this release,
`features.mobDebugEndpoint` defaults to `false`. If it is enabled and
`security.adminToken` is set, callers must send one of:

```text
Authorization: Bearer <token>
X-Terrascape-Admin-Token: <token>
```

## Not Shipped Yet

Terrascape intentionally does not ship a browser console, server log viewer, or remote
command executor. Those features should wait until the admin web auth story is stronger
than a shared token.
