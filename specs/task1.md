# Phase 1 開發任務清單

**對應規格：** [`specs/phase1.md`](phase1.md)（目前 v7）
**更新規則：** 每完成一個子項目即打勾，該階段全部完成後打上層勾
**開發原則**：一律遵守 `phase1.md` 開頭的「官方優先」原則

**2026-09-23 架構修正**：原本階段零、階段二建的 Junction 分發機制已經整個拿掉，改成「永遠在 `Marketing-Department` 遠端操作」——理由跟細節見 `phase1.md` v7 開頭的差異說明。以下清單已依照新架構重新整理，被移除的項目標記說明，不是刪掉裝作沒發生過。

---

## 階段零：Repo 骨架 ✅

- [x] 建立 `.claude/skills/`、`.claude/commands/`、`templates/`、`reports/`、`output/` 資料夾結構（**修正**：`skills/`、`commands/` 原本在 repo 根目錄，現在搬進 `.claude/` 底下，因為不再需要 Junction 分發，Claude Code 原生就會在這裡找）
- [x] 建立三個 Skill：`.claude/skills/marketing-video/`、`.claude/skills/analytics/`、`.claude/skills/ga-setup/`（`SKILL.md` 骨架，內容已更新為「永遠在 Marketing-Department 操作」的模式）
- [x] 建立指令：`.claude/commands/marketing/{plan-video,ga-report,install-gtm}.md`、`.claude/commands/doctor.md`

## 階段一：一次性環境設定 ✅

- [x] Google Cloud 專案，啟用 5 個 API（Analytics Data、Search Console、Tag Manager、Analytics Admin、PageSpeed Insights）
- [x] OAuth Client（網頁應用程式類型），重新導向 URI `http://localhost:53682`
- [x] PageSpeed Insights API Key
- [x] Google Tag Manager 帳號（帳戶名稱用使用者自己的名字；容器 `sam-showcase.com` 對應官網）、Google Analytics 帳號
- [x] `scripts/setup-oauth`：一次性 OAuth 授權腳本，已完成並用 `doctor` 的真實 API 呼叫驗證有效
- [x] `Marketing-Department/.env` 四個欄位全部設定完成

**中途踩過的坑**：第一次跑 OAuth 授權逾時，排查後是重新導向 URI/測試使用者設定問題，修正後重跑成功。

## 階段二：`projects.json` 架構 + `doctor` 環境自檢 ✅

**已整個重做**：原本這裡是「`/marketing-init` 與 `/doctor`」，靠 Junction 讓 Skill 對每個目標專案生效。確認主要工作模式是「永遠在 `Marketing-Department` 操作」之後，Junction 不再需要——`marketing-video`／`analytics` 兩個 Skill 只需要 `projects.json` 裡的資訊（`devServerUrl`、Google API 相關 ID），不需要在目標專案裡放任何檔案。

- [x] `projects.json` 成為每個專案的唯一真相來源（原本分散在 `projects.json` + 各專案自己的 `Marketing/config.json` 兩個檔案，已用一次性遷移腳本併回一份）
- [x] 移除 `scripts/marketing-init`、`scripts/sync-projects`、`scripts/lib/links.mjs`、`scripts/lib/init-project.mjs`（Junction 相關，不再需要）
- [x] 移除 `MyShowCase` 裡建過的四個 Junction 與 `Marketing/` 資料夾
- [x] `scripts/doctor` 改版：拿掉 Junction 檢查，改成檢查 `projects.json` 每筆記錄的路徑是否存在、必填欄位是否已填，**新增 dev server 連線檢查**（實際打一次 HTTP 請求，比舊版「有沒有填網址」更有意義）
- [x] 共用依賴（`dotenv`、`googleapis`）統一移到 repo 根目錄 `package.json`/`node_modules`（原本分散在各腳本資料夾，導致 `scripts/lib/` 共用程式碼找不到套件——Node 模組解析是從檔案自己位置往上找，不會跨到旁邊資料夾）
- [x] 用 `sam-showcase`（`D:\Sam_git\MyShowCase`）驗證：路徑存在、`devServerUrl` 已填、dev server 未啟動時能正確回報 `FIX`

