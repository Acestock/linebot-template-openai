# LINE AI 客服系統

一套完整的 LINE 客服後台系統，整合 OpenAI GPT-4o 進行智慧回覆建議、情緒分析、語意關鍵字觸發，並支援即時推播、自動回覆、客戶標籤管理等進階功能。

## 功能總覽

| 功能 | 說明 |
|------|------|
| 📨 對話分組管理 | 依用戶分組，多則分段訊息合併給 AI 分析，一鍵統一回覆 |
| ⚡ 即時訊息推播 | SSE（Server-Sent Events）即時更新，無需手動重整 |
| 🤖 AI 回覆建議 | OpenAI GPT-4o 根據商家知識庫生成 3 則回覆建議 |
| 🔑 智慧關鍵字觸發 | 語意匹配關鍵字，命中時自動即時回覆，不進待回覆佇列 |
| 🚨 緊急訊息偵測 | 情緒分析標記 normal / urgent / angry，顏色提示客服人員 |
| ⏱️ AI 自動回覆 | 可開關的自動回覆，60 秒防抖確保分段訊息齊全後才回覆 |
| 🏷️ 客戶標籤系統 | 自訂標籤名稱與顏色，快速分類客戶 |
| 📝 隨手記事 | 右下角浮動便條，LocalStorage 儲存，Ctrl+Enter 快速儲存 |
| 📱 行動版介面 | 響應式設計，手機上全螢幕切換列表/對話視圖 |
| 📊 Google Sheets 備份 | 每筆回覆自動同步至 Google Sheet |

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端 | Node.js + Express |
| 前端 | React + Vite |
| 資料庫 | MongoDB |
| AI | OpenAI GPT-4o |
| 訊息平台 | LINE Messaging API |
| 即時推播 | Server-Sent Events (SSE) |
| 備份 | Google Sheets API |
| 部署 | Railway（npm workspaces 單服務） |

## 專案結構

```
├── backend/
│   ├── src/
│   │   ├── app.js                      # Express 主程式、CORS、靜態檔案
│   │   ├── routes/
│   │   │   ├── webhook.js              # LINE Webhook（簽名驗證、訊息處理）
│   │   │   └── admin.js                # 後台 REST API（對話、標籤、設定等）
│   │   ├── services/
│   │   │   ├── openaiService.js        # GPT-4o 回覆生成 & 訊息分析
│   │   │   ├── lineService.js          # LINE Push/Reply API
│   │   │   ├── dbService.js            # MongoDB CRUD 封裝
│   │   │   ├── sheetService.js         # Google Sheets 同步
│   │   │   ├── sseService.js           # SSE 客戶端管理 & 廣播
│   │   │   └── autoReplyService.js     # 自動回覆防抖排程
│   │   └── models/
│   │       ├── Message.js              # 訊息（含 urgency 欄位）
│   │       ├── BusinessProfile.js      # 商家知識庫（含 autoReply 設定）
│   │       ├── Keyword.js              # 關鍵字觸發規則
│   │       ├── Label.js                # 標籤定義
│   │       └── CustomerLabel.js        # 客戶-標籤對應
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # 主應用（SSE、狀態管理、響應式）
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── ChatList.jsx            # 對話列表（urgency 標示、標籤顯示）
│   │       ├── ChatDetail.jsx          # 訊息詳情（標籤管理、多訊息泡泡）
│   │       ├── ReplyPicker.jsx         # AI 回覆選擇器（含載入動畫）
│   │       ├── SendPanel.jsx           # 發送/略過面板
│   │       ├── SettingsModal.jsx       # 設定視窗（4 分頁）
│   │       └── StickyNotes.jsx         # 隨手記事浮動插件
│   ├── package.json
│   └── vite.config.js
├── package.json                        # npm workspaces 根設定
├── railway.toml                        # Railway 部署設定
├── CLAUDE.md                           # AI 開發指南
└── README.md
```

## 本地開發

### 環境需求

- Node.js 18+
- MongoDB（本地或 Atlas）

### 安裝與啟動

```bash
# 安裝所有相依套件（根目錄一次安裝）
npm install

# 設定環境變數
cp backend/.env.example backend/.env
# 編輯 backend/.env 填入各項金鑰

# 同時啟動前後端（根目錄）
npm run dev
```

或分別啟動：

```bash
# 後端（port 3000）
cd backend && npm run dev

# 前端（port 5173，代理 /api 至後端）
cd frontend && npm run dev
```

## 環境變數說明（`backend/.env`）

```env
LINE_CHANNEL_SECRET=            # LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=      # LINE Channel Access Token
OPENAI_API_KEY=                 # OpenAI API Key
MONGODB_URL=                    # MongoDB 連線字串
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # Google Service Account Email
GOOGLE_PRIVATE_KEY=             # Google Service Account 私鑰（含換行 \n）
GOOGLE_SHEET_ID=                # Google Sheet ID
FRONTEND_URL=                   # 前端網址（CORS 用）
PORT=3000
```

