---
name: ga-setup
description: Install a Google Tag Manager container into a registered project's own codebase (one-time code change, reviewed as a diff/PR) and manage its tags and versions afterward via the Tag Manager API. Use when the user asks to add or adjust GA/GTM tracking on one of their own projects.
---

# GA Setup Skill

對應 `specs/phase1.md` 第 2、5、10 節。**這是唯一一個需要離開這個 repo、直接碰目標專案檔案的 Skill**（裝 GTM snippet 那一步）。

## 用途

1. 跑 `node scripts/install-gtm/index.mjs <專案名稱>`——這支腳本會：
   - 確認/建立 GTM 容器（優先信任 `projects.json` 已記錄的 `gtmContainerId`，見下方教訓）
   - 確認/建立 All Pages 觸發條件
   - 如果 `projects.json` 有 `measurementId`，建立/更新 GA4 Configuration 標籤並發布版本
   - 印出官方標準安裝片段（`<head>`/`<body>` 兩段）
2. 如果沒有 `measurementId`：這個網站可能還沒有專屬的 GA4 Property。跑 `node scripts/discover-google-properties.mjs` 確認，沒有的話需要使用者手動建立（或用擴大範圍的 OAuth，見前置條件）
3. **把安裝片段實際寫進目標專案的程式碼，需要 `/add-dir` 開放該專案的存取範圍**——偵測到存取不到時，明確告訴使用者需要這麼做，不要嘗試繞過
4. 拿到存取權限後，編輯目標專案加入安裝片段，**開分支/diff 給使用者 review，使用者確認後才合併**——不要自己直接改完就當作完成
5. 之後調整追蹤事件、標籤、發布版本，都透過 `scripts/lib/gtm.mjs` 的函式（Tag Manager API），不用再碰程式碼

## 重要教訓（實際踩過的坑，見 `reports/sam-showcase/2026-09-23-ga-setup.md`）

- **確認容器/資源存不存在，一律用 ID 查，不要用名稱模糊比對**——第一版用 `project.name` 去比對 GTM 容器名稱，但使用者手動在 GTM 後台取的容器名稱可能跟 `projects.json` 的內部名稱不同，導致誤判「不存在」而**在使用者真實帳號裡建立了一個多餘的重複容器**。修法：`getContainerById` 優先查 `projects.json` 已記錄的 ID，只有真的沒記錄過才退回用名稱找/建立
- **這個 Skill 會操作使用者真實的外部資源（GTM 容器、GA4 Property）**——任何「確認存不存在」的判斷邏輯都要保守：優先信任已知的權威識別碼，不要用推測性的比對條件當作「不存在」的依據，一旦誤判就是真的在使用者帳號裡建出垃圾資源，不是本地檔案可以直接刪掉重來
- **用 API 建立的 GTM 容器不會自動內建「All Pages」觸發條件**（跟 GTM 後台介面手動建立不同）——`ensureAllPagesTrigger` 會檢查並在缺少時建立，不能假設它一定存在
- **GA4 Property ID 不等於 Measurement ID**——GA4 標籤要用的是某個 Web Data Stream 底下的 Measurement ID（`G-XXXXXXXXXX`），不是 Property 本身的 ID，要先查 `dataStreams.list` 才拿得到
- **確認一個 GA4 Property 底下的 data stream 真的對應目標網站，不要只看 Property 名稱**——實測發現帳號裡「看起來合理」的 Property 底下的 data stream 其實是完全無關的其他網站，名稱不能作為信任依據，要查 `webStreamData.defaultUri` 實際比對網域

## 前置條件

- `Marketing-Department/.env` 已設定 OAuth 憑證（目前只有 `tagmanager.edit.containers`、`tagmanager.publish` scope——**不包含**刪除容器、建立 GA4 Property 需要的 scope，遇到這類操作會失敗，要明確告訴使用者需要重新走一次擴大範圍的授權）
- 使用者已有一個 Google Tag Manager 帳號

## 對應指令

`/marketing:install-gtm`（`.claude/commands/marketing/install-gtm.md`）

## 待補，其中前兩項是完全沒執行過、未驗證的程式碼，不是「已知會壞」而是「不知道」

- [ ] **`upsertGA4ConfigTag`（建立/更新 GA4 Configuration 標籤）完全沒真的執行過一次**——因為缺 Measurement ID 一直沒機會跑。標籤類型代碼寫的是 `"gaawc"`，這是憑記憶寫的官方 Tag Manager API 類型字串，**沒有實際建立成功驗證過是不是正確的**。第一次真的有 Measurement ID 可以跑時，要當作「第一次執行、可能整個是錯的」來對待，不能假設寫的時候邏輯想清楚了就等於對——照 `app-marketing-assets` skill 的原則，跑完要進 `tagmanager.google.com` 後台實際打開那個標籤看一眼設定對不對，不是看腳本沒報錯就結案
- [ ] **`publishWorkspace`（建立版本＋發布）也完全沒執行過**——同上，第一次跑要實際去 GTM 後台的 Versions 頁面確認真的發布出一個版本，內容是預期的
- [ ] 建立 GA4 Property 的能力（需要重新設計 OAuth scope，加 `analytics.edit`）
- [ ] 刪除容器的能力（需要 `tagmanager.delete.containers` scope）——目前刻意不做，避免這麼強的破壞性操作在權限沒設計清楚前就能被呼叫
- [ ] 實際把安裝片段寫進目標專案程式碼的 diff/PR 流程（等 `/add-dir` 後實測）