## 階段三：影片/圖片 Skill（`marketing-video`）✅

不需要目標專案的檔案存取權，只需要 `projects.json` 裡的 `devServerUrl`。**中途調整**：影片範本先用 Playwright `recordVideo` + FFmpeg 轉檔的最小可行版本，還沒接 Remotion（品牌疊字/轉場留到後續，見 SKILL.md 待補清單）——先求真的能產出一支能用的影片，不強求一步到位。

- [x] 用官方 CLI 建置 `capture/`（Playwright，`npm init playwright@latest`）
- [x] 整理現有 `app-marketing-assets` skill 的能力，改成從 `projects.json` 取得目標專案資訊
- [x] 補上「先規劃腳本、使用者確認、再產生」的流程指引（寫進 SKILL.md 跟 `/marketing:plan-video`）
- [x] 建立 `templates/registry.json`，列出 2 個範本：`screenshot-deck`（截圖+瀏覽器窗框）、`scroll-demo-video`（真實錄影+FFmpeg 轉檔）
- [x] 實作 `/marketing:plan-video` 指令邏輯
- [x] 在 `sam-showcase` 上跑通端到端兩個範本，成品落在 `Marketing-Department/output/sam-showcase/`（`01-hero-framed.png`、`02-showcase-framed.png`、`03-footer-cta-framed.png`、`scroll-demo.mp4`）
- [x] 渲染完成後，在 `Marketing-Department/reports/sam-showcase/2026-09-23-render-001.md` 寫入渲染紀錄

**中途踩的坑（詳見上述渲染紀錄跟 SKILL.md）**：
1. `screenshot-deck` 的品牌色是用 sharp 直接從實際渲染截圖取樣得到的真實值（背景 `#f6f4ee`、強調色 `#c8ff00`、深色 `#0f0f0f`），不是憑印象配色
2. `scroll-demo-video` 第一版錄到一大段頁面載入的空白畫面——`waitForLoadState('networkidle')` 不代表畫面已經渲染完成。改成讓擷取腳本量測「內容真的可見」的實際秒數寫成 metadata，編碼時動態讀取裁切，不寫死猜測值
3. 判斷「內容可見」一開始用 `getByRole('heading', ...)` 量到的時間（6.7s）比實際畫面出現時間（~3.5s）晚很多，換成 `getByText(...)` 才準——`getByRole('heading')` 的 accessible text 可能因為文字漸入動畫而比視覺畫面晚完成
4. 所有結論都是實際用 ffmpeg 抽幀看過畫面才確認的，不是只看腳本沒報錯就當作完成

## 階段四：Analytics Skill（`analytics`）

不需要目標專案的檔案存取權，純 API 呼叫。**中途新增**：`scripts/discover-google-properties.mjs`——用既有 OAuth 憑證列出真實可存取的 GA4/Search Console/GTM 帳號資料，自動比對填進 `projects.json`，不用使用者自己去後台找 ID。也新增 `projects.json` 的 `liveUrl` 欄位（PageSpeed 打不到 `devServerUrl` 的 localhost，需要公開網址）。

