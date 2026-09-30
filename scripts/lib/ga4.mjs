// GA4 Data API 查詢——回傳乾淨的結構化數據，不做任何分析判斷（分析交給呼叫端的 Claude）。

import { google } from "googleapis";
import { getOAuthClient } from "./google-auth.mjs";

export async function getGA4Report(propertyId, { days = 28 } = {}) {
  const auth = getOAuthClient();
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  // 分頁面明細
  const byPageRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "engagementRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    },
  });

  // 站台總計——activeUsers 是去重計數，不能用分頁明細加總（會重複計算跨頁使用者），
  // 要另外查一次沒有維度拆分的總計
  const totalsRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges,
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    },
  });
  const totalsRow = totalsRes.data.rows?.[0]?.metricValues;

  const byPage = (byPageRes.data.rows || []).map((row) => ({
    pagePath: row.dimensionValues[0].value,
    sessions: Number(row.metricValues[0].value),
    screenPageViews: Number(row.metricValues[1].value),
    engagementRate: Number(row.metricValues[2].value),
    averageSessionDuration: Number(row.metricValues[3].value),
  }));

  return {
    dateRange: `${days} 天`,
    totals: {
      activeUsers: totalsRow ? Number(totalsRow[0].value) : 0,
      sessions: totalsRow ? Number(totalsRow[1].value) : 0,
      screenPageViews: totalsRow ? Number(totalsRow[2].value) : 0,
    },
    byPage,
  };
}
