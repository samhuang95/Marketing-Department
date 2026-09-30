#!/usr/bin/env node
// 整合 GA4 + Search Console + PageSpeed 三種數據來源，印出乾淨的 JSON。
// 這支腳本只負責「把數據撈乾淨」，不做任何分析判斷——分析與建議交給呼叫端的 Claude。
//
// 用法：node scripts/analytics-report/index.mjs <專案名稱> [--live-url=https://example.com]

import { loadProject } from "../lib/projects.mjs";
import { getGA4Report } from "../lib/ga4.mjs";
import { getSearchConsoleReport } from "../lib/search-console.mjs";
import { getPageSpeedReport } from "../lib/pagespeed.mjs";
import { parseFlag } from "../lib/cli-args.mjs";

const projectName = process.argv[2];
if (!projectName) {
  console.error("用法：node scripts/analytics-report/index.mjs <專案名稱> [--live-url=https://example.com]");
  process.exit(1);
}

const liveUrl = parseFlag(process.argv, "live-url") ?? null;

const isSet = (v) => Boolean(v) && v !== "REPLACE_ME";

async function main() {
  const project = loadProject(projectName);
  const result = { project: projectName, generatedAt: new Date().toISOString() };

  if (isSet(project.ga4PropertyId)) {
    try {
      result.ga4 = await getGA4Report(project.ga4PropertyId);
    } catch (err) {
      result.ga4Error = err.message;
    }
  } else {
    result.ga4Skipped = "ga4PropertyId 未設定";
  }

  if (isSet(project.searchConsoleSiteUrl)) {
    try {
      result.searchConsole = await getSearchConsoleReport(project.searchConsoleSiteUrl);
    } catch (err) {
      result.searchConsoleError = err.message;
    }
  } else {
    result.searchConsoleSkipped = "searchConsoleSiteUrl 未設定";
  }

  const pageSpeedTarget = liveUrl || (isSet(project.liveUrl) ? project.liveUrl : null);
  if (pageSpeedTarget) {
    try {
      result.pageSpeed = await getPageSpeedReport(pageSpeedTarget);
    } catch (err) {
      result.pageSpeedError = err.message;
    }
  } else {
    result.pageSpeedSkipped = "沒有可用的公開網址（PageSpeed 打不到 localhost，帶 --live-url= 或在 projects.json 設定 liveUrl）";
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
