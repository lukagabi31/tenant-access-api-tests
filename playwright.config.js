// @ts-check
const { defineConfig } = require('@playwright/test');

const VULNERABLE_URL = 'http://localhost:3101';
const FIXED_URL = 'http://localhost:3102';

module.exports = defineConfig({
  testDir: './tests',
  // Tests share one in-memory server per build and reset it before each test,
  // so they run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  // Both builds of the API start automatically before the tests run.
  webServer: [
    {
      command: 'node app/start.js',
      url: `${VULNERABLE_URL}/health`,
      env: { PORT: '3101', APP_MODE: 'vulnerable' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node app/start.js',
      url: `${FIXED_URL}/health`,
      env: { PORT: '3102', APP_MODE: 'fixed' },
      reuseExistingServer: !process.env.CI,
    },
  ],

  // The same suite runs against both builds:
  // - vulnerable-build: finding tests are marked as expected failures (the finding is reproduced)
  // - fixed-build:      every test must pass (the fix is confirmed at retest)
  projects: [
    { name: 'vulnerable-build', use: { baseURL: VULNERABLE_URL } },
    { name: 'fixed-build', use: { baseURL: FIXED_URL } },
  ],
});
