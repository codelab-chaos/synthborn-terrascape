#!/usr/bin/env node
"use strict";

const { runCli } = require("./lib/deploy-core");
const config = require("./lib/deploy-config");

try {
  runCli(config, process.argv.slice(2));
} catch (err) {
  console.error(`deploy: ${err.message}`);
  process.exit(1);
}
