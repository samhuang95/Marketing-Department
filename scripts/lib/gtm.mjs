// Google Tag Manager API 操作：確認/建立容器、設定 GA4 Configuration 標籤、發布版本。
// 都是純 API 呼叫，不碰目標專案的檔案——真的要把 GTM 容器嵌入網站，
// 是另一個步驟（見 install-gtm 腳本產生的 snippet + 需要 /add-dir 才能寫入目標專案程式碼）。

import { google } from "googleapis";
import { getOAuthClient } from "./google-auth.mjs";

function tagmanagerClient() {
  return google.tagmanager({ version: "v2", auth: getOAuthClient() });
}

export async function findContainerByName(accountId, containerName) {
  const tagmanager = tagmanagerClient();
  const res = await tagmanager.accounts.containers.list({ parent: `accounts/${accountId}` });
  return (res.data.container || []).find((c) => c.name === containerName) || null;
}

// 用 ID 直接查（projects.json 已經記過 ID 的情況要走這條，不要再用名稱模糊比對——
// 名稱比對曾經因為 projects.json 的 name 跟使用者手動在 GTM 後台取的容器名稱不一致，
// 誤判成「容器不存在」而重複建立，見 specs/task1.md 階段五的教訓記錄）
export async function getContainerById(accountId, containerId) {
  const tagmanager = tagmanagerClient();
  try {
    const res = await tagmanager.accounts.containers.get({ path: `accounts/${accountId}/containers/${containerId}` });
    return res.data;
  } catch (err) {
    // 只有「真的查無此容器」（404）才當作「不存在」處理——其他錯誤（網路失敗、
    // token 過期、沒權限）都要往上丟，不能被吞掉當成「不存在」，不然會重演
    // 之前誤判不存在、重複建立容器的那個 bug（見上方註解），只是換一種錯誤觸發
    const status = err?.code ?? err?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function createContainer(accountId, containerName) {
  const tagmanager = tagmanagerClient();
  const res = await tagmanager.accounts.containers.create({
    parent: `accounts/${accountId}`,
    requestBody: { name: containerName, usageContext: ["WEB"] },
  });
  return res.data;
}

export async function getDefaultWorkspacePath(accountId, containerId) {
  const tagmanager = tagmanagerClient();
  const res = await tagmanager.accounts.containers.workspaces.list({
    parent: `accounts/${accountId}/containers/${containerId}`,
  });
  const workspaces = res.data.workspace || [];
  return (workspaces.find((w) => w.name === "Default Workspace") || workspaces[0])?.path;
}

// 確保有一個「All Pages」觸發條件可用——實測發現透過 API 建立的容器不會像 GTM 後台
// 介面那樣自動內建這個觸發條件（查詢回傳完全空的 trigger 清單），要自己檢查、沒有就建一個。
export async function ensureAllPagesTrigger(workspacePath) {
  const tagmanager = tagmanagerClient();
  const res = await tagmanager.accounts.containers.workspaces.triggers.list({ parent: workspacePath });
  const found = (res.data.trigger || []).find((t) => t.type === "pageview" && t.name === "All Pages");
  if (found) return { trigger: found, action: "existing" };

  const created = await tagmanager.accounts.containers.workspaces.triggers.create({
    parent: workspacePath,
    requestBody: { name: "All Pages", type: "pageview" },
  });
  return { trigger: created.data, action: "created" };
}

// 建立（或更新既有同名）GA4 Configuration 標籤，觸發條件掛在 All Pages
export async function upsertGA4ConfigTag(workspacePath, measurementId, tagName = "GA4 Configuration") {
  const tagmanager = tagmanagerClient();
  const { trigger: allPages } = await ensureAllPagesTrigger(workspacePath);

  const existing = await tagmanager.accounts.containers.workspaces.tags.list({ parent: workspacePath });
  const found = (existing.data.tag || []).find((t) => t.name === tagName);

  const tagBody = {
    name: tagName,
    type: "gaawc", // GA4 Configuration tag 的官方 type 代碼
    parameter: [{ type: "template", key: "measurementId", value: measurementId }],
    firingTriggerId: [allPages.triggerId],
  };

  if (found) {
    const res = await tagmanager.accounts.containers.workspaces.tags.update({
      path: found.path,
      requestBody: { ...tagBody, tagId: found.tagId, fingerprint: found.fingerprint },
    });
    return { tag: res.data, action: "updated" };
  }

  const res = await tagmanager.accounts.containers.workspaces.tags.create({ parent: workspacePath, requestBody: tagBody });
  return { tag: res.data, action: "created" };
}

export async function publishWorkspace(workspacePath, versionName) {
  const tagmanager = tagmanagerClient();
  const version = await tagmanager.accounts.containers.workspaces.create_version({
    path: workspacePath,
    requestBody: { name: versionName },
  });
  const containerVersion = version.data.containerVersion;
  await tagmanager.accounts.containers.versions.publish({ path: containerVersion.path });
  return containerVersion;
}

// 標準官方 GTM 安裝片段（<head> 頂部 + <body> 開始後），照 Google 官方文件的固定格式產生，
// 不是憑印象拼湊。
export function getInstallSnippet(publicId) {
  return {
    head: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${publicId}');</script>
<!-- End Google Tag Manager -->`,
    bodyStart: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${publicId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
  };
}
