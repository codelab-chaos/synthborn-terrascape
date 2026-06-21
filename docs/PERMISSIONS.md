# Synthborn: Terrascape Permissions

## In-Game Commands

`/terrascape` uses two Hytale permission nodes. Both are registered with the server's
permissions module, so they show up in `/perm` listings and tab-completion. The built-in
`hytale:Admin` group holds the `*` wildcard, so operators/admins satisfy both nodes
automatically.

| Node | Grants |
| --- | --- |
| `terrascape.admin` | `status`, `sample <chunkX> <chunkZ>`, `clearcache`, plus everything below |
| `terrascape.map.use` | `maplink` / `maptoken` — mint a personal web-map access link |

`terrascape.map.use` is the lowest bar to invoke the command; the admin-only subcommands
re-check `terrascape.admin`. Do not grant `terrascape.admin` to regular players — it can
inspect server state, generate sample terrain files, and delete Terrascape cache files
under the plugin data directory.

### Letting a player use the web map

Grant the map node with the native permission commands — no Terrascape-specific allowlist:

```text
/perm user <player> add terrascape.map.use     # one player
/perm group <group> add terrascape.map.use     # everyone in a group
```

The player then runs `/terrascape maplink` in-game to mint their own access link. Revoke
with `/perm user <player> remove terrascape.map.use`.

## Web Viewer

The normal web viewer and read-only map APIs are designed for player/operator viewing,
subject to the configured HTTP bind address, firewall, reverse proxy, and
`worlds.allowlist`.

When `access.mode=restricted` (see `docs/CONFIGURATION.md`), every web request — static
viewer and APIs alike — must carry a valid access token. Tokens are minted by
`/terrascape maplink` and presented via the `?key=<token>` query parameter, which is then
promoted to an HttpOnly `terrascape_key` session cookie so the viewer's existing fetches
work without further plumbing. Requests without a valid token receive `401`. A configured
`security.adminToken` (Bearer / `X-Terrascape-Admin-Token`) also satisfies the gate so
server-side monitoring keeps working. In the default `access.mode=public` the gate is a
no-op.

The browser carries the credential automatically: the front-end is same-origin, so the
`terrascape_key` cookie rides on every `fetch`, `EventSource`, and image request without
any token plumbing. The one-time `?key=` is stripped from the address bar after load. If a
request is rejected with `401` (for example the token's TTL lapsed mid-session), the viewer
shows an "access expired" overlay prompting the user to mint a fresh link.

### Token scopes and per-API permissions

Each token carries **scopes** — a capability snapshot taken from the minting player's
permissions at `/terrascape maplink` time:

| Scope | Granted to | Unlocks |
| --- | --- | --- |
| `map` | any `terrascape.map.use` holder | the viewer and read-only map APIs |
| `admin` | `terrascape.admin` holders | admin-only web APIs (e.g. `/api/mob-debug`) |

Scope changes take effect on the next mint, bounded by the token TTL. Because scopes ride
in the token, an admin who opens the map with their own link reaches admin APIs without any
shared secret.

Privileged debug/admin web APIs must still be explicitly enabled by config. For this
release, `features.mobDebugEndpoint` defaults to `false`. When enabled, a caller is
authorized by **either** an `admin`-scoped session token **or** a configured
`security.adminToken`:

```text
Authorization: Bearer <adminToken>
X-Terrascape-Admin-Token: <adminToken>
```

## Not Shipped Yet

Terrascape intentionally does not ship a browser console, server log viewer, or remote
command executor. Those features should wait until the admin web auth story is stronger
than a shared token.
