---
name: analytics
description: Read a registered project's GA4, Search Console, and PageSpeed Insights data (operated remotely from this repo via projects.json) and give concrete, actionable recommendations. Use when the user asks about a project's traffic, conversions, search performance, or site speed/SEO health.
---

# Analytics Skill

對應 `specs/phase1.md` 第 2、5、7、8 節。**永遠在這個 repo（`Marketing-Department`）操作，不需要切到目標專案的資料夾。**

## 用途

1. 確認 `projects.json` 裡這個專案的 `ga4PropertyId`、`searchConsoleSiteUrl`、`liveUrl`（PageSpeed 需要，不能是 `devServerUrl` 的 localhost）
2. 跑 `node scripts/analytics-report/index.mjs <專案名稱>`——這支腳本只回傳乾淨的 JSON 數據，**不做任何分析判斷**
3. 拿到數據後，Claude 自己判讀、給出具體、可執行的建議——不是「加油」這種空泛的話，是像「GA4 完全沒有數據，很可能追蹤碼沒裝上」「LCP 偏慢、CLS/TBT 正常，問題集中在字體載入」這種指向明確原因的判斷
4. 把這次的原始數據摘要 + 分析建議寫進 `Marketing-Department/reports/<專案名稱>/<日期>-analysis.md`（格式參考 `reports/sam-showcase/2026-09-23-analysis.md`）

這個 Skill **不需要讀寫目標專案的檔案**——純粹是 API 呼叫。

## 三個資料來源的取得方式

- **GA4**（`scripts/lib/ga4.mjs`）：`analyticsdata.properties.runReport`，OAuth2。**注意**：分頁明細的 `activeUsers` 不能直接加總當站台總計（去重計數，加總會重複算到跨頁使用者）——已經拆成「分頁明細查詢」+「不拆維度的站台總計查詢」兩次呼叫，這個教訓不要在別的地方重踩
- **Search Console**（`scripts/lib/search-console.mjs`）：`searchconsole.searchanalytics.query`，OAuth2。同樣道理，總計要另外查一次不拆維度的版本，不能只加總 top 20 筆查詢字詞（會漏掉排名之外的）。**額外教訓**：就算不拆維度的總計跟「query」維度明細加總對不上，也不一定是程式錯誤——Search Console 會因為隱私過濾隱藏部分低頻/稀有查詢字詞（仍計入總計，但不會出現在 query 維度的明細列表裡），實測 `sam-showcase.com` 就發生過（明細加總 6，總計 21）。**改用「page」維度重新拆解通常能對得上**（同一批數據拆到 URL 上不會被過濾），寫分析報告前務必核對明細加總是否等於總計，對不上要查清楚原因、不能略過
- **PageSpeed Insights**（`scripts/lib/pagespeed.mjs`）：`pagespeedonline.pagespeedapi.runpagespeed`，API key（不是 OAuth）。**PageSpeed 打不到 `localhost`，一定要給公開網址**（`projects.json` 的 `liveUrl` 欄位，不是 `devServerUrl`）

## 如果沒有 `ga4PropertyId`/`searchConsoleSiteUrl`，不知道要填什麼

跑 `node scripts/discover-google-properties.mjs`——用現有的 OAuth 憑證列出使用者真實可存取的 GA4 Property、Search Console 已驗證網站、GTM 帳號/容器，比對專案名稱後手動填進 `projects.json`，不用叫使用者自己去後台一個個找。

## 前置條件

- `Marketing-Department/.env` 已設定 OAuth 憑證與 PageSpeed API Key
- `projects.json` 裡這個專案至少填了 `ga4PropertyId`、`searchConsoleSiteUrl`、`liveUrl` 其中一項才有東西可查（缺的欄位腳本會用 `xxxSkipped` 標明，不會整支失敗）

## 對應指令

`/marketing:ga-report`（`.claude/commands/marketing/ga-report.md`）
