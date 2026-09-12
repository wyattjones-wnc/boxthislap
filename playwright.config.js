import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  projects: [
    {
      name: "mobile-chrome",
      use: devices["Pixel 7"],
    },
    {
      name: "mobile-safari",
      use: devices["iPhone 15"],
    },
  ],
  reporter: process.env.CI ? "github" : "list",
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
});
