# SynthTerrascape Remote Deployment

When deploying SynthTerrascape to the live `synth-terrascape-mvp` save, the required workflow is build, deploy, restart, and verify. Do not stop at copying the jar.

Preferred one-shot command, from the repo root (`C:\Users\ccnef\git\hytale-mods`):

```powershell
node tools\remote-deploy.js terrascape --restart
```

That command:

1. Builds the target modules.
2. Copies the jars to the remote `synth-terrascape-mvp` save.
3. Stops and starts the remote save.
4. Waits for RCON health.

Manual fallback, from `mods\SynthTerrascape`, is:

1. Build locally:

   ```powershell
   .\gradlew.bat build
   ```

2. Deploy locally/remotely as appropriate:

   ```powershell
   .\gradlew.bat deploy
   ```

3. Restart the save so the running server loads the newly deployed jar and bundled web resources. For remote restarts, from repo root:

   ```powershell
   node tools\server\remote-server.js restart synth-terrascape-mvp --wait --force
   ```

   For local fallback:

   ```powershell
   node ..\..\tools\server\stop-server.js --save synth-terrascape-mvp
   ```

   From the repo root:

   ```powershell
   node tools\server\start-server.js --save "$env:APPDATA\Hytale\UserData\Saves\synth-terrascape-mvp" --background
   ```

4. Verify the restart:

   ```powershell
   node ..\..\tools\server\remote-logs.js list
   node ..\..\tools\server\remote-logs.js boot synth-terrascape-mvp -n 120
   ```

Do not treat `deploy` as complete until the restart and log verification are done. The web UI is served from the running mod jar, so changes to `index.html`, `dist/terrascape.js`, or other resources will not appear until the save is restarted.
