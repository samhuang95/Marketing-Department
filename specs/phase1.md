# Phase 1 規格書：Skill 化的行銷素材與數據分析工具（自用）

**狀態**：草案 v7（取代 v6——拿掉整套 Junction 分發機制，改成「永遠在 `Marketing-Department` 遠端操作」）
**與 v6 的差異**：v6 假設使用者會切進每個目標專案自己的資料夾工作，所以需要 Junction 把 Skill/指令「借」過去給那個專案看到。實際使用後確認：使用者真正想要的工作模式是**永遠留在 `Marketing-Department` 操作**，跟它說「幫哪個專案做什麼」，不用親自切過去；產出（影片、分析報告）也集中留在這個 repo，不是分散到各個目標專案。因此：
- 拿掉 Junction 機制、拿掉 `scripts/marketing-init`／`scripts/sync-projects`／`<專案>/Marketing/config.json`
- `skills/`、`commands/` 直接搬進 `Marketing-Department/.claude/` 底下（因為現在只會在這個 repo 工作，不需要再考慮「怎麼讓別的專案看到」）
- 每個專案的所有設定（原本分散在 `projects.json` + 各專案自己的 `config.json`）合併成 `projects.json` 一份，是唯一真相來源
- 產出的影片/圖片改成集中放在 `Marketing-Department/output/<專案名稱>/`
- 唯一的例外是 `ga-setup`（裝 GTM）——這個 Skill 結構上就是要編輯目標專案的程式碼，無法避免需要目標專案的讀寫權限，使用者已確認接受這個例外（需要時用 `/add-dir`）
- v5/v6 的 Junction 設計不再視為可行方案保留；如果你在找那段內容，回去 git 歷史找 v6 版本即可（跟 v2 多租戶架構不同，這不是「未來可能要做」的構想，是判斷錯誤後的修正，不特別封存）

**v2（多租戶產品化）完整內容仍封存在** [`specs/ideas-backlog.md`](ideas-backlog.md) 第 2 節，跟這次的修正無關。
**參考專案**：`D:\Sam_git\Vocabulary_Trainer\Marketing`

---

## 1. 目標

建立一套從 `Marketing-Department` 這個 repo 操作、能對多個已註冊專案生效的 Claude Code Skills + 指令，達成：

1. 針對指定專案，規劃並產生行銷影片/圖片
2. 讀取專案的 GA4/Search Console/PageSpeed 數據，由 Claude 直接分析、給建議
3. 視需要，幫專案裝上/調整 GA 追蹤（透過 Google Tag Manager 容器），之後調整追蹤設定不用再碰程式碼

不需要伺服器、資料庫、前端、瀏覽器擴充套件——執行環境就是 Claude Code 本身，且**永遠在這個 repo 裡工作**，不需要切換到目標專案的資料夾。

## 2. 核心能力與對應機制

| 能力 | 怎麼做 |
|---|---|
| 擷取公開網頁畫面 | 對著 `projects.json` 裡該專案的 `devServerUrl`，用 Playwright 截圖/錄影——不需要目標專案的檔案存取權，只需要網路連線 |
| 擷取需要登入態的個人化畫面 | `claude-in-chrome`（Claude Code 內建），操作真實已登入分頁 |
| 規劃/修改影片腳本 | Claude 在對話中直接產出，使用者來回修改，依 `templates/registry.json` 挑選合適範本 |
| 渲染影片/圖片 | FFmpeg（`ffmpeg-static`）+ sharp，輸出到 `Marketing-Department/output/<專案名稱>/`；Remotion（品牌疊字/轉場）留待後續加強，v1 先求真的能產出可用素材 |
| 讀取 GA4/Search Console 數據 | 腳本呼叫 Google API，用 `Marketing-Department/.env` 的憑證——純 API 呼叫，不需要目標專案的檔案存取權 |
| **技術 SEO 健檢**（Core Web Vitals、載入速度） | PageSpeed Insights API——只需要 API key，不用 OAuth |
| 給 SEO/成效建議 | Claude 直接分析拿到的所有數據 |
| 幫專案裝 GA 追蹤 | **唯一需要碰目標專案檔案的能力**——Claude Code 編輯目標專案程式碼裝 GTM 容器；需要時用 `/add-dir` 開放存取；之後用 Tag Manager API 做設定層級變更 |
| **環境自檢** | `scripts/doctor` 檢查 `.env`、`projects.json` 各專案的路徑/必填欄位/dev server 連線狀態 |

