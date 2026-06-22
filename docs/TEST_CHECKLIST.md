# 一鍵超人｜正式連外前測試清單

正式對外公開前，先照這份流程測。

## 1. 後台健康檢查

開啟：

```text
/api/health
```

應該看到：

```json
{"ok":true}
```

## 2. 完整自我檢查

開啟：

```text
/api/self-test
```

確認：

- `runtime.ok = true`
- `market.latest.twse.ok = true`
- `market.latest.tpex.ok = true`

## 3. 策略輸出檢查

開啟：

```text
/api/analyze?scope=all&heatBy=money&topHeat=30&maxResults=6
```

確認：

- `ok = true`
- `stats.rawCount > 100`
- `stats.hotCount > 0`
- `final` 是陣列
- 每檔都有：
  - `entryZone` 進場區
  - `stopZone` 停損區
  - `conditions` 條件燈號
  - `advice` 建議

## 4. 內部測試頁

開啟：

```text
/internal-test.html
```

依序按：

1. 🔌 測試後台
2. ✅ 自我檢查
3. 🚀 產生清單

三個都正常後，再把正式首頁連到外部網址。

## 5. 模式判斷

目前穩定測試版是：

```text
latest-only-stable-test
```

代表它先用最新公開日線穩定跑完整流程。

等流程完全穩定後，再接 FinMind 歷史日線，升級為：

```text
full-with-finmind-history
```

## 6. 不該出現的情況

如果出現以下狀況，先不要公開：

- `/api/health` 失敗
- `/api/self-test` 有任一步驟失敗
- `/api/analyze` 無法回傳 JSON
- 產生清單沒有進場區或停損區
- 手機畫面按鈕沒有反應

## 7. 安全提醒

不要把真實 API Token 寫進：

- `index.html`
- GitHub commit
- README

需要 Token 時，放在 Vercel Environment Variables。
