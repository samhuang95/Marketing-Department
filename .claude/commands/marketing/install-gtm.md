---
description: 幫一個已註冊的專案安裝或管理 Google Tag Manager 追蹤
---

依照 `ga-setup` skill 執行：

1. 跑 `node scripts/install-gtm/index.mjs <專案名稱>`——確認/建立容器、確認/建立 All Pages 觸發條件，有 `measurementId` 的話建立 GA4 標籤並發布
2. 沒有 `measurementId` 的話，先跑 `node scripts/discover-google-properties.mjs` 確認這個網站有沒有專屬的 GA4 Property；沒有的話告訴使用者需要手動建立，或詢問是否要重新走一次擴大範圍（加 `analytics.edit`）的 OAuth 授權讓你直接建
3. 腳本印出的官方安裝片段，**這一步需要編輯目標專案的實際程式碼**——如果目前 session 無法存取該專案路徑，明確告訴使用者需要用 `/add-dir` 把該專案加進允許範圍，不要嘗試繞過
4. 開分支/diff 讓使用者 review，使用者確認後才合併——不要自己直接改完就當作完成
5. 之後的追蹤設定調整一律走 `scripts/lib/gtm.mjs` 的函式（Tag Manager API），不用再碰程式碼