## 3. 架構模式：永遠在 `Marketing-Department` 操作

**不用切換工作目錄。** 使用者永遠在 `Marketing-Department` 開 Claude Code，跟它說「幫 `<專案名稱>` 做 XX」，Skill 邏輯去操作那個專案（讀它的 dev server 網址、打 API），但 Claude Code 的工作目錄自始至終是 `Marketing-Department`。

- **Skill 與指令直接放在這個 repo 的 `.claude/skills/`、`.claude/commands/`**——Claude Code 原生就會在目前工作目錄找這兩個資料夾，不需要任何分發機制（不是 Junction、不是複製、不是安裝到使用者主目錄）
- **`projects.json`** 是每個專案的唯一真相來源（路徑、`devServerUrl`、`brandKit`、`ga4PropertyId`、`searchConsoleSiteUrl`、`gtmContainerId`、`gtmAccountId`）——每台機器自己的檔案，已加進 `.gitignore`，格式範例見 `projects.example.json`。新增一個專案就是在這裡加一筆記錄（手動編輯即可，欄位不多，跑 `scripts/doctor` 會告訴你缺什麼）
- **三個 Skill 裡兩個完全不需要目標專案的檔案存取權**（`marketing-video` 只打 dev server 的網址；`analytics` 只打 Google API），完全相容這個模式
- **`ga-setup` 是唯一的結構性例外**——裝 GTM 必須編輯目標專案的實際程式碼。遇到這個 Skill 時，如果目前 session 有存取範圍限制，明確告訴使用者需要 `/add-dir` 開放那個專案，不要嘗試繞過。這是已知、已確認接受的例外，不是要解決的問題

## 4. 一次性初始設定（全域做一次，對所有專案生效）

1. **Google Cloud 專案**：建立一個 GCP 專案，啟用 Analytics Data API、Search Console API、Tag Manager API、Analytics Admin API、**PageSpeed Insights API**（這步要你親自用自己的 Google 帳號操作）。建立 OAuth Client（網頁應用程式類型）時，「已授權的重新導向 URI」要**逐字**加上 `http://localhost:53682`（不能多結尾斜線）——`scripts/setup-oauth` 這支本機授權腳本用的固定 port。同時確認 OAuth 同意畫面的「測試使用者」有加入自己的帳號（新建立的 OAuth Client 預設是 Testing 狀態）
2. **PageSpeed Insights API Key**：在同一個 GCP 專案下建一組 API Key——比下面的 OAuth 設定簡單很多，**可以先做這步，馬上就能用技術 SEO 健檢功能，不用等 OAuth 授權**
3. **OAuth 授權一次**：跑 `Marketing-Department/scripts/setup-oauth`（`npm start`）走一次本機 OAuth consent flow，拿到 refresh token，寫進 `Marketing-Department/.env`（**已加進 `.gitignore`，不會被 commit**）——這組憑證代表「你這個 Google 帳號」，所有專案共用同一份
4. **Google Tag Manager / Analytics 帳號**：建立一個 GTM 帳號（帳戶名稱建議用你自己的名字，代表「這些網站的擁有者」；每個專案各自的容器才用該專案的名稱/網域命名）、一個 GA 帳號（只需要各一個，底下可以放多個專案，見第 7 節）
5. **建立 `projects.json`**：複製 `Marketing-Department/projects.example.json` 成 `projects.json`，填入要管理的專案清單

