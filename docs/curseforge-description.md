# Synthborn: Terrascape [Early Access]

**Early Access means not all features are completed**

Every Hytale server has its own magic—its terrain, weather, players, and creatures. Until now, the only way to experience that world was to log in.

Terrascape lets anyone explore your live server in 3D from a browser. No download. No client mod. Just open a link and fly through the world.

This is not a screenshot or a flat map. Terrain rises around you, water moves, fog rolls across the distance, and daylight fades into a starry night. Players and creatures appear where they really are, moving in real time, and visitors can even follow a player's view.

Make the map public or share private links that expire when you choose. Authorized users can message players through the web console, while admins can run slash commands when enabled. Server owners control access, streamed content, and load limits, with mesh generation, caching, and streaming keeping the experience smooth.

Your Hytale server is already alive. 

Terrascape lets everyone see it.

## Quickstart: run it locally

1. Install Terrascape from CurseForge. 
2. Restart your Hytale Server.
5. On the same computer, open `http://127.0.0.1:5960` OR `http://localhost:5960` in a browser.

To change the web port from default `5960`, edit `http.port` in
`<save>/mods/com.codelabchaos_Terrascape/terrascape.properties` after the first start,
then restart the server.

For hosted-servers, domain, and HTTPS setup, see
[Connect to the map](https://github.com/codelab-chaos/synthborn-terrascape/blob/main/docs/operations-manual.md#connect-to-the-map).

Note: when hosting this on servers like APEX servers, I had to open up a port for the web site through APEX hosting and change the `http.host=0.0.0.0`pl. I didn't have control over the port generated, so I had to update the local properties with the open port. You can also setup the ip or host name generated for the map link. 

## Map Access Modes

I figured that folks wouldn't want the world accessing their map for hosted services, so there are some options here. Terrascape has different map access modes, `public` and `restricted`. This is so you can lock down the map to only users that can generate a map link, it also means we can enable user level console commands and other neat features. AKA we detect, moderators, admins or players and allow the appropriate commands. You can revoke map access at any time and even customize with the Hytale internal permissions interface. 

**Public:** (default) 
  - `access.mode=public` (default): anyone who can reach the map via http port can view it.
  - The map chat console is disabled during public access unless the user has generated a map link.

**Restricted:** 
  - `access.mode=restricted`: visitors need a private link all the time.
  - a map link is generated with `/terrascape maplink`
  - the amount of time the map link works can be setup by the host admin.

See [Control map access](https://github.com/codelab-chaos/synthborn-terrascape/blob/main/docs/operations-manual.md#control-map-access)
for permissions, expiring links, visible worlds, and token management. The
[Terrascape Operations Manual](https://github.com/codelab-chaos/synthborn-terrascape/blob/main/docs/operations-manual.md)
covers complete server setup, configuration, maintenance, security, and troubleshooting.



