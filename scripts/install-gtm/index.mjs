#!/usr/bin/env node
// ga-setup 的主流程：
//   1. 確認/建立 GTM 容器
//   2. 確認/建立 All Pages 觸發條件
//   3. 如果 projects.json 有 measurementId，建立/更新 GA4 Configuration 標籤並發布版本
//   4. 印出官方標準安裝片段——實際寫進目標專案的程式碼，是另一個步驟
//      （需要 /add-dir 存取目標專案，這支腳本不做，也不應該做——見 SKILL.md）
//
// 用法：node scripts/install-gtm/index.mjs <專案名稱>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProject, loadAllProjects, REPO_ROOT } from "../lib/projects.mjs";
import { parseFlag } from "../lib/cli-args.mjs";
import {
  findContainerByName,
  getContainerById,
  createContainer,
  getDefaultWorkspacePath,
  ensureAllPagesTrigger,
  upsertGA4ConfigTag,
  publishWorkspace,
  getInstallSnippet,
} from "../lib/gtm.mjs";

const projectName = process.argv[2];
if (!projectName) {
  console.error("用法：node scripts/install-gtm/index.mjs <專案名稱>");
  process.exit(1);
}

const GTM_ACCOUNT_ID = parseFlag(process.argv, "gtm-account");

function saveProjectField(name, patch) {
  const registryPath = path.join(REPO_ROOT, "projects.json");
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = raw.projects.find((p) => p.name === name);
  Object.assign(project, patch);
  fs.writeFileSync(registryPath, JSON.stringify(raw, null, 2) + "\n");
}

async function main() {
  const project = loadProject(projectName);
  const accountId = GTM_ACCOUNT_ID || project.gtmAccountId;
  if (!accountId) {
    console.error("不知道要用哪個 GTM 帳號——projects.json 加 gtmAccountId，或帶 --gtm-account=<ID>");
    console.error("不確定帳號 ID 的話，跑 node scripts/discover-google-properties.mjs 查詢");
    process.exit(1);
  }

  // 優先信任 projects.json 已經記錄的 gtmContainerId（權威來源），只有在真的沒有記錄時
  // 才用名稱去找/建立——絕對不要在已經有 ID 的情況下，還用名稱模糊比對去猜容器存不存在
  let container = null;
  if (project.gtmContainerId) {
    container = await getContainerById(accountId, project.gtmContainerId);
    if (container) console.log(`[確認] 用已記錄的 ID 找到容器：${container.name} -> ${container.publicId}`);
    else console.log(`[警告] projects.json 記錄的 gtmContainerId（${project.gtmContainerId}）查不到，可能已被刪除或帳號不對`);
  }

  if (!container) {
    container = await findContainerByName(accountId, project.name);
    if (container) {
      console.log(`[找到] 依名稱 "${project.name}" 找到既有容器：${container.name} -> ${container.publicId}`);
      console.log(`       如果這不是你要的容器（例如實際容器名稱跟 project.name 不同），請手動把正確的 gtmContainerId 填進 projects.json 再重跑，不要讓這裡誤建新容器`);
    } else {
      container = await createContainer(accountId, project.name);
      console.log(`[建立] 新容器：${container.name} -> ${container.publicId}`);
    }
  }

  if (project.gtmContainerId !== container.containerId || project.gtmPublicId !== container.publicId) {
    saveProjectField(projectName, { gtmContainerId: container.containerId, gtmPublicId: container.publicId, gtmAccountId: accountId });
    console.log("[更新] projects.json 已寫入容器 ID");
  }

  const workspacePath = await getDefaultWorkspacePath(accountId, container.containerId);
  const { action: triggerAction } = await ensureAllPagesTrigger(workspacePath);
  console.log(`[${triggerAction === "created" ? "建立" : "確認"}] All Pages 觸發條件`);

  const isSet = (v) => Boolean(v) && v !== "REPLACE_ME";
  if (isSet(project.measurementId)) {
    const { action: tagAction } = await upsertGA4ConfigTag(workspacePath, project.measurementId);
    console.log(`[${tagAction === "created" ? "建立" : "更新"}] GA4 Configuration 標籤（${project.measurementId}）`);

    const version = await publishWorkspace(workspacePath, `GA4 setup for ${project.name}`);
    console.log(`[發布] 容器版本 ${version.containerVersionId}：${version.name}`);
  } else {
    console.log("\n[待處理] projects.json 沒有 measurementId，還沒建立 GA4 Configuration 標籤。");
    console.log("         需要先有一個屬於這個網站的 GA4 Property + Web Data Stream 才能拿到 Measurement ID");
    console.log("         （建立新 Property 需要 analytics.edit OAuth scope，目前的 OAuth 只有唯讀權限）。");
    console.log("         拿到 Measurement ID 後，填進 projects.json 的 measurementId 欄位，重跑這支腳本。");
  }

  const snippet = getInstallSnippet(container.publicId);
  console.log("\n=== 官方標準安裝片段（要手動或由有權限的 session 寫進目標專案）===");
  console.log("\n--- 貼在 <head> 最上面 ---\n" + snippet.head);
  console.log("\n--- 貼在 <body> 開始標籤之後 ---\n" + snippet.bodyStart);
  console.log(`\n[提醒] 這支腳本不會、也不應該自己去修改 ${project.path} 底下的檔案——`);
  console.log("       目標專案的程式碼寫入需要 /add-dir 開放存取範圍，並且要走 diff/PR review，不是自動改完就算。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
