// 一次性本機 OAuth consent flow，對應 specs/phase1.md 第 4 節「一次性初始設定」步驟 3。
// 用法：先在 Marketing-Department/.env 設定 GOOGLE_OAUTH_CLIENT_ID、GOOGLE_OAUTH_CLIENT_SECRET
// （來自 Google Cloud Console 建立的 OAuth Client），再跑 `npm start`。
//
// 這組憑證代表使用者這個 Google 帳號，所有專案共用同一份，跑一次就好。
// .env 放在這個 repo 的根目錄（不是使用者主目錄）——用相對於這支腳本自己檔案位置的路徑定位，
// 不寫死絕對路徑，repo 搬到別的路徑也不用改程式碼。

import { config as loadEnv } from "dotenv";
import { google } from "googleapis";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, URL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/setup-oauth/index.mjs -> repo 根目錄，往上兩層
const ENV_DIR = path.resolve(__dirname, "..", "..");
const ENV_PATH = path.join(ENV_DIR, ".env");
loadEnv({ path: ENV_PATH });

// GA4/Search Console 唯讀 + GTM 編輯/發布——對應 analytics 與 ga-setup 兩個 skill 的需求
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.publish",
];

// 必須跟 Google Cloud Console 的 OAuth Client「已授權的重新導向 URI」設定完全一致
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const isPlaceholder = (v) => !v || v === "REPLACE_ME";

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    console.error(`請先在 ${ENV_PATH} 設定：`);
    console.error("  GOOGLE_OAUTH_CLIENT_ID=...");
    console.error("  GOOGLE_OAUTH_CLIENT_SECRET=...");
    console.error("這兩組值來自 Google Cloud Console 建立的 OAuth Client（見 specs/phase1.md 第 4 節）。");
    console.error(`同時記得在該 OAuth Client 的「已授權的重新導向 URI」加上：${REDIRECT_URI}`);
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // 拿 refresh_token 必須設定
    prompt: "consent", // 強制每次都回傳 refresh_token，避免帳號已授權過就拿不到
    scope: SCOPES,
  });

  console.log("請在瀏覽器打開這個網址完成授權：\n");
  console.log(authUrl);
  console.log("\n授權完成後會自動導回本機，不用手動貼 code。等待中...\n");

  const code = await waitForAuthCode(PORT);
  const { tokens } = await oAuth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error("沒有拿到 refresh_token——通常是因為這個帳號之前已經授權過同一個 OAuth Client。");
    console.error("到 https://myaccount.google.com/permissions 撤銷這個 App 的存取權後，重新執行一次這支腳本。");
    process.exit(1);
  }

  writeEnvValue("GOOGLE_OAUTH_REFRESH_TOKEN", tokens.refresh_token);
  console.log(`已將 refresh token 寫入 ${ENV_PATH}`);
  console.log("接下來可以跑 `/doctor` 驗證這組憑證是否有效。");
}

const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 分鐘沒完成授權就放棄，不要無限卡住

function waitForAuthCode(port) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`等待授權逾時（${AUTH_TIMEOUT_MS / 1000} 秒）——確認瀏覽器有打開上面的網址並完成授權，或重新執行一次`));
    }, AUTH_TIMEOUT_MS);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.end(error ? "授權失敗，可以關掉這個分頁，回到終端機查看錯誤訊息。" : "授權完成，可以關掉這個分頁，回到終端機。");
      clearTimeout(timer);
      server.close();
      if (error) reject(new Error(`Google 回傳錯誤：${error}`));
      else if (code) resolve(code);
      else reject(new Error("沒有收到 authorization code"));
    });
    server.listen(port);
  });
}

function writeEnvValue(key, value) {
  fs.mkdirSync(ENV_DIR, { recursive: true });
  let lines = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n").filter((l) => l.trim().length > 0);
  }
  const newLine = `${key}=${value}`;
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (idx >= 0) lines[idx] = newLine;
  else lines.push(newLine);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n", { mode: 0o600 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
