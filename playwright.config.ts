import { defineConfig, devices } from "@playwright/test";

// Loads .env (DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD) so the tests can prepare and check data.
try {
  process.loadEnvFile(".env");
} catch {}

// The tests create and delete data: never run them against a hosted (production) database by mistake.
if (/neon\.tech|supabase|amazonaws|vercel-storage/.test(process.env.DATABASE_URL ?? "") && process.env.E2E_ALLOW_REMOTE_DB !== "1") {
  throw new Error("E2E tests refuse to run on a hosted database. Use the local database (docker compose).");
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * End-to-end tests (real browser, real server, real database).
 * Local: npm run build, then npm run test:e2e (the production server is started automatically).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, url: `${baseURL}/fr`, reuseExistingServer: true, timeout: 120_000 },
});
