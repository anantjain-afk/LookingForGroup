import { defineConfig } from "@playwright/test";
const full = Boolean(process.env.LFG_E2E_DATABASE_URL);
const frontend = {
  command: "npm run dev -- --host 127.0.0.1 --port 5179 --strictPort",
  url: "http://127.0.0.1:5179",
  reuseExistingServer: !process.env.CI && !full,
  timeout: 30000,
  ...(full
    ? {
        env: {
          VITE_API_URL: "",
          VITE_SOCKET_URL: "http://127.0.0.1:3219",
          LFG_API_PROXY_TARGET: "http://127.0.0.1:3219",
        },
      }
    : {}),
};
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5179",
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--test-third-party-cookie-phaseout",
      ],
    },
  },
  webServer: full
    ? [
        {
          command: "node ../server/test/browser-fixture.js",
          url: "http://127.0.0.1:3219/__fixture/0",
          timeout: 30000,
        },
        frontend,
      ]
    : frontend,
});
