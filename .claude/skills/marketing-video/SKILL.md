---
name: marketing-video
description: Plan and produce marketing videos/images for a registered project, operated remotely from this repo — capture the project's real UI via Playwright or claude-in-chrome (using its devServerUrl), draft a script for the user to review, then render with a reusable template. Use when the user asks to plan or produce a demo video, screenshot deck, or banner for a specific project.
---

# Marketing Video/Image Skill

對應 `specs/phase1.md` 第 2、5、8 節。**永遠在這個 repo（`Marketing-Department`）操作，不需要切到目標專案的資料夾。**

## 用途

1. 從 `projects.json` 找到使用者指定的專案（依 `name`），拿到 `devServerUrl`、`brandKit`
2. 讀 `templates/registry.json`，跟使用者確認要哪個範本（`screenshot-deck` 或 `scroll-demo-video`），沒指定就依需求建議
3. 先跟使用者規劃這次要拍什麼（哪個頁面/功能、有沒有特別要強調的），確認後才動手擷取/渲染——不要沒問清楚就先跑
4. 依範本執行對應的 `capture` 腳本（在 `capture/` 資料夾底下，用 `CAPTURE_PROJECT_NAME=<專案名稱> npx playwright test <flow名稱>`——`baseURL` 跟範本需要的文字設定都會自動從 `projects.json` 帶出來，不用再另外設 `CAPTURE_BASE_URL`）
5. 執行對應的 `render` 腳本，產出最終素材到 `Marketing-Department/output/<專案名稱>/`
6. 完成後在 `Marketing-Department/reports/<專案名稱>/<日期>-render-NNN.md` 記一筆渲染紀錄（範本、擷取/渲染腳本、輸出檔案、過程中踩的坑——照既有紀錄的格式）

這個 Skill **不需要讀寫目標專案的檔案**——只需要網路能連到它的 dev server。

## 已實作的範本（見 `templates/registry.json`）

- **`screenshot-deck`**：`capture/flows/screenshot-deck.spec.ts` 擷取 3 個捲動位置的 viewport 截圖 → `render/compose-screenshot-deck.mjs` 加瀏覽器窗框、輸出 PNG。品牌色是從實際渲染畫面用 sharp 取樣得到的真實值，不是憑印象配色——**新專案第一次用這個範本，要重新取樣它自己的品牌色，不能沿用 `sam-showcase` 的色票**（那組色票是 `sam-showcase` 專屬的）。
- **`scroll-demo-video`**：`capture/flows/scroll-video.spec.ts` 用 Playwright `recordVideo` 真的錄一段捲動首頁的畫面 → `render/encode-scroll-video.mjs` 用 FFmpeg 轉檔、裁掉頁面載入造成的前導空白。目前是最小可行版本，還沒有 Remotion 品牌疊字/轉場。

## 重要教訓（來自實際踩坑，見 `reports/sam-showcase/2026-09-23-render-001.md`）

- **`waitForLoadState('networkidle')` 不代表畫面已經渲染完成**——網路安靜下來跟畫面真的畫出來是兩件事，錄影前一定要用實際文字/元素可見（`getByText(...).waitFor({state:'visible'})`）判斷，不要只信 networkidle
- **判斷「內容可見」，`getByText` 比 `getByRole('heading', ...)` 更貼近視覺結果**——如果標題有漸入動畫，heading 的 accessible text 可能比視覺畫面晚完成，用 `getByRole` 判斷會抓到偏晚的時間點
- **裁切影片前導空白的秒數，讓擷取腳本自己量測寫成 metadata，不要寫死猜測值**——載入時間每次跑可能不同
- 每次改完擷取/渲染邏輯，**一定要實際抽幀檢查輸出**（`ffmpeg -ss <時間> -vframes 1`），不能只看腳本有沒有報錯就當作完成——完整原則見 `app-marketing-assets` skill

## 前置條件

- `projects.json` 裡這個專案的 `devServerUrl` 已設定並能連線（`node scripts/doctor/index.mjs <專案名稱>` 確認）
- `capture/` 底下的 Playwright 專案已用官方 CLI 建置（已完成，見 `specs/task1.md` 階段三）

## 對應指令

`/marketing:plan-video`（`.claude/commands/marketing/plan-video.md`）

## 待補（`specs/task1.md` 階段三後續）

- [ ] `scroll-demo-video` 加 Remotion 品牌疊字/轉場（目前純錄影+轉檔）
- [ ] 捲動節奏依頁面實際長度自動調整，不是固定 24 步
- [ ] 更多範本（例如直式短影音、單張 Hero 社群分享圖）
