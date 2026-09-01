import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  timeout: 300000,
  workers: 1,
});