完成這五步之後，新增一個新專案只需要在 `projects.json` 加一筆記錄，跑 `node scripts/doctor/index.mjs <專案名稱>` 確認設定正確——不需要透過 Claude，也不需要任何安裝/連結步驟。

## 5. 日常使用情境

### 情境一：幫某個 App 做一支新的宣傳影片

1. 在 `Marketing-Department` 目錄下開 Claude Code
2. **第一次管理這個專案的話**：在 `projects.json` 加一筆記錄（`name`、`path`、`devServerUrl` 至少要填），跑 `node scripts/doctor/index.mjs <專案名稱>` 確認路徑存在、dev server 連得到
3. 跟 Claude 說「幫 `<專案名稱>` 針對首頁規劃一支介紹影片，強調 XX 功能」，或用 `/marketing:plan-video`
4. Claude 讀 `projects.json` 拿到該專案的 `devServerUrl`，查 `templates/registry.json` 挑一個合適的範本，用 Playwright（或 `claude-in-chrome`，如果畫面需要登入）截圖/錄影，規劃腳本草稿給你看
5. 你來回修改，確認後 Claude 觸發 Remotion + FFmpeg 渲染
6. **成品落在 `Marketing-Department/output/<專案名稱>/demo-xxx.mp4`**，同時在 `Marketing-Department/reports/<專案名稱>/` 記一筆渲染紀錄

### 情境二：看某個 App 這個月的成效，順便跟別的專案比較

1. 在 `Marketing-Department` 目錄下開 Claude Code，用 `/marketing:ga-report` 或直接問「`<專案名稱>` 這個月表現如何，有什麼建議」
2. Claude 讀 `projects.json` 拿到 GA4 Property ID / Search Console site，用 `Marketing-Department/.env` 裡的 token 打 GA4 + Search Console API，**同時用 PageSpeed API key 跑一次技術 SEO 健檢**
3. Claude 整合三種數據來源直接在對話裡分析、給建議，同時把摘要寫一份到 `Marketing-Department/reports/<專案名稱>/2026-09-23-analysis.md`
4. 想跨專案比較就直接問「比較 A、B 兩個專案上個月的轉換率」——因為你本來就在同一個地方操作所有專案，這個問題不用切換情境就能問

### 情境三：幫某個 App 裝上 GTM（唯一需要離開這個 repo 存取權限的情境）

1. 用 `/marketing:install-gtm`，或問 Claude「幫 `<專案名稱>` 裝 Google Tag Manager」
2. Claude 檢查 `projects.json` 裡這個專案有沒有 `gtmContainerId`，沒有的話透過 Tag Manager API 在你唯一的 GTM 帳號下新建一個容器，寫回 `projects.json`
3. **這一步需要編輯目標專案的實際程式碼**——如果目前 session 存取不到那個路徑，Claude 會提示你用 `/add-dir` 開放，這是已知例外，不是 bug
4. Claude 編輯這個專案的程式碼加入 GTM snippet，**開分支/diff 給你 review，你確認後才合併**
5. 之後要調整追蹤事件，跟 Claude 說（走 Tag Manager API）或直接去 `tagmanager.google.com` 手動改，兩邊看到的是同一份東西——這一步不用再 `/add-dir`，因為只是打 API

### 情境四：東西怪怪的，不知道哪裡壞了

1. 跑 `node scripts/doctor/index.mjs`（不需要 Claude），或在 Claude Code 裡問一句讓它代跑
2. 依序檢查並列出：`.env` 四個欄位是否已設定（含真實打一次 API 驗證 OAuth token 有效性）、`projects.json` 裡每個專案的路徑是否存在、必填欄位是否已填、dev server 是否連得到
3. 每一項標示 `OK` 或 `FIX`，`FIX` 的附上具體修法

## 6. 目錄與檔案落地位置總覽

