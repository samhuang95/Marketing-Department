import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 跑任何 capture flow 之前，一律要設定 CAPTURE_PROJECT_NAME=<projects.json 裡的專案名稱>——
 * baseURL 直接從那筆專案記錄的 devServerUrl 讀出來，不用另外重複設一次 CAPTURE_BASE_URL，
 * 也不會有兩個環境變數各自代表一部分設定、對不起來的問題。
 *
 * 這裡刻意不 import scripts/lib/projects.mjs（雖然邏輯重複一點點）——那個共用模組用
 * import.meta.url 找自己的路徑，Playwright 讀 config 檔時的打包/轉譯方式跟純 Node ESM
 * 不一樣，實測會噴 "Cannot use 'import.meta' outside a module"。這裡改用 CJS 情境下
 * 一定支援的 __dirname，避免這個問題。
 */
const projectName = process.env.CAPTURE_PROJECT_NAME;
if (!projectName) {
  throw new Error('請設定 CAPTURE_PROJECT_NAME 環境變數（projects.json 裡的專案名稱），例如：CAPTURE_PROJECT_NAME=sam-showcase npx playwright test ...');
}
const registryPath = path.resolve(__dirname, '..', 'projects.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
const project = (registry.projects || []).find((p: { name: string }) => p.name === projectName);
if (!project) {
  throw new Error(`projects.json 裡沒有名為 "${projectName}" 的專案`);
}
if (!project.devServerUrl || project.devServerUrl === 'REPLACE_ME') {
  throw new Error(`projects.json 裡 "${projectName}" 的 devServerUrl 尚未設定`);
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './flows',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: project.devServerUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
