const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { resolveTerrascapeUrl } = require(path.join(
  __dirname,
  'tools',
  'library',
  'remote-host',
));

const baseURL = resolveTerrascapeUrl();

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