```
D:\Sam_git\Marketing-Department\
  .env                    <- 唯一一份憑證檔（.env 格式），已加進 .gitignore
  .env.example             <- git 有版控的格式範例
  projects.json              <- 每個專案的唯一真相來源（路徑、devServerUrl、brandKit、GA4/GTM 相關 ID），已加進 .gitignore
  projects.example.json       <- git 有版控的格式範例
  package.json                 <- 共用依賴（dotenv、googleapis...）統一裝在這裡，scripts/ 跟 .claude/skills/ 底下的程式碼都能透過 Node 模組解析往上找的機制共用
  .claude/
    skills/
      marketing-video/
      analytics/
      ga-setup/
    commands/
      doctor.md
      marketing/
        plan-video.md         (-> /marketing:plan-video)
        ga-report.md           (-> /marketing:ga-report)
        install-gtm.md          (-> /marketing:install-gtm)
  scripts/
    lib/
      doctor-checks.mjs        <- .env 驗證、專案欄位檢查、dev server 連線檢查
      cli-args.mjs              <- 共用的 --flag=value 參數解析（只切第一個 "="，避免網址帶 query string被截斷）
      projects.mjs               <- 共用的 projects.json 讀取／單筆查詢（loadProject 找不到會丟錯，不會靜默放行）
    setup-oauth/                <- 一次性本機 OAuth consent flow（`npm start`），見第 4 節
    doctor/                      <- 環境自檢（純腳本，不需要 Claude），見第 5 節情境四
  capture/                <- Playwright 專案（官方 CLI 建置），擷取目標專案的真實畫面/錄影
    playwright.config.ts    <- baseURL 由 CAPTURE_PROJECT_NAME 環境變數查 projects.json 動態帶入，不寫死
    flows/
      screenshot-deck.spec.ts   <- 捲動目標文字讀自 project.capture.sectionHeadingText
      scroll-video.spec.ts       <- 內容可見判斷文字讀自 project.capture.heroText
    output/
      <專案名稱>/                 <- 原始擷取檔（截圖、webm）分專案存放，已加進 .gitignore，不是最終成品
  render/                  <- 把 capture/ 的原始擷取檔合成/轉檔成最終行銷素材，執行前都會用 loadProject() 驗證專案名稱
    compose-screenshot-deck.mjs   <- 品牌色讀自 project.brandKit.colors，沒設定才退回預設值
    encode-scroll-video.mjs
  templates/
    registry.json           <- 範本清單：id、長寬比、目標平台、建議時長、說明、對應的 capture/render 腳本
  output/
    <專案名稱>/
      scroll-demo.mp4          <- 這個專案的最終成品（影片/截圖/橫幅），集中放這裡，已加進 .gitignore
  reports/
    <專案名稱>/
      2026-09-23-analysis.md    <- 分析摘要（GA4/Search Console/PageSpeed）
      2026-09-23-render-001.md   <- 渲染紀錄（範本、腳本版本、輸出路徑）
```

目標專案（例如 `D:\Sam_git\MyShowCase`）**完全不需要放任何跟這套工具相關的東西**——沒有 `.claude/skills`、沒有 `Marketing/` 資料夾。唯一例外：`ga-setup` 執行時會直接編輯它原本就有的程式碼檔案（加 GTM snippet），那是它自己專案程式碼的一部分，不是這套工具額外塞進去的檔案。

## 7. 統一管理在哪裡：GTM／GA／PageSpeed／reports 的分工

- **所有專案的 GTM 容器**：登入 `tagmanager.google.com` 一個帳號，列出所有容器（= 所有專案），內建版本歷史/回滾
- **所有專案的 GA4 數據**：登入 `analytics.google.com` 一個帳號，列出所有 Property（= 所有專案）
- **PageSpeed Insights**：這個 API 本身**沒有帳號/歷史記錄的概念**（每次呼叫都是即時查詢），歷史趨勢要靠 `Marketing-Department/reports/` 自己留存
- **`Marketing-Department/reports/`**：分析摘要 + 渲染歷史的「決策日誌」，留歷史紀錄可以回頭查、可以用 git diff 看變化，不是取代 GTM/GA 後台
- **`Marketing-Department/output/`**：所有專案的最終行銷素材，集中一處管理——這是這次架構調整新增的好處，原本這些檔案會散落在各專案自己的資料夾

