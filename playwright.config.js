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
    // Release validation targets system Chrome. Set PLAYWRIGHT_CHANNEL=chromium to use
    // Playwright's pinned browser on machines where Chrome is not installed.
    channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium'
      ? undefined
      : (process.env.PLAYWRIGHT_CHANNEL || 'chrome'),
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
