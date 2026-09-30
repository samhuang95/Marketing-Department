<p align="center">
  <img src="specs/CIS/Logo.png" alt="BrandCopilot" width="420">
</p>

# BrandCopilot

一套**自用**的行銷工具，透過 Claude Code 操作——不用切換到別的專案資料夾，跟它說「幫某個網站做一支介紹影片」或「看看這個月的數據表現」，它就會直接處理：

- 🎬 **影片/圖片**：真的截取/錄製目標網站的真實畫面（Playwright），合成排版成截圖組或短影片，成品集中放在這個專案的 `output/` 底下
- 📊 **數據分析**：整合 GA4、Google Search Console、PageSpeed Insights 三個真實數據來源，由 Claude 直接判讀給出具體建議，寫成報告存在 `reports/` 底下，方便之後回顧比對
- 🏷️ **GA/GTM 追蹤設定**：幫目標網站建立/管理 Google Tag Manager 容器與標籤，安裝到程式碼前一定先讓你看過 diff 再合併

沒有後端伺服器、沒有資料庫、沒有另外的網頁介面——執行環境就是 Claude Code 本身，完整架構規劃見 [`specs/phase1.md`](specs/phase1.md)。

---

## 怎麼使用

### 1. 註冊一個要管理的專案

打開 `projects.json`（第一次用要先複製 [`projects.example.json`](projects.example.json) 成 `projects.json`），加一筆記錄：

```json
{
  "projects": [
    {
      "name": "sam-showcase",
      "path": "D:\\Sam_git\\MyShowCase",
      "devServerUrl": "http://localhost:5173/",
      "liveUrl": "https://sam-showcase.com"
    }
  ]
}
```

`name`、`path`、`devServerUrl` 是最基本要填的；GA4/Search Console/GTM 相關欄位可以先留空，之後對應功能會告訴你需要補什麼。不確定某些 ID 要填什麼，可以跑：

```
node scripts/discover-google-properties.mjs
```

會列出你目前 Google 帳號底下真實可存取的 GA4 Property、Search Console 已驗證網站、GTM 帳號/容器，比對後填進去即可，不用自己去後台一個個找。

### 2. 確認環境沒問題

```
node scripts/doctor/index.mjs
```

會檢查 `.env` 憑證、每個已註冊專案的路徑/欄位/dev server 連線狀態，`[FIX]` 的項目會附上具體修法。

### 3. 開始使用

在這個專案（`Marketing-Department`）目錄下開 Claude Code，直接用自然語言，或用對應指令：

| 想做的事 | 指令 |
|---|---|
| 規劃並產生一支行銷影片/一組截圖 | `/marketing:plan-video` |
| 讀取 GA4/Search Console/PageSpeed 數據給建議 | `/marketing:ga-report` |
| 幫網站安裝/管理 Google Tag Manager 追蹤 | `/marketing:install-gtm` |
| 檢查整體環境狀態 | `/doctor` |

**成果放在哪裡**：影片/截圖在 `output/<專案名稱>/`；數據分析報告、渲染紀錄在 `reports/<專案名稱>/`——都集中在這個 repo，不會散落到你其他專案裡（`ga-setup` 安裝追蹤碼那步是唯一例外，它會直接編輯目標專案自己的程式碼，執行前會需要你用 `/add-dir` 開放存取權限，而且一定會先給你看過 diff 才合併）。

想看目前這套工具實際跑過的完整記錄（包含踩過的坑跟教訓），可以參考 [`specs/task1.md`](specs/task1.md) 和 `reports/` 底下的既有報告。

---

<details>
<summary><strong>快速啟動（第一次設定，只需要做一次）</strong></summary>

### 0. 環境需求

**Node.js >= 22**——由 `googleapis` 官方套件的最低要求決定（這是所有依賴裡門檻最高的一個；`capture/` 底下的 Playwright 專案本身只需要 Node >= 20，但既然是同一個環境，統一裝 22 以上最簡單）。已經寫進各自的 `package.json`（`engines` 欄位），版本不夠時 `npm install` 會警告。

### 1. 安裝依賴

```
npm install
```

（`capture/` 底下是獨立的 Playwright 專案，第一次使用影片/圖片功能前要另外 `cd capture && npm install`）

### 2. 建立 Google Cloud 專案

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立一個專案
2. 啟用這 5 個 API：Analytics Data API、Search Console API、Tag Manager API、Analytics Admin API、PageSpeed Insights API
3. 建立 OAuth Client（類型選「網頁應用程式」），「已授權的重新導向 URI」填 `http://localhost:53682`（逐字，不能多結尾斜線）
4. 確認 OAuth 同意畫面的「測試使用者」有加入你自己的 Google 帳號（新建立的 OAuth Client 預設是 Testing 狀態）
5. 另外建一組 PageSpeed Insights API Key

### 3. 設定憑證

複製 [`.env.example`](.env.example) 成 `.env`（同一個資料夾，這個專案根目錄）。`.env` 已加進 `.gitignore`，不會被 commit——這是所有專案共用的唯一一份憑證檔，放在這裡而不是使用者主目錄是刻意的決策（理由見 [`specs/phase1.md`](specs/phase1.md) 第 11 節）。

四個欄位分別是：

| 欄位 | 來源 | 說明 |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | 上一步建立的 OAuth Client | 在 Google Cloud Console →「憑證」頁面可以找到 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 同上 | 跟 Client ID 顯示在同一個地方，注意保密 |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | **不用手動填** | 留空即可，下一步跑 `scripts/setup-oauth` 完成授權後會自動寫入這一行 |
| `PAGESPEED_API_KEY` | 上一步建立的 API Key | 只有這組是 API Key 認證，不需要走 OAuth，比其他三個簡單很多 |

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=
PAGESPEED_API_KEY=
```

`.env` 已加進 `.gitignore`，不會被 commit。

### 4. 完成 OAuth 授權

```
cd scripts/setup-oauth
npm start
```

會印出一個網址，用瀏覽器打開、登入你的 Google 帳號完成授權，完成後會自動把 `GOOGLE_OAUTH_REFRESH_TOKEN` 寫回 `.env`。

### 5. 確認一切正常

```
node scripts/doctor/index.mjs
```

全部顯示 `[OK]` 就代表設定完成，可以開始照上面「怎麼使用」的步驟操作了。

</details>
