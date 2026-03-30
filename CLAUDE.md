# CLAUDE.md — AI 開發指南

本文件為 AI 助手（如 Claude Code）提供此專案的架構說明、設計決策與開發慣例，協助快速理解程式碼庫並避免常見錯誤。

## 專案概述

LINE AI 客服系統：接收 LINE 訊息 → 依用戶分組 → AI 分析情緒/意圖/關鍵字 → 建議回覆 → 客服人員選擇發送。支援商品卡片自動回覆、購買意圖偵測、主動傳訊、Google Sheet 紀錄。

**部署方式**：npm workspaces 單一 Railway 服務。Express 後端同時 serve React 前端靜態檔案。

## 架構關鍵決策

### 1. 對話分組（非逐訊息）
訊息仍以單筆儲存（`Message` collection），但 `GET /api/conversations` 使用 MongoDB aggregation `$group` 按 `lineUserId` 分組，並透過 `$lookup` 加入 `CustomerSetting`（per-user autoReplyEnabled）。

**重要**：前端的「選取對象」是 `lineUserId`（字串），不是 Message `_id`。

### 2. SSE 而非 WebSocket
選擇 SSE 的原因：僅需伺服器→客戶端單向推播，無額外 npm 依賴。

手機版問題：瀏覽器背景時 SSE 斷線。解法：監聽 `visibilitychange` 和 `online` 事件，回到前景時立即 refetch + 重建 EventSource（`es.readyState === EventSource.CLOSED` 時重連）。

SSE 客戶端管理在 `backend/src/services/sseService.js`，`res` 物件直接存入 `Set`。

### 3. 關鍵字語意匹配 + 商品卡片
關鍵字可設定 `replyType: 'text' | 'card'`：
- `text`：文字自動回覆
- `card`：發送 Flex Message 卡片（`cardIds[]` 多選）

多張卡片 → Carousel；單張 → Bubble。Flex Message 由 `lineService.buildFlexBubble(card)` 建構，支援 4 種顏色自訂（headerBgColor、titleColor、subtitleColor、buttonColor）。

### 4. 自動回覆防抖 + 個人開關
`autoReplyService.js` 維護 `Map<lineUserId, timeoutId>`，確保分段訊息只觸發一次回覆。

`webhook.js` 在 schedule 前會檢查 `CustomerSetting.autoReplyEnabled`（預設 true）。全域開啟 + 個人關閉 → 跳過自動回覆。

### 5. 合併訊息分隔符
多則 pending 訊息合併給 AI 時，使用 `\n---\n` 分隔（**不要**用 `[訊息1]`/`[訊息2]` 格式，GPT 會將標記複製進回覆）。

### 6. 購買意圖偵測
`analyzeMessage()` 回傳 `intent: 'none' | 'purchase'`，儲存至 Message。
- 對話列表：有 purchase intent 的待回覆對話顯示綠色左邊框 + 🛒 標記
- `generateReplies(text, bp, intent)` 第三參數為 `'purchase'` 時，系統提示切換為促成交易模式（引導下單/安心保證/簡潔促成）
- `/suggest` 回傳 `{ aiReplies, intent }` 讓前端決定 ReplyPicker 樣式

### 7. 主動傳訊
`POST /api/customers/push` 使用 LINE Push API 主動傳訊給已互動過的用戶。儲存為 `Message { isProactive: true, userMessage: '', selectedReply: text, status: 'replied' }`。歷史紀錄顯示紫色「客服主動傳送」樣式。

## 資料流

```
LINE webhook → analyzeMessage() → 儲存 Message → SSE broadcast
                    ↓
            keywordMatch？→ replyType=card → pushFlexCard(cards[])（Carousel/Bubble）
                         → replyType=text → pushMessage(text)
                    ↓（無關鍵字命中）
            intent/urgency 欄位儲存至 Message（status: pending）

前端 SSE / visibilitychange / online → refetch conversations
用戶選取對話 → fetchSuggest() → generateReplies(text, bp, intent)
客服點發送 → POST /reply → pushMessage + updateMany(pending→replied) → appendCustomerRow()

主動傳訊 → POST /customers/push → pushMessage → Message(isProactive:true)
```

## 檔案職責速查

| 檔案 | 職責 |
|------|------|
| `backend/src/routes/webhook.js` | LINE webhook 入口，協調 analyzeMessage、autoReplyService、sseService、CustomerSetting 檢查 |
| `backend/src/routes/admin.js` | 所有後台 API：conversations aggregation、cards CRUD、push、autoreply toggle、labels CRUD |
| `backend/src/services/openaiService.js` | `analyzeMessage()`（回傳 urgency+intent+keywordMatch）、`generateReplies(text, bp, intent)` |
| `backend/src/services/lineService.js` | `pushMessage`、`buildFlexBubble(card)`、`pushFlexCard(lineUserId, cards[])` |
| `backend/src/services/sseService.js` | `addClient`, `removeClient`, `broadcast` |
| `backend/src/services/autoReplyService.js` | `schedule(lineUserId, delaySeconds)`, `cancel(lineUserId)` |
| `backend/src/services/sheetService.js` | `appendCustomerRow(msg)`：依客戶分組插入，新客戶 append，舊客戶 insert after last row |
| `frontend/src/App.jsx` | 全域狀態、SSE 連線（含 visibilitychange/online 重連）、mobile 響應式邏輯 |
| `frontend/src/components/SettingsModal.jsx` | 5 分頁：商家知識庫 / 關鍵字 / 自動回覆 / 標籤管理 / 商品卡片 |
| `frontend/src/components/ChatDetail.jsx` | 對話詳情、AutoReplyToggle、ProactiveSend 主動傳訊區塊 |
| `frontend/src/components/CustomerHistory.jsx` | 歷史紀錄：同批回覆合併顯示、主動傳訊紫色樣式 |
| `frontend/src/components/ChatList.jsx` | 對話列表：購買意圖綠色標記、urgency badge |
| `frontend/src/components/ReplyPicker.jsx` | AI 建議選取：purchase intent 時綠色模式 |

