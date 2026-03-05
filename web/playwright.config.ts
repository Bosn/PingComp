import { defineConfig } from '@playwright/test';

const baseURL = process.env.PINGCOMP_BASE_URL || 'http://127.0.0.1:3788';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list']],
});
