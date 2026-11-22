/**
 * E2E smoke suite (docs/slices/20-e2e-tests.md). Runs against a production
 * build served by `vite preview`, so VITE_* values are baked in the same way
 * they are for the real deploy — see .github/workflows/ci.yml for the env.
 *
 * The suite drives one shared Firebase test account (TEST_USER_EMAIL /
 * TEST_USER_PASSWORD), so specs run sequentially in a single worker rather
 * than racing each other over the same profile/session.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
