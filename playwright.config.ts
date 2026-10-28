import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. Run them with `npm run test:e2e` (scripts/e2e.mjs), which
 * makes a temporary database copy and sets the environment; running
 * `npx playwright test` directly is refused by e2e/support/env.ts.
 *
 * The site runs as a production build, like on Netlify, with payments going
 * to the pretend SumUp on this machine.
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: CI ? 2 : 3,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [['list'], ['github']] : [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The test database is a copy of live data and this repository is public:
    // no traces, screenshots or videos are kept on GitHub
    trace: CI ? 'off' : 'retain-on-failure',
    screenshot: CI ? 'off' : 'only-on-failure',
    video: 'off',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: [
    {
      command: 'node e2e/mocks/sumup.mjs',
      url: 'http://127.0.0.1:4010/__health',
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      command: 'node e2e/mocks/instagram.mjs',
      url: 'http://127.0.0.1:4011/__health',
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      // A production build (made by scripts/e2e.mjs); E2E_DEV=1 uses `next dev` instead
      command: process.env.E2E_DEV ? `npx next dev -p ${PORT}` : `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/privacy`,
      reuseExistingServer: false,
      timeout: 240_000,
      // E2E_SERVER_LOGS=1 shows the site's own logs
      stdout: process.env.E2E_SERVER_LOGS ? 'pipe' : 'ignore',
      stderr: process.env.E2E_SERVER_LOGS ? 'pipe' : 'ignore',
    },
  ],
});
