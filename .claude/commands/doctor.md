---
description: 檢查行銷工具的環境狀態（.env 憑證、projects.json 裡各專案的狀態）
---

實際邏輯是一支獨立的 Node 腳本（`scripts/doctor/index.mjs`），不需要 Claude 介入也能直接跑，也不會修改任何東西——純檢查。

跑：
```
node scripts/doctor/index.mjs
```
（不帶參數會檢查 `projects.json` 裡列出的所有專案；只想檢查其中一個就帶名稱：`node scripts/doctor/index.mjs <專案名稱>`）

把輸出結果整理後回報給使用者，`[FIX]` 的項目附上腳本已經給的具體修法。