## Models 速查

| Model | 重要欄位 |
|-------|---------|
| `Message` | `lineUserId, userMessage(default:''), replyToken(default:''), urgency, intent, isProactive, status, selectedReply, repliedAt, syncedToSheet` |
| `ProductCard` | `title, subtitle, imageUrl, priceItems[{name,price}], buttonText, buttonUrl, headerBgColor, titleColor, subtitleColor, buttonColor, isActive` |
| `Keyword` | `trigger, replyType('text'|'card'), reply, cardIds[ObjectId], isActive, order` |
| `CustomerSetting` | `lineUserId(unique), autoReplyEnabled(default:true)` |
| `CustomerLabel` | `lineUserId(unique), labelIds[ObjectId→Label]` |
| `Label` | `name, color` |
| `BusinessProfile` | `content, autoReply, autoReplyDelay` |

## OpenAI 函式說明

### `analyzeMessage(userMessage, businessProfile, keywords)`
- **用途**：webhook 收到訊息時呼叫
- **回傳**：`{ replies: string[], urgency: 'normal'|'urgent'|'angry', intent: 'none'|'purchase', keywordMatch: { trigger, reply } | null }`
- **system prompt 包含**：商家知識庫、啟用中的關鍵字列表、情緒分析、購買意圖偵測、JSON 格式要求

### `generateReplies(userMessage, businessProfile, intent='none')`
- **用途**：客服人員點選「取得建議」時呼叫
- **回傳**：`string[]`（3 則建議）
- **intent='purchase'**：system prompt 切換為促成交易模式

## MongoDB Aggregation 注意事項

`GET /api/conversations` pipeline 重點：
1. `$group` 收集 `allMessages`（含所有狀態）
2. `$addFields + $filter` 篩出 `pendingMessages`（status==='pending'）
3. `urgency` / `intent`：從 pendingMessages 中計算最高優先級
4. `sortOrder`：`pending=0, processing=1, failed=2, replied=3`
5. `$lookup` customersettings → `autoReplyEnabled`（不存在時預設 true）

## 路由順序陷阱

`admin.js` 中靜態路由必須在動態路由之前：
```js
router.post('/customers/push', ...)          // ← 先（靜態）
router.patch('/customers/autoreply', ...)    // ← 先（靜態）
router.get('/customers/labels', ...)         // ← 先（靜態）
router.get('/customers/:lineUserId/history', ...) // ← 後（動態）
router.patch('/customers/:lineUserId/labels', ...) // ← 後（動態）
```

## 前端狀態架構

`App.jsx` 主要狀態：
```js
conversations[]       // 對話列表（from /api/conversations，含 autoReplyEnabled）
selectedId            // 目前選取的 lineUserId
suggestedReplies[]    // AI 建議（from /api/conversations/:id/suggest）
suggestIntent         // 'none' | 'purchase'（控制 ReplyPicker 樣式）
labels[]              // 所有標籤定義
customerLabels{}      // { lineUserId: Label[] } 對應表
mobileView            // 'list' | 'chat'（手機版）
```

## Google Sheet 格式

欄位：A 客戶名稱 / B LINE User ID / C 首次聯繫時間 / D 最後訊息時間 / E 最後訊息內容 / F 最後回覆內容

`appendCustomerRow(msg)` 邏輯：讀取所有列 → 找最後一筆同 lineUserId 的列 → 插入其下方（`insertDimension` + `values.update`）；找不到則 append。第一次寫入自動建立表頭。

## 開發慣例

- **新增 API 端點**：在 `admin.js` 新增，靜態路由放動態路由之前
- **新增 Model**：在 `backend/src/models/` 建立，在用到的 route/service 中 `require`
- **環境變數**：只加在 `backend/.env`，前端不直接存取（透過 API）
- **不要修改**的檔案：`railway.toml`、`vite.config.js` proxy 設定

## 常見錯誤排查

| 問題 | 可能原因 |
|------|----------|
| SSE 手機不更新 | 瀏覽器背景斷線，確認有 visibilitychange + online 監聽器 |
| SSE 電腦不更新 | Railway Nginx 緩衝，確認 `X-Accel-Buffering: no` header 已加 |
| 自動回覆有 `[訊息N]` | 使用了舊版格式，改為 `\n---\n` |
| 對話列表不排序 | aggregation 少了 `sortOrder` 或 `$sort` stage |
| 靜態路由 404 | 路由順序問題，靜態路由需在動態路由之前定義 |
| Google Sheets 失敗 | `GOOGLE_PRIVATE_KEY` 的 `\n` 需為真正換行 |
| 主動傳訊存檔失敗 | `userMessage`/`replyToken` required 驗證，確認已改為 `default: ''` |
| 卡片 Carousel 不顯示 | `cardIds[]` 長度需 >1，lineService 依陣列長度決定 bubble 或 carousel |

## 測試建議

1. **Webhook**：使用 LINE 官方 Webhook 測試工具或 ngrok 本地測試
2. **SSE 手機**：手機開後台後回到分頁，確認資料立即更新不需手動重整
3. **自動回覆**：設定短延遲（5s）測試，確認多則訊息只觸發一次回覆
4. **關鍵字卡片**：設定 replyType=card 並選多張卡，確認發出 Carousel
5. **購買意圖**：傳送明確購買訊息，確認對話列表出現綠色標記
6. **主動傳訊**：從後台傳訊給客戶，確認歷史紀錄出現紫色「客服主動傳送」
