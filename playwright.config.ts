import { defineConfig, devices } from '@playwright/test';

// e2e runs against the production build served under the GitHub Pages sub-path.
const PORT = 4317;
// Must match the base the app was built with (CI: /<repo-name>/).
const BASE = process.env.E2E_BASE ?? '/setlog/';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-se', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } },
    { name: 'iphone-14', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'pixel', use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_BASE: BASE },
  },
});
