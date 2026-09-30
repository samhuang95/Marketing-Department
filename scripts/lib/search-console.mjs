// Search Console API 查詢——回傳乾淨的結構化數據，不做分析判斷。

import { google } from "googleapis";
import { getOAuthClient } from "./google-auth.mjs";

export async function getSearchConsoleReport(siteUrl, { days = 28 } = {}) {
  const auth = getOAuthClient();
  const sc = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const dateParams = { startDate: fmt(startDate), endDate: fmt(endDate) };

  const [byQueryRes, totalsRes] = await Promise.all([
    sc.searchanalytics.query({ siteUrl, requestBody: { ...dateParams, dimensions: ["query"], rowLimit: 20 } }),
    // 不拆維度，拿到真正的站台總計——只加總 top 20 筆會漏掉排名之外的查詢字詞
    sc.searchanalytics.query({ siteUrl, requestBody: { ...dateParams } }),
  ]);

  const rows = (byQueryRes.data.rows || []).map((row) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
  const totalsRow = totalsRes.data.rows?.[0];

  return {
    dateRange: `${days} 天`,
    totals: {
      clicks: totalsRow?.clicks ?? 0,
      impressions: totalsRow?.impressions ?? 0,
      averagePosition: totalsRow?.position ?? null,
    },
    topQueries: rows,
  };
}
