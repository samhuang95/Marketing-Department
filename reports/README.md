# Reports

跨專案的分析摘要與渲染歷史，見 `specs/phase1.md` 第 6、7 節。每個目標專案一個子資料夾：

```
reports/
  <專案名稱>/
    <日期>-analysis.md      <- analytics skill 產出的分析摘要
    <日期>-render-NNN.md     <- marketing-video skill 產出的渲染紀錄
```

這裡的內容用 git 版控，方便之後跨專案比較與回溯歷史決策。格式（Markdown vs. 是否併用 SQLite）待 `specs/phase1.md` 第 13 節第 4 點定案。
