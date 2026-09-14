import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore:
        /extension-load\.spec\.ts|binance-paper-usable\.spec\.ts|upbit-paper-usable\.spec\.ts|upbit-extension\.spec\.ts|extension-binance-smoke\.spec\.ts|v11-popup-settings\.spec\.ts|binance-autonomous-exploration\.spec\.ts/,
    },
    {
      name: "extension",
      testMatch:
        /extension-load\.spec\.ts|binance-paper-usable\.spec\.ts|upbit-paper-usable\.spec\.ts|upbit-extension\.spec\.ts|extension-binance-smoke\.spec\.ts|v11-popup-settings\.spec\.ts|binance-autonomous-exploration\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "pnpm --filter @fly/demo dev -- --host 127.0.0.1 --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
