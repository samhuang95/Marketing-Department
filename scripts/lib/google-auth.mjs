// 共用：建立一個已經帶好 refresh token 的 OAuth2Client，給 GA4/Search Console/Tag Manager
// 幾支查詢腳本共用，不要各自重複寫一份憑證載入邏輯。

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
loadEnv({ path: path.join(REPO_ROOT, ".env") });

export function getOAuthClient() {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error("OAuth 憑證未設定完整——跑 scripts/setup-oauth 完成授權");
  }
  const auth = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
  return auth;
}

export function getPageSpeedApiKey() {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key || key === "REPLACE_ME") {
    throw new Error("PAGESPEED_API_KEY 未設定");
  }
  return key;
}
