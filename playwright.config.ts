import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', quiet: true });

const BASE_URL = process.env.APP_CLIENT_BASE_URL;

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.e2e-spec.ts',

  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start:notification:dev',
      url: 'http://localhost:3002',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { NODE_ENV: 'test' },
    },
    {
      command: 'npm run start',
      url: BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { NODE_ENV: 'test' },
    },
  ],
});