## API 端點

### Webhook

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/webhook` | LINE Webhook（簽名驗證） |

### 即時推播

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/sse` | SSE 連線，25 秒心跳，推播 `new-message` 事件 |

### 對話管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/conversations` | 取得對話列表（依用戶分組，含 urgency） |
| POST | `/api/conversations/:lineUserId/suggest` | 取得 AI 回覆建議 |
| POST | `/api/conversations/:lineUserId/reply` | 發送回覆至 LINE |
| PATCH | `/api/conversations/:lineUserId/skip` | 略過此對話 |

### 標籤系統

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/labels` | 取得所有標籤 |
| POST | `/api/labels` | 建立標籤 |
| PUT | `/api/labels/:id` | 更新標籤 |
| DELETE | `/api/labels/:id` | 刪除標籤（連帶移除所有客戶的此標籤） |
| GET | `/api/customers/labels` | 取得所有客戶標籤對應 `{ lineUserId: [...] }` |
| PATCH | `/api/customers/:lineUserId/labels` | 更新指定客戶標籤 |

### 關鍵字管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/keywords` | 取得所有關鍵字規則 |
| POST | `/api/keywords` | 建立關鍵字規則 |
| PUT | `/api/keywords/:id` | 更新關鍵字規則 |
| DELETE | `/api/keywords/:id` | 刪除關鍵字規則 |

### 商家設定

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/settings` | 取得商家知識庫設定 |
| PUT | `/api/settings` | 更新設定（含 autoReply 開關、autoReplyDelay） |

### 統計

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/stats` | 今日統計數據 |

## 資料模型

### Message
```js
{
  lineUserId: String,       // LINE 用戶 ID
  displayName: String,      // 顯示名稱
  userMessage: String,      // 用戶訊息內容
  replyMessage: String,     // 發送的回覆內容
  status: String,           // pending | replied | failed | processing
  urgency: String,          // normal | urgent | angry
  replyToken: String,       // LINE replyToken（5 分鐘有效）
  createdAt: Date,
  repliedAt: Date
}
```

### BusinessProfile
```js
{
  name: String,             // 商家名稱
  description: String,      // 商家描述（供 AI 參考）
  tone: String,             // 回覆語調
  autoReply: Boolean,       // 是否啟用自動回覆
  autoReplyDelay: Number    // 自動回覆防抖延遲（秒，預設 60）
}
```

### Keyword
```js
{
  trigger: String,          // 觸發關鍵字（語意匹配，非完全比對）
  reply: String,            // 自動回覆內容
  isActive: Boolean,        // 是否啟用
  order: Number,            // 排序
  createdAt: Date
}
```

### Label
```js
{
  name: String,             // 標籤名稱
  color: String,            // 標籤顏色（hex，預設 #2196F3）
  createdAt: Date
}
```

### CustomerLabel
```js
{
  lineUserId: String,       // LINE 用戶 ID（unique）
  labelIds: [ObjectId]      // 關聯 Label IDs
}
```

## 訊息處理流程

```
LINE 用戶傳訊
    ↓
POST /webhook（簽名驗證）
    ↓
並行取得：LINE 用戶資料 + 商家設定 + 關鍵字列表
    ↓
analyzeMessage()（GPT-4o）
  → 語意匹配關鍵字？ → 是：立即回覆，結束
  → 情緒分析（urgency: normal/urgent/angry）
    ↓
儲存 Message（status: pending, urgency）
    ↓
autoReply 開啟？ → 是：排程防抖計時器（60s）
    ↓
SSE broadcast（new-message）→ 前端即時更新
    ↓
客服人員查看 → 選擇 AI 建議回覆 → 發送
```

## Railway 部署

1. 建立 Railway Project 並連結此 GitHub Repo
2. 新增 MongoDB Database Plugin
3. 設定環境變數（參考上方環境變數說明）
4. Railway 會自動偵測 `railway.toml` 執行 build & start
5. 部署完成後，將後端 URL 填入 LINE Developers Console Webhook URL

> 本專案使用 npm workspaces，Railway 以單一服務部署：build 時同時建置前後端，Express 靜態服務前端檔案。

## 注意事項

- LINE `replyToken` 有 5 分鐘有效期，超時後標記為「發送失敗」
- Google Sheets 私鑰中的換行符 `\n` 需正確填入環境變數
- SSE 連線在 Railway 上需確保 `X-Accel-Buffering: no` header 已設定（已內建）
- 自動回覆計時器儲存在記憶體中，服務重啟後尚未觸發的計時器會遺失
- 所有 API 金鑰透過環境變數注入，請勿 hardcode 於程式碼中

---

> 舊版 Python/FastAPI 單機 Bot 已保留於 `main.py`，僅供參考。
