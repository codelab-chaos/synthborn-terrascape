# Hosted Services Example

This folder contains developer/operator tooling for validating Terrascape on restricted
hosted server providers. It is intentionally outside the normal `package.json` scripts so
the core project build, test, and SSH deploy commands stay provider-neutral.

The helper is useful as an example for panel-managed hosts where the server lifecycle is
controlled outside the repo, but FTP and assigned public ports are available.

## Local profile

Create a local profile beside the helper:

```bash
cp tools/hosted-services/hosted-server.env.example tools/hosted-services/hosted-server.env
```

Fill in the `HOSTING_*` values for the hosted instance. The local profile is gitignored.
The checked-in example uses Apex-shaped defaults, including `HOSTING_FTP_ROOT=default`,
because Apex FTP accounts can start one directory above the running server root.

## Commands

Run these from the repo root:

```bash
node tools/hosted-services/deploy.js print-profile
node tools/hosted-services/deploy.js build-test-deploy
node tools/hosted-services/deploy.js deploy
node tools/hosted-services/deploy.js upload-jar --skip-build
node tools/hosted-services/deploy.js upload-config
node tools/hosted-services/deploy.js status
node tools/hosted-services/deploy.js rcon-stop
node tools/hosted-services/deploy.js log-list
node tools/hosted-services/deploy.js log-tail -n 160
node tools/hosted-services/deploy.js log-download
node tools/hosted-services/deploy.js smoke
node tools/hosted-services/deploy.js validate
```

Use `build-test-deploy` for the active Apex validation loop. It runs the Gradle build and
unit tests locally, uploads the built Terrascape jar to `mods/`, and writes
`mods/com.codelabchaos_Terrascape/terrascape.properties`. Apex remains the deploy and
runtime validation target; it is not used as a build machine.

The helper does not start the hosted server. Stop and start the server from the provider
panel unless that provider exposes a supported control API. After the panel restart, run
`validate` to check Terrascape RCON health, execute the runtime smoke test, and capture a
log tail when FTP permits it.

Logs downloaded by this helper are written to `tools/hosted-services/logs/`.
