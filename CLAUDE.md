# CLAUDE.md — AI 開發指南

本文件為 AI 助手（如 Claude Code）提供此專案的架構說明、設計決策與開發慣例，協助快速理解程式碼庫並避免常見錯誤。

## 專案概述

LINE AI 客服系統：接收 LINE 訊息 → 依用戶分組 → AI 分析情緒與關鍵字 → 建議回覆 → 客服人員選擇發送。

**部署方式**：npm workspaces 單一 Railway 服務。Express 後端同時 serve React 前端靜態檔案。

## 架構關鍵決策

### 1. 對話分組（非逐訊息）
訊息仍以單筆儲存（`Message` collection），但 `GET /api/conversations` 使用 MongoDB aggregation `$group` 按 `lineUserId` 分組，回傳的是「對話」物件，包含 `pendingMessages[]`。

**重要**：前端的「選取對象」是 `lineUserId`（字串），不是 Message `_id`。

### 2. SSE 而非 WebSocket
選擇 SSE 的原因：僅需伺服器→客戶端單向推播，無額外 npm 依賴，瀏覽器 EventSource 自動重連。

SSE 客戶端管理在 `backend/src/services/sseService.js`，`res` 物件直接存入 `Set`。

### 3. 關鍵字語意匹配（非字串比對）
所有啟用中的關鍵字在 webhook 處理時傳入 GPT-4o system prompt，由 AI 判斷是否語意命中，而非程式層字串比對。

### 4. 自動回覆防抖
`autoReplyService.js` 維護 `Map<lineUserId, timeoutId>`。每則新訊息會重置計時器，確保用戶分段傳完所有訊息後才觸發 AI 回覆。計時器存在記憶體中，重啟會遺失（可接受的取捨）。

### 5. 合併訊息分隔符
多則 pending 訊息合併給 AI 時，使用 `\n---\n` 分隔（**不要**用 `[訊息1]`/`[訊息2]` 格式，GPT 會將標記複製進回覆）。

## 資料流

```
LINE webhook → analyzeMessage() → 儲存 Message → SSE broadcast
                    ↓
            keywordMatch？→ 立即 pushMessage（不進待回覆）
                    ↓
            urgency 欄位儲存至 Message

前端 SSE 收到 new-message → refetch conversations
用戶選取對話 → fetchSuggest() → generateReplies()
客服點發送 → POST /reply → pushMessage + updateMany(pending→replied)
```

## 檔案職責速查

| 檔案 | 職責 |
|------|------|
| `backend/src/routes/webhook.js` | LINE webhook 入口，協調 analyzeMessage、autoReplyService、sseService |
| `backend/src/routes/admin.js` | 所有後台 API，含 SSE endpoint、conversations aggregation、標籤 CRUD |
| `backend/src/services/openaiService.js` | `analyzeMessage()`（webhook 用）和 `generateReplies()`（suggest 用）兩個 export |
| `backend/src/services/sseService.js` | `addClient`, `removeClient`, `broadcast` |
| `backend/src/services/autoReplyService.js` | `schedule(lineUserId, delaySeconds)`, `cancel(lineUserId)` |
| `frontend/src/App.jsx` | 全域狀態、SSE 連線、fetchLabels、mobile 響應式邏輯 |
| `frontend/src/components/SettingsModal.jsx` | 4 分頁：商家知識庫 / 關鍵字 / 自動回覆 / 標籤管理 |

## OpenAI 函式說明

### `analyzeMessage(userMessage, businessProfile, keywords)`
- **用途**：webhook 收到訊息時呼叫
- **回傳**：`{ replies: string[], urgency: 'normal'|'urgent'|'angry', keywordMatch: { trigger, reply } | null }`
- **system prompt 包含**：商家知識庫、啟用中的關鍵字列表、情緒分析指令、JSON 格式要求

### `generateReplies(userMessage, businessProfile)`
- **用途**：客服人員點選「取得建議」時呼叫（`POST /api/conversations/:id/suggest`）
- **回傳**：`string[]`（3 則建議）
- **注意**：system prompt 明確告知「[訊息N] 是系統標記，回覆中不要出現」

## MongoDB Aggregation 注意事項

`GET /api/conversations` 的 aggregation pipeline 重點：

1. 用 `$group` 收集 `allMessages`（含所有狀態）
2. 用 `$addFields` + `$filter` 從 `allMessages` 篩出 `pendingMessages`（不能在 `$push` 裡直接用 `$$REMOVE`）
3. `urgency` 計算：pending 訊息中有任一 `angry` → angry；有任一 `urgent` → urgent；否則 normal
4. `sortOrder`：`pending=0, processing=1, failed=2, replied=3`，確保待回覆排最前

## 路由順序陷阱

`admin.js` 中：
```js
// 必須先定義靜態路由，再定義動態參數路由
router.get('/customers/labels', ...)       // ← 先
router.get('/customers/:lineUserId/history', ...) // ← 後
```
若順序相反，`/customers/labels` 會被 `:lineUserId` 攔截。

## 前端狀態架構

`App.jsx` 主要狀態：
```js
conversations[]       // 對話列表（from /api/conversations）
selectedId            // 目前選取的 lineUserId
suggestedReplies[]    // AI 建議（from /api/conversations/:id/suggest）
labels[]              // 所有標籤定義
customerLabels{}      // { lineUserId: Label[] } 對應表
mobileView            // 'list' | 'chat'（手機版）
```

## 標籤系統架構

- `Label`：標籤定義（name, color），全域共用
- `CustomerLabel`：`{ lineUserId, labelIds[] }`，unique on lineUserId
- 刪除標籤時需執行 `CustomerLabel.updateMany({}, { $pull: { labelIds: id } })` 保持資料一致性
- `GET /api/customers/labels` 回傳 `{ [lineUserId]: [populatedLabel, ...] }` 供前端批次使用

## 開發慣例

- **新增 API 端點**：在 `admin.js` 新增，前端透過 Vite proxy `/api` 轉發
- **新增 Model**：在 `backend/src/models/` 建立，在用到的 route/service 中 `require`
- **環境變數**：只加在 `backend/.env`，前端不直接存取（透過 API）
- **不要修改**的檔案：`railway.toml`（部署設定）、`vite.config.js` proxy 設定（除非確實需要）

## 常見錯誤排查

| 問題 | 可能原因 |
|------|----------|
| SSE 不更新 | Railway Nginx 緩衝，確認 `X-Accel-Buffering: no` header 已加 |
| 自動回覆有 `[訊息N]` | 使用了舊版 `[訊息1]...[訊息2]` 格式，改為 `\n---\n` |
| 對話列表不排序 | aggregation 少了 `sortOrder` 計算欄位或 `$sort` stage |
| `/customers/labels` 404 | 路由順序問題，靜態路由需在動態路由之前定義 |
| Google Sheets 失敗 | `GOOGLE_PRIVATE_KEY` 的 `\n` 需為真正換行（JSON.parse 或直接貼） |

## 測試建議

1. **Webhook**：使用 LINE 官方 Webhook 測試工具或 ngrok 本地測試
2. **SSE**：開兩個瀏覽器分頁，一個模擬 webhook，確認另一個即時更新
3. **自動回覆**：設定短延遲（5s）測試，確認多則訊息只觸發一次回覆
4. **關鍵字**：測試語意相近但非完全相同的詞語是否被正確匹配
