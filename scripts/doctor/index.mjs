#!/usr/bin/env node
// 環境自檢：.env 憑證 + projects.json 裡每個專案的狀態（路徑、必填欄位、dev server 是否連得到）。
// 用法：
//   node index.mjs              — 檢查 projects.json 裡列出的所有專案
//   node index.mjs <專案名稱>    — 只檢查指定的這個專案
//
// 純檢查腳本，不需要 Claude 介入，也不會修改任何東西。
// 對應 specs/phase1.md 第 5 節情境四。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnv, checkProject, checkDevServerReachable } from "../lib/doctor-checks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "projects.json");

function loadTargets() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`找不到 ${REGISTRY_PATH}——先複製 projects.example.json 成 projects.json`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  const all = raw.projects || [];
  const nameArg = process.argv[2];
  if (!nameArg) return all;
  const found = all.filter((p) => p.name === nameArg);
  if (found.length === 0) {
    console.error(`projects.json 裡沒有名為 "${nameArg}" 的專案`);
    process.exit(1);
  }
  return found;
}

function line(ok, label) {
  console.log(`  [${ok ? "OK " : "FIX"}] ${label}`);
}

async function main() {
  let anyFail = false;

  console.log("=== 全域憑證（.env） ===");
  for (const c of await checkEnv(REPO_ROOT)) {
    if (!c.ok) anyFail = true;
    line(c.ok, `${c.key}：${c.message}`);
  }

  const targets = loadTargets();
  for (const project of targets) {
    console.log(`\n=== ${project.name}（${project.path}） ===`);
    for (const c of checkProject(project)) {
      if (!c.ok) anyFail = true;
      line(c.ok, c.message);
    }
    const reach = await checkDevServerReachable(project.devServerUrl);
    if (!reach.ok) anyFail = true;
    line(reach.ok, `dev server 連線：${reach.message}`);
  }

  console.log("\n（Playwright/FFmpeg 檢查留到 Stage 3 實際安裝依賴後再加入，見 specs/task1.md）");
  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
