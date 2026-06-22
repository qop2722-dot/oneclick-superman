# 一鍵超人｜後台 API 版

手機外部瀏覽器可開啟的台股觀察清單網頁。

這版已改成 **Vercel 後台 API 架構**，不是單純 GitHub Pages 靜態版。

## 為什麼 GitHub Pages 不能用？

GitHub Pages 只能放靜態網頁，不能執行 `/api/market/latest` 這種後台 API。

所以要讓「產生清單」穩定可用，請部署到 Vercel。

## 部署到 Vercel

1. 打開 https://vercel.com/new
2. 選擇 GitHub repo：`qop2722-dot/oneclick-superman`
3. Framework Preset 選 **Other**
4. Build Command 留空
5. Output Directory 留空
6. 按 **Deploy**

部署完成後，Vercel 會給你一個網址，例如：

```text
https://oneclick-superman.vercel.app
```

打開後按：

```text
🔌 測試後台
🚀 產生清單
```

## 已包含的 API

```text
/api/health
/api/market/latest?scope=all
/api/market/latest?scope=twse
/api/market/latest?scope=tpex
/api/market/history?scope=all
/api/finmind?dataset=TaiwanStockInfo
```

## 環境變數

公開日線資料不需要 API Key。

如果之後要啟用 FinMind proxy，請在 Vercel Project Settings → Environment Variables 加：

```text
FINMIND_TOKEN=你的FinMindToken
FUGLE_API_KEY=你的FugleAPIKey
```

不要把真實 Token 寫進 `index.html` 或 commit 到 GitHub。

## 注意

這是觀察清單工具，不是自動下單，也不是保證獲利。進場區是等待位置，停損區是看錯離開的位置。
