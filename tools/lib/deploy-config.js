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
const terrascape = artifact("synthborn-terrascape", "SynthTerrascape");

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
  targets: {
    default: {
      saveName: "synth-worldview-mvp",
      bind: "0.0.0.0:5521",
      rconPort: 25578,
      minRamGB: 2,
      maxRamGB: 6,
      verifyPattern: "SynthTerrascape started",
      artifacts: [rcon, terrascape],
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
        "SynthTerrascape started",
      ],
      artifacts: [rcon, kyn, overseer, terrascape],
    },
  },
};