- [x] `scripts/discover-google-properties.mjs`：探索真實 GA4 Property（`properties/256164202`，帳號內唯一一個，命名「測試操作」不是明確指名 sam-showcase，**假設**是配給這個網站的，待使用者驗收確認）、Search Console 已驗證網站（`sc-domain:sam-showcase.com`，明確對應）、GTM 容器（`sam-showcase.com` -> `GTM-TXDXTHST`，明確對應）
- [x] 寫 GA4 Data API 查詢腳本（`scripts/lib/ga4.mjs`）——注意 `activeUsers` 是去重計數，分頁明細加總會重複算，額外查一次不拆維度的站台總計
- [x] 寫 Search Console API 查詢腳本（`scripts/lib/search-console.mjs`）——同樣道理，總計另外查一次不拆維度的版本，不能只加總 top 20 筆
- [x] 寫 PageSpeed Insights API 查詢腳本（`scripts/lib/pagespeed.mjs`）——用 `projects.json` 新增的 `liveUrl` 欄位（`https://sam-showcase.com`），不能用 `devServerUrl`
- [x] 三種數據來源整合成 `scripts/analytics-report/index.mjs`（只回傳乾淨 JSON，不做分析判斷）
- [x] 實作 `/marketing:ga-report` 指令邏輯
- [x] 在 `sam-showcase` 上跑通，真實數據給出具體建議，寫入 `reports/sam-showcase/2026-09-23-analysis.md`
- [x] **中途發現並更正一個錯誤假設**：一開始以為帳號裡唯一的 GA4 Property（「測試操作」）就是配給 sam-showcase 的，查了它的 data stream 才發現實際追蹤的是另外兩個完全無關的網站（蝦皮賣場、`ctheworldx.com`）。**GA4「0 數據」的真正原因是查錯 Property，不是追蹤碼沒裝**——已經更正 `projects.json`（清空 `ga4PropertyId`）跟分析報告，教訓也記進 `ga-setup` 的 SKILL.md

## 階段五：GA 裝設 Skill（`ga-setup`）——唯一需要 `/add-dir` 的階段

- [x] 寫 Tag Manager API 操作腳本（`scripts/lib/gtm.mjs`：確認/建立容器、確認/建立 All Pages 觸發條件、GA4 標籤 upsert、版本發布、官方安裝片段產生）
- [x] 實作 `/marketing:install-gtm` 指令邏輯 + `scripts/install-gtm/index.mjs`，包含「偵測到存取不到目標專案時，提示使用者 `/add-dir`」的處理
- [x] **中途出現一個真的 bug，已修正**：第一版用 `project.name` 跟 GTM 容器名稱做模糊比對來判斷容器存不存在，但使用者手動建立的容器名稱（`sam-showcase.com`）跟 `projects.json` 的內部名稱（`sam-showcase`）不一致，誤判「不存在」，**在使用者真實 GTM 帳號裡建立了一個多餘的重複容器**（`GTM-WTSBTSFR`）。已修正邏輯：`getContainerById` 優先信任 `projects.json` 已記錄的 ID，不再用名稱模糊比對誤判。**這個誤建的重複容器需要使用者手動去 GTM 後台刪除**（我沒有 `tagmanager.delete.containers` 這個 scope），詳見 `reports/sam-showcase/2026-09-23-ga-setup.md`
- [x] 修好後重跑，正確找到既有的 `sam-showcase.com`（`GTM-TXDXTHST`）容器，沒有再誤建；真實建立了一個原本缺少的 All Pages 觸發條件
- [ ] **卡住，需要使用者處理才能繼續**：GA4 Property 建立需要 `analytics.edit` OAuth scope（目前只申請唯讀），sam-showcase 還沒有專屬的 GA4 Property/Measurement ID，`ga-setup` 的 GA4 標籤設定這步驟因此還沒真的跑過
- [ ] **卡住，需要 `/add-dir`**：把安裝片段實際寫進 `MyShowCase` 程式碼、走 diff review、合併——這一步完全還沒開始，等使用者開放存取權限

## 階段六：收尾驗收

- [x] 逐項核對 `phase1.md` 第 12 節「驗收標準」——8 項中 5 項打勾，3 項明確標記未測試/部分完成並寫清楚原因（`claude-in-chrome`：目前專案沒有需要登入態的畫面可測；跨專案比較：只有一個已註冊專案；`install-gtm`：卡在 GA4 Property 與 `/add-dir`）
- [ ] 跑一次跨專案比較的問題——**無法驗證**，`projects.json` 目前只有 `sam-showcase` 一筆，等使用者註冊第二個專案後再測
- [x] 回頭檢視 `phase1.md` 第 13 節「待確認事項」——已更新，3 項解決、2 項新增（OAuth scope 擴大與否、誤建容器待手動刪除）

