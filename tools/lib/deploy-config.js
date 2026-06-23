"use strict";

const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(repoRoot, "..");

const rcon = artifact("synthborn-rcon", "SynthRCON");
const kyn = artifact("synthborn-kyn", "SynthUnits");
const overseer = {
  ...artifact("synthborn-overseer", "SynthOverseer"),
  extraFiles: [
    { local: "overseer-config.example.json", remote: "synthoverseer/overseer-config.example.json" },
    { local: "overseer-config.json", remote: "synthoverseer/overseer-config.json", optional: true },
  ],
};
const terrascape = artifact("synthborn-terrascape", "Terrascape");

function artifact(repoName, jarBaseName) {
  return {
    projectDir: path.join(workspaceRoot, repoName),
    moduleName: jarBaseName,
    jarBaseName,
  };
}

module.exports = {
  repoRoot,
  rconDir: rcon.projectDir,
  defaultTarget: "default",
  // Hytale names a plugin's data directory "<Group>_<Name>". Used by `wipe` to find the
  // data dirs that belong to our mods (so it never touches Hytale's own builtins).
  pluginGroup: "com.codelabchaos",
  targets: {
    default: {
      saveName: "synth-worldview-mvp",
      bind: "0.0.0.0:5521",
      // Terrascape now hosts RCON itself (embedded), so SynthRCON is no longer deployed.
      // rconPort matches Terrascape's own default (rcon.port=25578).
      rconPort: 25578,
      minRamGB: 2,
      maxRamGB: 6,
      verifyPattern: "Terrascape started",
      artifacts: [terrascape],
      // Jar base names that may linger on disk from previous installs but are no longer
      // deployed — `wipe` cleans these (and their data dirs) alongside current artifacts.
      legacyArtifacts: ["SynthRCON", "SynthWorldview"],
    },
    combined: {
      saveName: "synthborn-combined",
      bind: "0.0.0.0:5522",
      rconPort: 25579,
      terrascapeHttpPort: 5961,
      minRamGB: 3,
      maxRamGB: 8,
      verifyPattern: [
        "SynthUnits setup complete",
        "SynthOverseer setup complete",
        "Terrascape started",
      ],
      artifacts: [rcon, kyn, overseer, terrascape],
    },
  },
};
