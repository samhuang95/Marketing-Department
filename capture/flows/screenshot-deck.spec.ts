import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// screenshot-deck 範本的擷取流程：在目標網站的真實首頁上，於幾個自然捲動位置拍攝
// viewport 截圖（不是任意像素裁切）。輸出到 output/<CAPTURE_PROJECT_NAME>/screenshots/，
// 後續由 render/compose-screenshot-deck.mjs 加框、排版成最終行銷素材。
//
// 「捲到哪個區塊」用的文字比對（sectionHeadingText）讀自 projects.json 的
// capture.sectionHeadingText——每個專案文案不同，不能寫死成 sam-showcase 自己的文字，
// 不然套用到別的專案會直接逾時失敗。

const projectName = process.env.CAPTURE_PROJECT_NAME;
if (!projectName) throw new Error('CAPTURE_PROJECT_NAME 未設定');

const registry = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'projects.json'), 'utf-8'));
const project = registry.projects.find((p: { name: string }) => p.name === projectName);
const sectionHeadingText = project?.capture?.sectionHeadingText;
if (!sectionHeadingText) {
  throw new Error(`projects.json 裡 "${projectName}" 沒有設定 capture.sectionHeadingText`);
}

const OUT_DIR = path.join(__dirname, '..', 'output', projectName, 'screenshots');

test('capture homepage scroll positions', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 1. Hero：頁面最上方，標語 + CTA
  await page.screenshot({ path: path.join(OUT_DIR, '01-hero.png') });

  // 2. 作品索引：捲到指定區塊完整可見（文字比對來自 projects.json，見上方說明）
  const showcaseHeading = page.getByText(sectionHeadingText, { exact: false });
  await showcaseHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // 等捲動觸發的任何進場動畫穩定
  await page.screenshot({ path: path.join(OUT_DIR, '02-showcase.png') });

  // 3. Footer CTA：捲到底部
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, '03-footer-cta.png') });
});
