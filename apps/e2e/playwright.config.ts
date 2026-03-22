import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://mobile-web:8081',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iPhone 14 - ja-JP',
      use: { ...devices['iPhone 14'], locale: 'ja-JP' },
    },
    {
      name: 'iPhone 14 - en-US',
      use: { ...devices['iPhone 14'], locale: 'en-US' },
    },
  ],
  reporter: [['html', { open: 'never' }]],
});
