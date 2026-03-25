# LINE AI 聊天輔助系統

一套讓客服人員透過網頁後台接收 LINE 訊息、查看 AI 回覆建議、選擇後發送給用戶，並自動備份至 Google Sheet 的客服輔助系統。

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端 | Node.js + Express |
| 前端 | React + Vite |
| 資料庫 | MongoDB |
| AI | OpenAI GPT-4o |
| 訊息平台 | LINE Messaging API |
| 備份 | Google Sheets API |
| 部署 | Railway |

## 專案結構

```
├── backend/
│   ├── src/
│   │   ├── app.js                 # Express 主程式
│   │   ├── routes/
│   │   │   ├── webhook.js         # LINE Webhook
│   │   │   └── admin.js           # 後台 REST API
│   │   ├── services/
│   │   │   ├── openaiService.js   # OpenAI GPT-4o 整合
│   │   │   ├── lineService.js     # LINE Reply API
│   │   │   ├── dbService.js       # MongoDB 操作
│   │   │   └── sheetService.js    # Google Sheets 同步
│   │   └── models/
│   │       └── Message.js         # 訊息 Schema
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── ChatList.jsx       # 對話列表
│   │       ├── ChatDetail.jsx     # 訊息詳情
│   │       ├── ReplyPicker.jsx    # AI 回覆選擇器
│   │       └── SendPanel.jsx      # 發送面板
│   ├── package.json
│   └── vite.config.js
└── railway.toml                   # Railway 部署設定
```

## 本地開發

### 環境需求

- Node.js 18+
- MongoDB（本地或 Atlas）

### 後端啟動

```bash
cd backend
cp .env.example .env
# 填入各項環境變數
npm install
npm run dev
```

### 前端啟動

```bash
cd frontend
npm install
npm run dev
```

前端開發伺服器會代理 `/api` 請求到後端 `localhost:3000`。

## 環境變數說明（backend/.env）

```env
LINE_CHANNEL_SECRET=         # LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=   # LINE Channel Access Token
OPENAI_API_KEY=              # OpenAI API Key
MONGODB_URL=                 # MongoDB 連線字串
GOOGLE_SERVICE_ACCOUNT_EMAIL= # Google Service Account Email
GOOGLE_PRIVATE_KEY=          # Google Service Account 私鑰（含換行）
GOOGLE_SHEET_ID=             # Google Sheet ID
FRONTEND_URL=                # 前端網址（CORS 用）
PORT=3000
```

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/webhook` | LINE Webhook（含 Signature 驗證） |
| GET | `/api/messages` | 取得所有訊息（倒序） |
| GET | `/api/messages/:id` | 取得單筆訊息 |
| POST | `/api/messages/:id/send` | 發送選定回覆至 LINE |
| PATCH | `/api/messages/:id/skip` | 略過此訊息 |
| GET | `/api/stats` | 今日統計 |

## Railway 部署

1. 建立 Railway Project 並連結此 GitHub Repo
2. 新增 MongoDB Database Plugin
3. 分別為 `backend` 和 `frontend` 服務設定環境變數
4. 部署完成後，將後端 URL 填入 LINE Developers Console Webhook URL

## 注意事項

- LINE `replyToken` 有 5 分鐘有效期，超時後 LINE 會回傳錯誤（狀態標記為「發送失敗」）
- Google Sheets 私鑰中的換行符 `\n` 需正確填入
- 所有 API 金鑰透過環境變數注入，請勿 hardcode 於程式碼中

---

> 舊版 Python/FastAPI 單機 Bot 已保留於 `main.py`，僅供參考。
