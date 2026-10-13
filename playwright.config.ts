import { defineConfig, devices } from '@playwright/test';

// End-to-end playthrough: runs the dev server (which exposes `window.game`) and plays the game in Chromium.
export default defineConfig({
  testDir: 'e2e',
  timeout: 5 * 60_000,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 960, height: 540 },
    video: 'on',
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
