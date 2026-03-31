import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Chargé ici pour que webServer ait DATABASE_URL dès le démarrage,
// avant même que global-setup ne tourne.
config({ path: ".env.test" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Tests qui nécessitent une session admin
    {
      name: "admin",
      testMatch: ["**/admin/**/*.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
    },
    // Tests auth (login/logout) — sans session pré-existante
    {
      name: "auth",
      testMatch: ["**/auth/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Tests publics (API, pages publiques) — sans session
    {
      name: "public",
      testMatch: ["**/public/**/*.spec.ts", "**/payment/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-for-playwright-32chars",
    },
  },
});
