// PageSpeed Insights API 查詢——API key 認證，不用 OAuth。回傳乾淨的結構化數據。

import { google } from "googleapis";
import { getPageSpeedApiKey } from "./google-auth.mjs";

export async function getPageSpeedReport(url, { strategy = "mobile" } = {}) {
  const key = getPageSpeedApiKey();
  const pagespeed = google.pagespeedonline("v5");

  const res = await pagespeed.pagespeedapi.runpagespeed({
    url,
    key,
    strategy,
    category: ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"],
  });

  const categories = res.data.lighthouseResult?.categories || {};
  const audits = res.data.lighthouseResult?.audits || {};

  const coreWebVitals = {
    lcp: audits["largest-contentful-paint"]?.displayValue,
    cls: audits["cumulative-layout-shift"]?.displayValue,
    tbt: audits["total-blocking-time"]?.displayValue,
    fcp: audits["first-contentful-paint"]?.displayValue,
  };

  const scores = Object.fromEntries(
    Object.entries(categories).map(([key, val]) => [key, Math.round((val.score ?? 0) * 100)])
  );

  return { url, strategy, scores, coreWebVitals };
}
