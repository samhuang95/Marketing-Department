#!/usr/bin/env node
// 一次性探索工具：用已經完成的 OAuth 憑證，列出使用者真實可存取的
// GA4 Property、Search Console 已驗證網站、GTM 帳號/容器，方便比對填進 projects.json，
// 不用使用者自己去後台一個個找 ID。

import { google } from "googleapis";
import { getOAuthClient } from "./lib/google-auth.mjs";

const auth = getOAuthClient(); // 共用憑證載入邏輯，順便驗證 CLIENT_ID/SECRET/REFRESH_TOKEN 都有設定

async function listGA4() {
  console.log("=== GA4（Analytics Admin API）===");
  const admin = google.analyticsadmin({ version: "v1beta", auth });
  const res = await admin.accountSummaries.list();
  for (const account of res.data.accountSummaries || []) {
    console.log(`帳號：${account.displayName} (${account.account})`);
    for (const prop of account.propertySummaries || []) {
      console.log(`  Property：${prop.displayName}  ->  ${prop.property}`);
    }
  }
}

async function listSearchConsole() {
  console.log("\n=== Search Console（已驗證網站）===");
  const sc = google.searchconsole({ version: "v1", auth });
  const res = await sc.sites.list();
  for (const site of res.data.siteEntry || []) {
    console.log(`${site.siteUrl}（權限層級：${site.permissionLevel}）`);
  }
}

async function listGTM() {
  console.log("\n=== Google Tag Manager ===");
  const tagmanager = google.tagmanager({ version: "v2", auth });
  const accounts = await tagmanager.accounts.list();
  for (const account of accounts.data.account || []) {
    console.log(`帳號：${account.name}  (accountId: ${account.accountId})`);
    const containers = await tagmanager.accounts.containers.list({ parent: `accounts/${account.accountId}` });
    for (const c of containers.data.container || []) {
      console.log(`  容器：${c.name}  ->  publicId(GTM-ID): ${c.publicId}  (containerId: ${c.containerId})`);
    }
  }
}

async function main() {
  // 三個查詢個別 catch，讓其中一個失敗不會擋掉另外兩個——但錯誤要記下來，
  // 最後如果有任何一個失敗，整支腳本要用非 0 結束碼結束，不能讓呼叫端誤以為全部成功
  // （之前的版本會吞掉錯誤又用 exit code 0 結束，掩蓋憑證失效的情況）
  const tasks = [
    ["GA4", listGA4],
    ["Search Console", listSearchConsole],
    ["GTM", listGTM],
  ];

  let hadError = false;
  for (const [label, task] of tasks) {
    try {
      await task();
    } catch (err) {
      hadError = true;
      console.error(`${label} 查詢失敗：${err.message}`);
    }
  }

  if (hadError) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