## 8. 範圍

### 範圍內

- [x] **拿掉 Junction 機制**：移除 `scripts/marketing-init`、`scripts/sync-projects`、`scripts/lib/links.mjs`、`scripts/lib/init-project.mjs`；`skills/`、`commands/` 搬進 `.claude/`；各專案 `Marketing/config.json` 併回 `projects.json`
- [x] **`scripts/doctor` 改版**：拿掉 Junction 檢查，改成檢查 `projects.json` 每筆記錄的路徑/必填欄位，新增 dev server 連線檢查（比舊版更有意義的檢查）
- [x] **影片/圖片 Skill**（`marketing-video` + `/marketing:plan-video`）：`capture/`（官方 Playwright CLI）+ `render/` 兩個範本（`screenshot-deck`、`scroll-demo-video`）已跑通端到端，成品在 `output/sam-showcase/`。影片範本目前是 Playwright `recordVideo` + FFmpeg 轉檔的最小可行版，還沒接 Remotion（見第 9 節）
- [x] **範本庫**：`templates/registry.json`，列出 2 個範本
- [ ] **Analytics Skill**（`analytics` + `/marketing:ga-report`）：GA4 Data API、Search Console API、PageSpeed Insights API 三種查詢腳本，整合成一份建議
- [ ] **GA 裝設 Skill**（`ga-setup` + `/marketing:install-gtm`）：GTM 容器安裝指引（一次性程式碼修改，走 PR/diff review，需要 `/add-dir`）+ Tag Manager API 操作腳本
- [x] **`scripts/setup-oauth`**：一次性 OAuth 授權腳本，已完成並驗證
- [x] `Marketing-Department/output/`、`reports/` 的寫入邏輯——影片/圖片 Skill 已驗證這條路徑
- [x] 至少在一個實際專案（`sam-showcase`）跑通一次端到端流程，驗證可行——影片/圖片這塊完成，Analytics／GA 裝設還沒

### 範圍外（移到 `ideas-backlog.md`）

- 多租戶產品化——完整架構封存在 `ideas-backlog.md` 第 2 節
- 需要 24/7 常駐、不依賴使用者開著 Claude Code 的自動化情境——排程式的「N 天後自動回來看成效」可以用 Claude Code 自己的排程機制做，見 `ideas-backlog.md` 第 1 節補充
- 自建 GA 版本管理系統——已確認用 GTM 自帶的版本歷史/回滾即可

## 9. 技術棧

- **執行環境**：Node.js（確定）；框架/套件初始化一律照文件開頭「官方優先」原則，用官方 CLI 建置
- **依賴統一裝在 repo 根目錄**：`Marketing-Department/package.json` + `node_modules`，`scripts/` 與 `.claude/skills/` 底下所有程式碼共用——Node 模組解析是從檔案自己的位置往上找，不會跨到旁邊資料夾，分散安裝會導致共用程式碼找不到套件（實測踩過這個坑，見 `task1.md`）。**唯一刻意的例外：`capture/`**——Playwright 用官方 CLI（`npm init playwright@latest`）建置，本來就會自建自己的 `package.json`/`node_modules`，這是「官方優先」原則優先於「共用根目錄依賴」原則，不是遺漏（2026-09 code review 曾經被點出來當作疑慮，這裡明確記錄澄清）
- **環境變數**：`.env` 格式，repo 根目錄，見第 11 節
- **擷取/渲染**：Playwright（官方 CLI 建置於 `capture/`）、FFmpeg（`ffmpeg-static`）、sharp——都已實際使用並驗證。Remotion 列在原始規劃裡，但 v1 影片範本改用「Playwright `recordVideo` 直接錄 + FFmpeg 轉檔」達成目的，Remotion 疊字/轉場留待後續加強再引入，避免為了湊技術棧而提前增加複雜度
- **需登入態的畫面擷取**：`claude-in-chrome`
- **網頁數據**：
  - Analytics Data API、Search Console API、Tag Manager API、Analytics Admin API——OAuth2 認證
  - **PageSpeed Insights API**——API key 認證，比 OAuth 簡單
  - 透過 `googleapis` Node client
