import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// scroll-demo-video 範本的擷取流程：真的錄一段捲動首頁的畫面（Playwright recordVideo），
// 不是用程式碼畫出來的假動畫。手動建立 context 是因為要指定 recordVideo 的輸出路徑/尺寸——
// 手動建立的 context 不會自動繼承 playwright.config.ts 的 baseURL，要自己再傳一次。
//
// 「內容真的可見」的判斷文字（heroText）讀自 projects.json 的 capture.heroText——
// 每個專案首頁文案不同，不能寫死成 sam-showcase 自己的文字。

const projectName = process.env.CAPTURE_PROJECT_NAME;
if (!projectName) throw new Error('CAPTURE_PROJECT_NAME 未設定');

const registry = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'projects.json'), 'utf-8'));
const project = registry.projects.find((p: { name: string }) => p.name === projectName);
const heroText = project?.capture?.heroText;
if (!heroText) {
  throw new Error(`projects.json 裡 "${projectName}" 沒有設定 capture.heroText`);
}

const RAW_VIDEO_DIR = path.join(__dirname, '..', 'output', projectName, 'raw-video');
const VIEWPORT = { width: 1280, height: 720 };

test('record homepage scroll', async ({ browser }, testInfo) => {
  fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL) throw new Error('baseURL 沒設定（playwright.config.ts 應該已經從 projects.json 帶入）');

  const context = await browser.newContext({
    baseURL,
    viewport: VIEWPORT,
    // recordVideo.size 只會把畫面縮小，不會放大——設成跟 viewport 一致，避免只填滿角落
    recordVideo: { dir: RAW_VIDEO_DIR, size: VIEWPORT },
  });
  const recordingStartedAt = Date.now(); // 錄影從 context 建立那一刻就開始算，不是從 goto 開始
  const page = await context.newPage();

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // networkidle 只代表網路請求安靜下來，不代表畫面真的畫出來了（實測發現這個網站在
  // networkidle 之後還有幾秒才看得到真實內容，可能是字體切換/進場動畫）——
  // 實際等一個真的看得到的內容元素，而不是假設 networkidle 等於「畫面已就緒」
  await page.getByText(heroText, { exact: false }).first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400); // 內容剛出現時給一點緩衝，避免抓到還在漸入的瞬間
  const contentVisibleAt = Date.now();
  const leadInSeconds = (contentVisibleAt - recordingStartedAt) / 1000;

  // 分段平滑捲動到頁尾，模擬使用者瀏覽的節奏（不是一次跳到底）
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const target = Math.round((scrollHeight - VIEWPORT.height) * (i / steps));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }), target);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(800); // 停在頁尾多留一點時間

  const video = page.video();
  await context.close(); // 一定要 close context，錄影檔才會真的寫完

  const savedPath = await video?.path();
  if (savedPath) {
    const finalPath = path.join(RAW_VIDEO_DIR, 'scroll-demo.webm');
    fs.renameSync(savedPath, finalPath);
    fs.writeFileSync(
      path.join(RAW_VIDEO_DIR, 'scroll-demo.meta.json'),
      JSON.stringify({ leadInSeconds: Math.round(leadInSeconds * 10) / 10 }, null, 2)
    );
    console.log(`[錄影完成] ${finalPath}（量測到的前導空白：${leadInSeconds.toFixed(2)}s）`);
  }
});
