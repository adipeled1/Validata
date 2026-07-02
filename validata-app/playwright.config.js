import { defineConfig } from '@playwright/test';

// Runs against a local dev server by default. To point this at a Vercel
// preview deployment instead (see ARCHITECTURE_PLAN.md Phase 0), set
// PLAYWRIGHT_BASE_URL and drop the local `webServer` block.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
