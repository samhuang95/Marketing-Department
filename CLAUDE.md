# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案現況

這個 repo 正在建置中。**動手實作任何東西之前，先完整讀過 `specs/phase1.md`**（目前是 v7，會持續改版），它是這個專案的權威架構規格，內容比這份 CLAUDE.md 更完整、更新——兩者若有衝突，以 `specs/phase1.md` 為準。`specs/ideas-backlog.md` 存放已討論過但目前擱置的構想，包含一套完整設計過的多租戶產品架構（v2，已封存）——除非使用者明確說方向改回去了，否則不要往那個方向實作。

## 這個專案要做什麼

一套**自用**（不是給外部使用者的產品）的行銷工具，以 Claude Code Skills + slash command 的形式交付：幫使用者自己的其他專案規劃並產生行銷影片/圖片、讀取 GA4/Search Console/PageSpeed 數據並給建議、安裝與管理 Google Tag Manager 追蹤。**沒有後端伺服器、資料庫、前端網頁、瀏覽器擴充套件或 MCP Server**——執行環境就是 Claude Code 本身。

## 架構重點（完整版見 `specs/phase1.md`）

- **永遠在這個 repo 操作，不切換工作目錄**：使用者永遠在 `Marketing-Department` 開 Claude Code，跟它說「幫 `<專案名稱>` 做 XX」，Skill 邏輯遠端操作那個專案（打它的 dev server 網址、打 Google API），不需要切到目標專案的資料夾。這是討論多輪修正後的結論——**之前一度規劃用 Windows Junction 把 Skill 分發到每個目標專案自己的資料夾（讓使用者切過去用），後來確認不是使用者要的工作模式，已經整個拿掉，不要重新引入**。
- **Skill/指令直接放在這個 repo 的 `.claude/skills/`、`.claude/commands/`**——Claude Code 原生就會在目前工作目錄找這兩個資料夾，不需要任何分發機制。
- **`projects.json`**：每個專案的唯一真相來源（`name`、`path`、`devServerUrl`、`brandKit`、`ga4PropertyId`、`searchConsoleSiteUrl`、`gtmContainerId`、`gtmAccountId`），每台機器自己的檔案，已加進 `.gitignore`，範例見 `projects.example.json`。新增專案就是手動加一筆記錄，跑 `scripts/doctor` 驗證。
- **三個 Skill，其中兩個完全不需要目標專案的檔案存取權**：`marketing-video`（打 `devServerUrl` 用 Playwright／`claude-in-chrome` 擷取畫面 + Remotion/FFmpeg 渲染，成品輸出到 `Marketing-Department/output/<專案名稱>/`）、`analytics`（GA4 Data API + Search Console API + PageSpeed Insights，純 API 呼叫）——這兩個都相容「永遠在這裡操作」。**`ga-setup`（幫目標專案裝 GTM 容器 snippet）是唯一的結構性例外**：它必須編輯目標專案的實際程式碼，需要時明確請使用者用 `/add-dir` 開放該專案的存取範圍，這是已知、已確認接受的例外，不要嘗試繞過，也不要因此想把其他兩個 Skill 也改成需要切換目錄。
- **機械性設定 = 真正的獨立腳本，不是給 Claude 讀的指示**：`/doctor` 這個 slash command 檔案本身只是薄封裝，實際邏輯在 `scripts/doctor/`（純 Node，`node scripts/doctor/index.mjs` 這樣直接跑，完全不需要 Claude Code）。這是刻意的原則：檢查環境這類不需要判斷力的操作寫成腳本；需要 LLM 判斷力的部分（規劃影片腳本、分析數據給建議）才維持 Skill/對話驅動。
- **憑證**：Google OAuth token 與 PageSpeed API Key 統一用 `.env` 格式存在**這個 repo 根目錄**（`Marketing-Department/.env`，已加進 `.gitignore`，絕對不會被 commit）——這是刻意的決策（見 `specs/phase1.md` 第 11 節「為什麼放在專案裡」），優先考量可控性。腳本載入時要用相對於腳本自己檔案位置的路徑（`fileURLToPath(import.meta.url)` 往上找 repo 根目錄），不要寫死絕對路徑。
- **執行環境**：Node.js。**依賴統一裝在 repo 根目錄**（`package.json`/`node_modules`）——Node 模組解析是從檔案自己的位置往上找，不會跨到旁邊資料夾，分散安裝會導致 `scripts/lib/` 這類共用程式碼找不到套件（實測踩過這個坑）。**唯一刻意的例外是 `capture/`**：Playwright 官方腳手架（`npm init playwright@latest`）本來就會自建自己的 `package.json`/`node_modules`，這是「官方優先」原則優先於「共用根目錄依賴」原則的情況，不是疏漏——不要為了統一而搬動 `capture/` 的依賴。
- **跨專案報告與產出**：`reports/<專案名稱>/` 累積分析摘要與渲染歷史；`output/<專案名稱>/` 存放最終行銷素材——都集中在這個 repo，這個 repo 自己的 git 歷史，方便日後跨專案比較。目標專案本身不需要放任何跟這套工具相關的檔案（`ga-setup` 編輯的是它自己原本就有的程式碼，不算額外塞檔案）。
- **擷取/渲染的參考實作**：`D:\Sam_git\Vocabulary_Trainer\Marketing`（另一個獨立 repo，不是這個專案的一部分）——同樣是 Playwright + Remotion + FFmpeg 的組合，沒有用到 MCP 或伺服器，值得直接參考其踩雷經驗（`tech.md`、`task.md`）。

## 開發原則：官方優先

實作任何工具/框架（Playwright、Remotion、Google API client、之後新增的任何工具）時，一律優先用官方 CLI／官方文件建議的建置方式（`npm create`/`npx <official-cli>`、`@latest`），不手刻 scaffold、不憑記憶假設版本號或指令語法，先查證再動手。只有官方方式真的解決不了問題、或有明確客製化需求時才偏離，並在當下的實作說明裡註記原因。這條規則同時也記在使用者的全域 `CLAUDE.md` 與 `specs/phase1.md` 裡。