- **不需要**：後端伺服器、資料庫、前端框架、MCP Server、OAuth resource server、Junction/任何分發機制

## 10. GA 埋碼設計

- **一次性安裝**：Claude Code 編輯目標專案的程式碼，加入 Google Tag Manager 容器 snippet（不要直接埋 gtag.js——GTM 是容器，裝一次之後所有後續的追蹤設定變更都能透過 API/後台完成，不用再改程式碼）
- **這是唯一需要 `/add-dir` 的操作**：`marketing-video`、`analytics` 都不需要目標專案的檔案存取權，只有這個 Skill 因為要編輯程式碼而需要——遇到時明確告訴使用者，不要嘗試繞過
- **安裝方式**：走一般的 PR/diff review 流程——跟腳本審核那套「先看過再套用」的精神一致
- **安裝之後**：所有追蹤事件、標籤、版本管理都透過 Tag Manager API 完成，不用再碰程式碼

## 11. 憑證管理

憑證放在 `Marketing-Department` 專案根目錄（`.env`，已加進 `.gitignore`），不是使用者主目錄——這是刻意的選擇，優先考量可控性（詳細理由見本節最後）。

- 所有憑證統一用 **`.env` 格式**存在 **`Marketing-Department/.env`**：
  ```
  GOOGLE_OAUTH_CLIENT_ID=...
  GOOGLE_OAUTH_CLIENT_SECRET=...
  GOOGLE_OAUTH_REFRESH_TOKEN=...
  PAGESPEED_API_KEY=...
  ```
  `Marketing-Department/.env.example` 是 git 有版控的格式範例（無真實值）
- **明確路徑載入，且用相對於腳本自己檔案位置的路徑，不寫死絕對路徑**：腳本裡一律用 `fileURLToPath(import.meta.url)` 算出自己的檔案位置，往上找到 repo 根目錄的 `.env`
- **絕對不能被 commit**——已加進 `.gitignore`
- 不需要 token 加密資料庫、不需要多租戶隔離——只有一個人在用

### 為什麼放在專案裡，不是使用者主目錄

原本規劃放在 `~/.market-agent/.env`（使用者主目錄），理由是「就算不小心也不可能進 git」——但這個保護只在「使用者對 git 紀律沒把握」時才有意義。討論後確認：對這個使用者來說，可控性（開專案資料夾就看到所有東西）優先於這層保護，而且憑證本來就不會透過 `git clone` 帶到新機器（不管放哪裡都要 gitignore，gitignore 的檔案不會被 clone），所以「放專案裡」並不會犧牲任何跨機器可攜性——真正可攜的是程式碼本身，這部分完全在 `Marketing-Department` repo 裡，正常隨 git clone 帶走。

未來如果要讓其他使用者使用，模式是**各自 clone 一份、各自設定自己的憑證**（不是共用同一份 repo 實例），所以憑證放在專案裡不會有「多人共用同一份憑證」的問題。

## 12. 驗收標準

