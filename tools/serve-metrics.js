#!/usr/bin/env node
"use strict";

// Tiny zero-dependency static server for the baseline metrics report.
// Serves tools/metrics-report.html and auto-discovers perf-history/baseline-*.json,
// so the report SPA loads every run on its own — no file picking.
//
//   node tools/serve-metrics.js [--port 5970]

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const perfDir = path.join(projectRoot, "perf-history");
const reportHtml = path.join(__dirname, "metrics-report.html");

const portArg = process.argv.indexOf("--port");
const port = Number(portArg !== -1 ? process.argv[portArg + 1] : process.env.METRICS_PORT || 5970);

function sendFile(res, file, type) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": type, "cache-control": "no-cache" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);

  if (url === "/" || url === "/index.html") {
    return sendFile(res, reportHtml, "text/html; charset=utf-8");
  }

  if (url === "/baselines.json") {
    let files = [];
    try {
      files = fs.readdirSync(perfDir)
        .filter((name) => /^baseline-.*\.json$/.test(name))
        .sort()
        .reverse(); // newest first
    } catch {
      /* perf-history may not exist yet */
    }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" });
    return res.end(JSON.stringify(files));
  }

  if (url.startsWith("/perf-history/")) {
    const name = path.basename(url.slice("/perf-history/".length));
    const file = path.join(perfDir, name);
    if (file.startsWith(perfDir + path.sep) && fs.existsSync(file)) {
      return sendFile(res, file, "application/json");
    }
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(port, () => {
  console.log(`Terrascape metrics report  →  http://localhost:${port}`);
  console.log(`Serving baselines from      ${perfDir}`);
});
