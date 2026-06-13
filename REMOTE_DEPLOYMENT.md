# SynthTerrascape Remote Deployment

When deploying SynthTerrascape to the live `synth-worldview-mvp` save, the required workflow is build, deploy, restart, and verify. Do not stop at copying the jar.

Preferred one-shot command, from this repo root:

```powershell
node tools\deploy.js restart
```

That command:

1. Builds the target modules.
2. Copies the jars to the remote `synth-worldview-mvp` save.
3. Stops and starts the remote save.
4. Waits for RCON health.

Manual fallback is:

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
   node tools\server\remote-server.js restart --wait --force
   ```

   For local fallback:

   ```powershell
   node tools\deploy.js stop --force
   ```

   From the repo root:

   ```powershell
   .\gradlew.bat deploy
   ```

4. Verify the restart:

   ```powershell
   node tools\deploy.js status
   node tools\deploy.js grep "SynthTerrascape started|ERROR|WARN" -n 120
   ```

Do not treat `deploy` as complete until the restart and log verification are done. The web UI is served from the running mod jar, so changes to `index.html`, `dist/terrascape.js`, or other resources will not appear until the save is restarted.