- [x] `scripts/setup-oauth` 能完成 OAuth consent flow，正確寫入 `Marketing-Department/.env`
- [x] `scripts/doctor` 能正確反映環境真實狀態：`.env` 四個欄位（含真實 API 驗證）、`projects.json` 專案的路徑/必填欄位、dev server 連線
- [x] 對一個已註冊專案（`sam-showcase`），能產生實際影片與截圖，落在 `Marketing-Department/output/sam-showcase/`，並在 `reports/` 留下渲染紀錄（目前是直接執行 capture/render 腳本驗證通過；「先規劃腳本草稿、使用者來回修改」這段對話式流程的完整體驗，等實際用 `/marketing:plan-video` 走一次真實需求再驗證）
- [ ] 至少驗證一次用 `claude-in-chrome` 擷取需要登入態的個人化畫面——**未測試**，`sam-showcase` 首頁完全公開，沒有需要登入態的畫面可以測，等有這種需求的專案再驗證
- [x] `/marketing:ga-report` 能整合 GA4、Search Console、PageSpeed Insights 三種數據來源，給出至少一項具體建議，並寫入 `reports/`——已完成，見 `reports/sam-showcase/2026-09-23-analysis.md`（含一次「查錯 Property」的錯誤發現與更正）
- [ ] `/marketing:install-gtm` 能在一個測試專案裡完成 GTM 容器的程式碼安裝（走過 `/add-dir` + PR/diff review），容器出現在 `tagmanager.google.com` 的帳號列表裡——**部分完成**：容器確認/All Pages 觸發條件建立已驗證（過程中誤建一個重複容器，已修好根因，誤建的容器需要使用者手動刪除），GA4 標籤設定卡在缺 Measurement ID（需要 `analytics.edit` scope 或使用者手動建 GA4 Property），程式碼安裝這一步卡在需要 `/add-dir`，詳見 `reports/sam-showcase/2026-09-23-ga-setup.md`
- [x] `templates/registry.json` 至少列出 2 個範本，Claude 能依需求正確挑選——已完成（`screenshot-deck`、`scroll-demo-video`）
- [ ] 能問一個跨專案比較的問題，Claude 分別讀 `projects.json`/`reports/` 給出比較結果——**未測試**，目前 `projects.json` 只註冊了 `sam-showcase` 一個專案，機制上（讀多筆 `projects.json` 記錄、分別查詢）應該可行，但沒有第二個真實專案可以實測，等使用者註冊第二個專案後驗證

## 13. 待確認事項

1. 這套 Skill 之後如果證明有價值，要不要考慮往「開放給其他使用者」的方向發展——`ideas-backlog.md` 保留 v2 完整架構當起點（仍然開放，這次沒有動）
2. ~~要先做哪一個 Skill~~——**已解決**：三個依序做完了（影片/圖片 → Analytics → GA 埋碼）
3. ~~`reports/` 要用 Markdown 還是 SQLite~~——**已驗證**：實際用下來 Markdown 夠用，人工查閱、git diff 都方便，目前沒有跨專案統計的急迫需求，先不加 SQLite，等真的需要大量查詢時再考慮
4. ~~要不要做「新增專案」輔助腳本~~——**維持手動編輯 `projects.json` + `doctor` 驗證**，但新增了 `scripts/discover-google-properties.mjs` 幫忙查真實的 GA4/Search Console/GTM ID（不用自己去後台找），算是介於「完全手動」跟「全自動輔助腳本」之間的折衷
5. **新增**：`ga-setup` 需要建立 GA4 Property 時，要不要擴大 OAuth scope（加 `analytics.edit`）重新走一次授權——目前這個能力被排除在外，`sam-showcase` 的 GA4 Property 建立卡在這裡，需要使用者決定
6. **新增**：`sam-showcase` 的 GTM 帳號裡目前有一個因為先前 bug 誤建的重複容器（`GTM-WTSBTSFR`），需要使用者手動刪除（見 `reports/sam-showcase/2026-09-23-ga-setup.md`）

## 14. 後續 Phase 預告

- 更多 Skill：例如自動化週報、多平台廣告素材尺寸規格
- 排程式的成效追蹤（呼應 `ideas-backlog.md` 第 1 節的 GA 版本管理構想）
- 如果未來真的要對外開放：`ideas-backlog.md` 第 2 節保留的產品化架構可以直接復原
