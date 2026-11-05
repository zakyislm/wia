import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "frontend.spec.ts",
    "discovery.spec.ts",
    "profile.spec.ts",
    "remaining-ui.spec.ts",
  ],
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", headless: true },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
