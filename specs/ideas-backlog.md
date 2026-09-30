# 未來構想紀錄（Ideas Backlog）

非本次開發範圍的構想先記在這裡，避免討論中冒出來的好點子被忘記。排 Phase 時再從這裡挑進正式規格。

---

## 1. GA 版本管理：像 Git Branch 一樣的 A/B Test / 版本迭代

**構想來源**：Sam 口述，2026-09-16
**依賴**：需要 Analytics 模組（GA4 讀取，`specs/phase1.md` 已規劃在 Phase 1 之後）先落地；且需要新增「Agent 能實際控制/切換使用者網站上呈現內容」的能力——這是目前規劃完全沒有的新能力，不只是讀數據

### 構想描述（照原話整理）

1. Agent 掃描網站，找出可以優化的建議方案
2. 使用者同意某個方案後，系統記錄「這次要套用的設定」與「套用前的既有內容」（類似 commit）
3. 套用後觀察成效：使用者覺得好，告訴 Agent「保留」——Agent 保留這個版本；覺得不好，Agent 針對這個版本繼續優化迭代（類似在一個 branch 上持續 commit）
4. 使用者可以隨時像 `git checkout` 一樣，切回過去任何一個版本

### 可行性評估

**整體概念完全可行，而且是有辨識度的產品構想**——把版控的心智模型（commit / branch / checkout）套用在行銷內容迭代上，一般行銷工具通常只有陽春的「歷史紀錄」列表，沒有這種心智模型。

**技術實作有個優雅的捷徑，直接建議採用**：不用自己發明一套版本圖資料結構——每個 Project 的「可編輯行銷內容」直接用一個真正的 git repo 存放。版本迭代就是真的 `git commit`／`git branch`，「切回過去版本」就是真的 `git checkout`，每個 commit 額外掛一筆對應時間區間的 GA 成效數據（用 git notes，或另開一張表用 commit hash 關聯都可以）。「像 Git 一樣」不用只是比喻，實作成本會比自己刻版本控制邏輯低很多。

**有一個目前規劃完全沒涵蓋、必須先想清楚的關鍵前提**：「套用」跟「切回版本」要嘛：
- (a) Agent 只負責建議，使用者自己去改自己網站的程式碼/CMS 並部署——這樣「切版本」不是即時的，要等使用者重新部署
- (b) 這個系統要有能力**直接控制使用者網站呈現給訪客的內容**（做法類似 Optimizely/VWO 這類 CRO 工具，在使用者網站埋一段 JS，由平台動態決定訪客看到哪個版本）——「切版本」才能真的做到「馬上」

「馬上切換」這個描述聽起來指向 (b)，但這是一塊全新的能力（網站內容注入/變體投放引擎），跟目前規劃的「唯讀分析 GA 數據」是完全不同量級的工程，會是這個產品的第三根支柱（前兩根是「影片/圖片製作」「唯讀數據分析」）。

**次要但值得知道的點**：正式 A/B 測試需要足夠流量樣本才能判斷成效差異不是雜訊。你描述的是「使用者主觀覺得好就告訴 Agent」這種人工判斷迴圈，這對流量不大的網站反而更實際（跑正式統計顯著性檢定通常需要不小流量）——可以先做這個簡化版，之後有需要再疊加自動判斷顯著性的邏輯。

### 待確認（下次討論這個構想時要回答）

- 「套用」是 Agent 只建議、使用者自己部署，還是平台要直接控制/注入內容到使用者網站？
- 如果要做內容注入引擎：目標是通用網站（任何人的網站裝一段 JS），還是先支援特定平台（WordPress/Shopify 外掛等）？
- 版本歷史用真的 git repo 存內容，這個方向是否同意？

**2026-09-16 補充討論**：發現一個更省力的實作路徑——Google Tag Manager 本身就內建版本歷史與一鍵回滾（後台 Versions 頁面，每次發布都是一個版本），透過 Tag Manager API 就能操作，不用自己刻 git-based 版本控制或內容注入引擎。如果只是自用（見下方封存的 v2 決策），這條路徑已經足夠實現「保留好版本、迭代壞版本、隨時切回」的核心體驗，不需要走 (b) 內容注入引擎那條重工程的路。

**2026-09-17 補充討論**：「套用後過幾天回來看成效如何」這個步驟，原本以為需要伺服器排程才能做到「自動」，後來發現不用——Claude Code 本身就有排程機制（`/loop`、`ScheduleWakeup`），可以設定「N 天後自動檢查這次 GTM 變更後的 GA 數據，主動回報成效」，不需要額外的伺服器基礎設施。這讓這個構想比原本以為的更容易落地，值得在真的要做這塊時優先評估這條路徑。

---

## 2. 封存：多租戶產品化架構（v2 版 `phase1.md` 全文）

**封存原因**：2026-09-16 討論後，Sam 決定現階段目標改為「自己（或同樣使用 Claude Code 的團隊）使用」，不追求對外部非 Claude Code 使用者開放的產品形態。這份 v2 架構（前端 Web App + 自建 Chrome Extension + 後端 Market Agent Service + 多租戶 OAuth）因此整個降級為「未來如果要對外開放才需要」的構想，先完整封存在這裡，避免之後想法改變時要重新設計一次。降級的關鍵原因：
- 自建 Chrome Extension 想做的「操作使用者真實已登入分頁」，Claude Code 內建的 `claude-in-chrome` 已經直接提供這個能力，不用自己蓋
- MCP／後端 Agent Service／多租戶 OAuth 這些複雜度，只有「服務不用 Claude Code 的外部使用者」時才有必要，自用完全不需要