---

## 目前狀態（2026-09-23）

**階段零～四已完成並驗證，階段五部分完成（卡在需要使用者處理的兩件事），階段六已完成能做的部分。**

### 需要你處理才能繼續的事（按重要性排序）

1. **手動刪除誤建的重複 GTM 容器**——GTM 後台、帳號 `Sam`、容器 `sam-showcase`（`GTM-WTSBTSFR`）→ Admin → Delete Container。詳見 `reports/sam-showcase/2026-09-23-ga-setup.md`
2. **決定 GA4 Property 怎麼建**：手動在 GA4 後台建一個屬於 sam-showcase 的 Property + Web Data Stream（把 Measurement ID 填進 `projects.json` 的 `measurementId`），或授權重新走一次加了 `analytics.edit` 的 OAuth 授權讓我直接建
3. 上述兩件都處理完後，可以繼續：重跑 `node scripts/install-gtm/index.mjs sam-showcase` 完成 GA4 標籤設定 → 用 `/add-dir` 開放 `D:\Sam_git\MyShowCase` → 把安裝片段寫進程式碼、走 diff review

### 這次順便做的、不在原始清單裡的事

- `scripts/discover-google-properties.mjs`：探索真實 Google 帳號資料，避免每次都要使用者自己去後台找 ID
- 過程中發現並更正一個分析錯誤（GA4 查錯 Property）、修好一個真的會影響使用者真實 Google 帳號的 bug（誤建重複 GTM 容器）——兩者都詳細記錄在對應的 `reports/` 檔案跟各自 Skill 的 SKILL.md「重要教訓」段落裡，之後接手的人（包含未來的我）不用重踩一次

## 階段七：`code-review` + `security-review` 全面體檢（2026-09-29）

用 `security-review` skill 查資安風險，用 `code-review` skill（high 力度）查錯誤/未使用程式碼，兩邊都走完整流程（含假陽性過濾）才回報。

### 資安審查結論：0 個正式發現

`scripts/setup-oauth/index.mjs` 的本機 OAuth callback server 被抓到兩個技術上真實的觀察（沒有 CSRF `state` 參數、`server.listen(port)` 沒指定 host 會監聽所有網路介面），但送進假陽性過濾後只有 **3/10**，判定假陽性——在「個人自用、只跑一次、幾分鐘視窗」這個真實威脅模型下，攻擊者要同時滿足好幾個不切實際的前提，且就算成功最多只是把設定搞壞（拿到攻擊者自己帳號的 token），不會外洩使用者真實資料。這個等級的保護值得之後順手補（加 `state` 參數、`server.listen(port, "127.0.0.1")` 限定本機），但不構成正式漏洞。

### Code Review：10 個發現，6 個已修，1 個補文件，1 個誤報，2 個列入下方教訓

