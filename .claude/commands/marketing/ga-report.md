---
description: 讀取一個已註冊專案的 GA4/Search Console/PageSpeed 數據並給出具體建議
---

依照 `analytics` skill 執行（永遠在 `Marketing-Department` 操作，不用切到目標專案）：

1. 確認使用者指定的專案名稱在 `projects.json` 裡存在，取得 `ga4PropertyId`、`searchConsoleSiteUrl`、`liveUrl`
2. 缺欄位不知道要填什麼的話，先跑 `node scripts/discover-google-properties.mjs` 列出真實可存取的帳號資料，比對後幫使用者補進 `projects.json`
3. 跑 `node scripts/analytics-report/index.mjs <專案名稱>` 拿到乾淨的 JSON 數據
4. **自己判讀這份數據**，給出具體、指向明確原因的建議（不是空泛的鼓勵）——例如某個數據來源全部是 0，要指出可能的原因（追蹤碼沒裝、範圍設定錯誤），不是只複誦數字
5. 把原始數據摘要 + 分析建議寫進 `Marketing-Department/reports/<專案名稱>/<日期>-analysis.md`（格式參考 `reports/sam-showcase/2026-09-23-analysis.md`）