若未來真的要重新啟動這個方向，直接從這裡復原即可，不用重新討論一次架構。

<details>
<summary>展開查看 v2 完整內容</summary>

# Phase 1 規格書：Market Agent 核心流程與基礎架構（v2，已封存）

**狀態**：草案 v2（已於 2026-09-16 封存，見上方封存原因）
**參考專案**：`D:\Sam_git\Vocabulary_Trainer\Marketing`（素材產線技術棧，非 Agent/產品架構）

## 1. 目標

打造出「使用者給網址與指令 → Agent 規劃影片腳本 → 使用者審核/修改 → 確認後產生行銷影片」這條完整路徑的第一版，同時：

- 驗證「借用使用者真實瀏覽器 session 擷取個人化內容」這個核心差異化能力（用最小可行的 Extension 原型）
- 把資料模型與授權檢查點設計成未來能承接多租戶開放，不用重寫
- 網頁數據分析（GA4/Search Console/SEO 建議）在 Phase 1 只設計資料模型與介面，不實作

## 2. 系統組成

| 組成 | 角色 |
|---|---|
| **前端 Web App** | 使用者對話、審核腳本、接收成品的介面。框架未選定 |
| **Chrome Extension** | 在使用者真實已登入的分頁裡擷取畫面，繞過需要登入才能看到的內容。最小可行版本：`activeTab` 權限 + 使用者主動觸發 + 截圖擷取 |
| **Backend Market Agent Service** | 整合 LLM（provider 待定：Claude 或 Gemini）跑 agent loop、管理腳本審核狀態機、執行擷取與渲染 |
| **Analytics 模組（預留）** | GA4/Search Console 資料存取，只建 schema 不實作邏輯 |

## 3. 核心使用者流程

1. 使用者在前端輸入指令，可指定或不指定要強調的功能
2. 後端決定擷取方式：公開頁面用 Playwright；需登入態且使用者已啟用 Extension，用 Extension 擷取
3. Agent（LLM）根據擷取內容規劃影片腳本
4. 腳本回傳前端，使用者修改
5. 使用者確認
6. 後端啟動非同步渲染 job
7. 前端輪詢狀態，完成後提供下載

## 4. 架構決策要點

- **MCP 定位**：不是使用者介面，是後端內部工具執行層的選配實作，Phase 1 建議先用 LLM 原生 tool use，不強制上 MCP
- **認證三層**：使用者↔前端/Extension（產品帳號系統）；前端/Extension↔後端（S2S/session token）；後端↔Google API（OAuth2）
- **授權檢查點**：所有工具/DB 操作都要帶入 `tenantId`/`projectId` 並驗證歸屬，即使 S2S 階段規則寬鬆，檢查點要先佔位，避免多租戶開放時要回頭補
- **Extension 擷取模式**：`activeTab` + 使用者主動觸發 + WebSocket 回傳後端；與後端 Playwright 擷取並存，依頁面是否需登入態選用
- **非同步渲染 job**：`start_render_job`/`get_job_status` 兩段式，DB 表 + worker，不需要 Redis/BullMQ

## 5. 資料模型

```
tenants (id, name, created_at)
projects (id, tenant_id, name, target_domain, brand_kit, created_at)
script_drafts (id, project_id, status, script_json, source_url, created_at, updated_at)
capture_sessions (id, project_id, source['extension'|'playwright'], target_url, status, asset_paths, created_at)
render_jobs (id, project_id, script_draft_id, status, output_path, error, created_at, updated_at)
google_connections (id, project_id, ga4_property_id, search_console_url, access_token_enc, refresh_token_enc, token_expires_at)
```

## 6. 後端能力（Agent 可呼叫的機械性工具）

| 能力 | 輸入 | 輸出 |
|---|---|---|
| `capture.request` | projectId, url, mode | captureSessionId |
| `capture.get_status` | captureSessionId | {status, assetPaths?} |
| `render.start_job` | projectId, scriptDraftId | jobId |
| `render.get_job_status` | jobId | {status, progress?, outputPath?, error?} |

## 7. 技術棧

Node.js + TypeScript 後端、LLM provider 待定（Claude/Gemini，透過抽象介面）、Manifest V3 Extension、Playwright（fallback 擷取）、Remotion/FFmpeg/sharp（渲染）、PostgreSQL

## 8. 未解決的風險（封存時仍待確認）

- 前端框架未選定
- Extension 錄影（`tabCapture`/`MediaRecorder`）的使用者體感未知
- 混合擷取策略（Extension vs Playwright）判斷邏輯未定義
- 使用者帳號系統完全未設計
- 未來開放多租戶時的 Auth-as-a-Service 選擇（建議 Auth0/WorkOS，不自建 OAuth 2.1 Resource Server）
- GA 埋碼/GTM 寫入能力（後來討論才發現需要，v2 完全沒涵蓋）：需要 Tag Manager API + Analytics Admin API，且需要「對目標專案提出程式碼修改」這個全新工具類別

</details>

---
