import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.E2E_DATABASE_URL;
if (
  !databaseUrl ||
  !/(^|[_-])(tests?|e2e)([_-]|$)/i.test(new URL(databaseUrl).pathname.slice(1))
) {
  throw new Error("E2E_DATABASE_URL must identify a dedicated test database.");
}
const apiURL = process.env.E2E_API_URL || "http://127.0.0.1:3101";
const webURL = process.env.E2E_WEB_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: webURL,
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: [
    {
      command: "node ../api/dist/main.js",
      url: apiURL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: databaseUrl,
        JWT_SECRET: "brewlite-playwright-test-only-secret",
        PORT: new URL(apiURL).port || "3101",
        CORS_ORIGIN: webURL,
      },
    },
    {
      command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${new URL(webURL).port || "3100"}`,
      url: `${webURL}/login`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        NEXT_PUBLIC_API_URL: apiURL,
        NEXT_PUBLIC_USE_MOCK: "false",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