- [x] **`gtm.mjs` 的 `getContainerById()` 吞掉所有錯誤當成「查無容器」**——網路失敗、token 過期、沒權限都會被誤判成「不存在」，重演跟先前重複建立容器同一類風險。已修：只有真的 404 才回傳 `null`，其他錯誤往上丟
- [x] **`--live-url=`／`--gtm-account=` 參數解析用 `split("=")[1]`，網址帶 query string 會被截斷**——已修：新增共用的 `scripts/lib/cli-args.mjs`（`parseFlag`），只在第一個 `=` 切一刀，兩處呼叫點都改用它
- [x] **`discover-google-properties.mjs` 吞掉錯誤又沒有正確結束碼**——已修：改用共用的 `getOAuthClient()`（順便補回 CLIENT_ID/SECRET 檢查），任一查詢失敗會 `exit(1)`，不再誤報成功
- [x] **品牌色寫死在 `compose-screenshot-deck.mjs` 常數裡，沒讀 `projects.json` 的 `brandKit.colors`**——已修：改讀 `project.brandKit.colors`，沒設定時才退回預設值並印警告；`sam-showcase` 的真實取樣值已經寫回 `projects.json`
- [x] **`render/` 兩支腳本的 `projectName` 沒有驗證就直接拿去建資料夾**——已修：都改呼叫 `loadProject()`，打錯字直接失敗，不會靜默建出孤兒資料夾（已用打錯字的名稱實測確認會正確擋下）
- [x] **範本寫死比對 sam-showcase 自己的文案，套用到別的專案會直接逾時失敗**——已修：新增 `projects.json` 的 `capture.sectionHeadingText`／`capture.heroText` 欄位，`capture/playwright.config.ts` 改用 `CAPTURE_PROJECT_NAME` 環境變數讀專案設定（順便統一掉原本 `CAPTURE_BASE_URL` 這個環境變數，baseURL 直接從 projects.json 帶出來），兩個 flow 檔案都改讀這兩個欄位
  - **中途踩的坑**：`playwright.config.ts` 一開始想直接 import 共用的 `scripts/lib/projects.mjs`，結果噴 `Cannot use 'import.meta' outside a module`——Playwright 讀 config 檔的轉譯方式跟純 Node ESM 不一樣，不支援被 import 進來的檔案用 `import.meta.url`。改成在 `playwright.config.ts` 裡用 `__dirname`（CJS 情境下保證支援）直接讀 `projects.json`，不透過共用模組，寧可邏輯重複一點點也不要在設定檔層級冒這個風險
- [x] **擷取的原始檔案（截圖/錄影）沒有分專案存放**——已修：`capture/output/` 底下改成 `capture/output/<專案名稱>/`，`render/` 兩支腳本對應改讀新路徑；舊檔案已手動搬移過去驗證相容
- [ ] **`capture/package.json` 自己一套獨立依賴安裝，看起來跟 CLAUDE.md 的「依賴統一裝根目錄」矛盾**——這其實是刻意的（Playwright 官方腳手架本來就會這樣），只是沒寫進文件說明。已補上：`CLAUDE.md`、`phase1.md` 都加了明確的例外說明
- 已排除（誤報）：`doctor-checks.mjs` 用 `path.resolve()` 被懷疑該用 repo root 而非 cwd——`projects.json` 的 `path` 欄位本來就規定是絕對路徑，`path.resolve()` 對已經是絕對路徑的字串是no-op，不受 cwd 影響，不是真問題
- 列入 SKILL.md／未來加強清單但這次沒動（風險低、多為重複程式碼的收斂機會）：OAuth client 建構在多個檔案重複、`projects.json` 讀寫邏輯在 `doctor`/`install-gtm` 各自重複、`isSet`/`isPlaceholder` 判斷式重複定義約 6 次、`REPO_ROOT` 解析樣板重複 4 處、OAuth client 沒有 process 層級快取（每次呼叫都重新走一次驗證）、幾處可以平行的 `await` 目前是循序執行、`fs.writeFileSync` 的 `{mode: 0o600}` 在 Windows 上是 no-op（開發機就是 Windows，這個防護目前沒有實際作用）

### 全部修復後的驗證

- `render/compose-screenshot-deck.mjs sam-showcase`：重新產出，視覺結果與修復前一致（品牌色正確從 `projects.json` 讀出，不是巧合沿用同一組常數）
- `render/compose-screenshot-deck.mjs sam-showcae`（刻意打錯字）：正確以 exit code 1 失敗，沒有建立孤兒資料夾
- `node scripts/install-gtm/index.mjs sam-showcase`：`getContainerById` 修復後仍正確用 ID 找到既有容器，沒有回歸成重複建立
- `node scripts/doctor/index.mjs`：全部項目維持正常（唯一 `[FIX]` 是 dev server 目前沒啟動，跟這輪修復無關）
