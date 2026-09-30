// 共用邏輯：環境自檢的各項檢查，回傳結果給 doctor 腳本印出來。

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { parse as parseEnv } from "dotenv";
import { google } from "googleapis";

export function checkProject(project) {
  const results = [];
  const projectPath = path.resolve(project.path);

  if (!fs.existsSync(projectPath)) {
    return [{ ok: false, message: `路徑不存在：${projectPath}` }];
  }
  results.push({ ok: true, message: `路徑存在：${projectPath}` });

  const isSet = (v) => Boolean(v) && v !== "REPLACE_ME";
  if (!isSet(project.devServerUrl)) {
    results.push({ ok: false, message: "devServerUrl 尚未設定（見 projects.json）" });
  } else {
    results.push({ ok: true, message: `devServerUrl：${project.devServerUrl}` });
  }

  return results;
}

// 實際打一次 dev server 網址，確認現在真的連得到（不是只檢查有沒有填網址）——
// 常見情境：devServerUrl 填對了，但忘記先把專案的 dev server 跑起來。
export function checkDevServerReachable(devServerUrl, timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!devServerUrl || devServerUrl === "REPLACE_ME") {
      resolve({ ok: false, message: "devServerUrl 未設定，略過連線檢查" });
      return;
    }
    let url;
    try {
      url = new URL(devServerUrl);
    } catch {
      resolve({ ok: false, message: `devServerUrl 不是合法網址：${devServerUrl}` });
      return;
    }
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      res.destroy();
      resolve({ ok: true, message: `連線成功（HTTP ${res.statusCode}）` });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, message: `逾時（${timeoutMs}ms）——dev server 可能沒啟動` });
    });
    req.on("error", (err) => {
      resolve({ ok: false, message: `連線失敗（${err.code || err.message}）——dev server 可能沒啟動` });
    });
  });
}

export async function checkEnv(repoRoot) {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return [{ key: ".env", ok: false, message: `${envPath} 不存在——複製 .env.example 並填入真實值` }];
  }

  const values = parseEnv(fs.readFileSync(envPath, "utf-8"));
  const isSet = (v) => Boolean(v) && v !== "REPLACE_ME";

  const results = [
    {
      key: "GOOGLE_OAUTH_CLIENT_ID",
      ok: isSet(values.GOOGLE_OAUTH_CLIENT_ID),
      message: isSet(values.GOOGLE_OAUTH_CLIENT_ID) ? "已設定" : "尚未設定",
    },
    {
      key: "GOOGLE_OAUTH_CLIENT_SECRET",
      ok: isSet(values.GOOGLE_OAUTH_CLIENT_SECRET),
      message: isSet(values.GOOGLE_OAUTH_CLIENT_SECRET) ? "已設定" : "尚未設定",
    },
    await checkRefreshToken(values),
    {
      key: "PAGESPEED_API_KEY",
      ok: isSet(values.PAGESPEED_API_KEY),
      message: isSet(values.PAGESPEED_API_KEY) ? "已設定" : "尚未設定",
    },
  ];

  return results;
}

// 不只檢查有沒有填值——實際用這組 refresh token 跟 Google 換一次 access token，
// 確認憑證真的還有效（沒過期、沒被撤銷、client_id/secret 沒填錯），不是表面上「看起來有填」就算過。
async function checkRefreshToken(values) {
  const key = "GOOGLE_OAUTH_REFRESH_TOKEN";
  const isSet = (v) => Boolean(v) && v !== "REPLACE_ME";

  if (!isSet(values.GOOGLE_OAUTH_REFRESH_TOKEN)) {
    return { key, ok: false, message: "尚未完成 OAuth 授權——跑 scripts/setup-oauth（npm start）" };
  }
  if (!isSet(values.GOOGLE_OAUTH_CLIENT_ID) || !isSet(values.GOOGLE_OAUTH_CLIENT_SECRET)) {
    return { key, ok: false, message: "已設定，但 CLIENT_ID/CLIENT_SECRET 缺一個，無法驗證" };
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(values.GOOGLE_OAUTH_CLIENT_ID, values.GOOGLE_OAUTH_CLIENT_SECRET);
    oAuth2Client.setCredentials({ refresh_token: values.GOOGLE_OAUTH_REFRESH_TOKEN });
    await oAuth2Client.getAccessToken(); // 真的打一次 Google token endpoint 換 access token
    return { key, ok: true, message: "已設定，且試打 API 確認有效" };
  } catch (err) {
    return {
      key,
      ok: false,
      message: `已設定但驗證失敗（${err.message}）——可能已過期或被撤銷，重跑 scripts/setup-oauth`,
    };
  }
}
