---
description: 針對一個已註冊的專案規劃並產生一支行銷影片或一組截圖/橫幅
---

依照 `marketing-video` skill 執行（永遠在 `Marketing-Department` 操作，不用切到目標專案）：

1. 確認使用者指定的專案名稱在 `projects.json` 裡存在；不確定的話先列出 `projects.json` 裡有哪些專案讓使用者選
2. 確認該專案的 `devServerUrl` 已設定，建議先跑一次 `node scripts/doctor/index.mjs <專案名稱>` 確認連線正常
3. 詢問使用者這次要做什麼（哪個頁面/功能、哪個範本）；讀 `templates/registry.json` 列出可用範本供選擇，並確認 `requiresProjectConfig` 列出的欄位（`capture.sectionHeadingText`／`capture.heroText` 等）在 `projects.json` 裡已經設定——第一次用在新專案，這些要先填
4. 依範本執行對應的 capture flow：
   ```
   cd capture
   CAPTURE_PROJECT_NAME="<專案名稱>" npx playwright test <flow檔名> --project=chromium
   ```
   （`baseURL` 跟範本需要的文字設定會自動從 `projects.json` 帶出來，不用另外設 `CAPTURE_BASE_URL`）
5. 執行對應的 render 腳本（例如 `node render/compose-screenshot-deck.mjs <專案名稱>` 或 `node render/encode-scroll-video.mjs <專案名稱>`）
6. **實際打開輸出檔案確認畫面正確**（截圖用 Read 工具看，影片用 ffmpeg 抽幀看）再回報給使用者——不要只看腳本沒報錯就說完成
7. 完成後回報成品路徑（`Marketing-Department/output/<專案名稱>/...`），並在 `Marketing-Department/reports/<專案名稱>/<日期>-render-NNN.md` 記一筆渲染紀錄（範本、腳本、輸出路徑、過程中的坑）
