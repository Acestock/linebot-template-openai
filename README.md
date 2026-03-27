# LINE AI 智慧客服系統

> 專為中小型商家設計的 LINE 客服後台，將 AI 能力內嵌進人工客服流程，而非取代它。

---

## 這是什麼？解決什麼問題？

台灣中小商家日常幾乎都靠 LINE 官方帳號接單、回覆客戶。但當訊息量一多，就會面臨幾個共同痛點：

| 痛點 | 場景 |
|------|------|
| **回不完** | 一個人管多個詢問，同時開著 N 個對話視窗 |
| **重複問題太多** | 「幾點開？」「有無外送？」每天回幾十次一樣的問題 |
| **情緒漏接** | 客人抱怨的訊息淹沒在一般詢問裡沒有被優先處理 |
| **客服品質不穩** | 不同時段、不同人回覆語氣不一致，新手容易說錯話 |
| **沒有紀錄** | 對話散落在手機，無法追蹤誰何時問了什麼、回了什麼 |
| **菜單推銷費時** | 客人問有什麼，還要手動複製貼上菜單或截圖傳送 |

本系統將 OpenAI GPT-4o 接入 LINE 後台，讓客服人員可以在網頁後台查看所有訊息、取得 AI 建議、一鍵回覆，並讓常見問題和商品介紹完全自動處理。

---

## 與 LINE 官方功能的比較

LINE 官方帳號（LINE Official Account）本身提供了基礎的自動回覆和 AI 回應，但限制明顯：

| 功能面向 | LINE 官方帳號 | 本系統 |
|----------|--------------|--------|
| 關鍵字觸發 | ✅ 精準字串比對 | ✅ **語意匹配**（「幾點開門」→「營業時間」） |
| 自動回覆 | ✅ 固定文字 | ✅ **AI 動態生成**，符合商家知識庫語氣 |
| 商品介紹卡片 | ✅ 需在官方後台逐張設定 | ✅ **即時預覽，支援自訂配色**，觸發詞一鍵發送 |
| 多卡片輪播 | ✅ 有但設定繁瑣 | ✅ 勾選多張卡片即自動 Carousel |
| 客服人員介入 | ❌ 需切換「聊天」模式，無法看到全貌 | ✅ **網頁後台集中管理**，AI 建議 + 人工確認 |
| 情緒/緊急偵測 | ❌ 無 | ✅ **GPT-4o 情緒分析**，憤怒/緊急訊息自動標紅 |
| 對話分組 | ❌ 逐則訊息顯示 | ✅ **依用戶分組**，多則分段訊息合併分析 |
| 防抖自動回覆 | ❌ 每則觸發 | ✅ **60 秒防抖**，確保客人說完再統一回覆 |
| 客戶標籤分類 | ✅ 基礎分眾功能 | ✅ **自訂名稱與顏色**，即時貼標 |
| 後台行動版 | ❌ 官方 App 操作，無自訂後台 | ✅ **響應式 Web 後台**，手機也能用 |
| 資料備份 | ❌ 無法匯出對話 | ✅ **自動同步 Google Sheets** |
| 隨手記事 | ❌ 無 | ✅ 浮動便條，訂單備忘即時記錄 |

---

## 與市場競品的比較

目前市面上針對 LINE 的客服/行銷工具主要分兩類：

### 行銷自動化平台（如 Omnichat、MAAC、Cresclab）

這類平台功能完整、適合有專職行銷團隊的中大型電商，但：
- 月費通常 NT$ 3,000–30,000+，依訊息量計費
- 功能複雜，需要學習曲線，小商家用不到 80% 的功能
- AI 回覆為附加模組，須額外付費
- 無法自行客製邏輯

### LINE 官方 AI 客服（beta）

- 回覆品質無法調整（不了解自家商品知識）
- 無人工審核機制，AI 說錯話無法即時攔截
- 不開放 API，無法與其他系統整合

### 本系統的定位

```
LINE 官方後台 ──────────── 本系統 ──────────── Omnichat / MAAC
（免費但功能弱）         （輕量 AI 客服）        （企業級但昂貴）
```

**核心優勢：**
- 🔓 **開源可自部署**，無月費、無訊息量限制
- 🧠 **AI 是輔助，不是替代**：每則回覆仍由人確認，降低 AI 說錯話的風險
- ⚙️ **可完整客製化**：任何邏輯都可以修改，商家知識庫完全掌控
- 💰 **成本極低**：僅需 Railway 主機費（約 \$5/月）+ OpenAI API 用量費（一般小商家約 \$1–5/月）
- 🚀 **部署快速**：30 分鐘內從 clone 到上線

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                      LINE 用戶端                         │
└──────────────────────┬──────────────────────────────────┘
                       │ 傳送訊息
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  LINE Messaging API                      │
│              (Webhook → 本系統後端)                       │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │        Express 後端         │
         │  ┌─────────────────────┐   │
         │  │   webhook.js        │   │  ← 簽名驗證、事件路由
         │  └────────┬────────────┘   │
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │  openaiService.js   │   │  ← GPT-4o 情緒分析
         │  │  analyzeMessage()   │   │     + 語意關鍵字匹配
         │  └────────┬────────────┘   │     + 建議回覆生成
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │   MongoDB           │   │  ← 訊息、設定、標籤
         │  │   (5 個 Collection) │   │     卡片、關鍵字儲存
         │  └────────┬────────────┘   │
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │   sseService.js     │   │  ← 即時推播至後台
         │  └─────────────────────┘   │
         │                            │
         │  admin.js (REST API)        │  ← 後台所有操作
         └─────────────┬──────────────┘
                       │ /api/*
         ┌─────────────▼──────────────┐
         │      React 前端後台         │
         │  - 對話列表（urgency 標示） │
         │  - AI 建議 + 人工發送       │
         │  - 商品卡片管理              │
         │  - 設定、標籤、關鍵字        │
         └────────────────────────────┘
```

### 訊息處理流程

```
LINE 用戶傳訊
    │
    ▼
POST /webhook（HMAC-SHA256 簽名驗證）
    │
    ├─ 並行取得：用戶資料 + 商家設定 + 關鍵字列表
    │
    ▼
analyzeMessage()  ← 單次 GPT-4o 呼叫
    ├─ 語意匹配關鍵字？
    │     └─ 是 → 立即 pushMessage / pushFlexCard → 結束
    │
    ├─ 情緒分析 → urgency: normal / urgent / angry
    │
    └─ 儲存 Message（pending） → SSE broadcast → 前台即時更新
         │
         ▼（若開啟自動回覆）
    autoReplyService.schedule()  ← 60s 防抖計時器
         │
         ▼（計時器到期或客服人員手動回覆）
    pushMessage / pushFlexCard → updateMany(pending → replied)
         │
         ▼
    Google Sheets 同步
```

---

## 功能詳覽

### 智慧關鍵字觸發 + 商品卡片

不是死板的字串比對，而是透過 GPT-4o 做語意理解：

- 設定觸發主題「菜單」→ 客人說「有啥可以吃的」也會命中
- 每個觸發主題可回傳：文字 or **LINE Flex Message 卡片**（支援圖片、價目表、按鈕）
- 可複選多張卡片，自動以 **Carousel 輪播**方式發送
- 卡片支援自訂：標題背景色、標題顏色、副標題顏色、按鈕顏色
- 設定介面提供**即時 LINE 預覽**，所見即所得

### AI 回覆建議（Human-in-the-Loop）

```
客人訊息 → GPT-4o 生成 3 則建議（正式版 / 親切版 / 簡潔版）
                         ↓
            客服人員選擇或修改其中一則
                         ↓
                      發送至 LINE
```

AI 說什麼，人類決定要不要送出。有效避免 AI 幻覺造成客訴。

### 緊急訊息偵測

| 標記 | 觸發條件 | 後台顯示 |
|------|----------|----------|
| `angry` | 語氣憤怒、強烈不滿、情緒激動 | 🔴 紅色邊框 |
| `urgent` | 急迫需求、反覆追問、趕時間 | 🟡 黃色邊框 |
| `normal` | 一般詢問 | 無特別標示 |

### 自動回覆防抖機制

```
客人：「你好」              ← 計時器啟動（60s）
客人：「我想問一下」        ← 計時器重置
客人：「你們幾點關？」      ← 計時器重置
（60 秒後，3 則合併分析）  ← 統一回覆一次，不打擾客人
```

---

## 技術架構

| 層級 | 技術 | 選用原因 |
|------|------|----------|
| 後端 | Node.js + Express | 輕量、非同步 I/O 適合即時推播 |
| 前端 | React + Vite | 元件化，快速開發互動介面 |
| 資料庫 | MongoDB | Schema 彈性，訊息結構易於演進 |
| AI | OpenAI GPT-4o | 繁中理解能力優，支援結構化輸出 |
| 即時推播 | SSE（非 WebSocket） | 單向推播即可，零依賴，自動重連 |
| 訊息平台 | LINE Messaging API | Webhook + Push Message |
| 備份 | Google Sheets API | 非技術人員也能查看歷史紀錄 |
| 部署 | Railway | 單一服務，npm workspaces，5 分鐘部署 |

---

## 專案結構

```
├── backend/
│   ├── src/
│   │   ├── app.js                      # Express 主程式、CORS、靜態服務前端
│   │   ├── routes/
│   │   │   ├── webhook.js              # LINE Webhook 入口
│   │   │   └── admin.js                # 後台所有 REST API
│   │   ├── services/
│   │   │   ├── openaiService.js        # analyzeMessage() / generateReplies()
│   │   │   ├── lineService.js          # pushMessage() / pushFlexCard()
│   │   │   ├── dbService.js            # MongoDB CRUD 封裝
│   │   │   ├── sheetService.js         # Google Sheets 同步
│   │   │   ├── sseService.js           # SSE 客戶端管理 & 廣播
│   │   │   └── autoReplyService.js     # 防抖計時器管理
│   │   └── models/
│   │       ├── Message.js              # 訊息（urgency、status）
│   │       ├── BusinessProfile.js      # 商家知識庫 + autoReply 設定
│   │       ├── Keyword.js              # 關鍵字規則（replyType: text/card）
│   │       ├── ProductCard.js          # 商品卡片（含自訂配色）
│   │       ├── Label.js                # 標籤定義
│   │       └── CustomerLabel.js        # 客戶-標籤對應
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx                     # 全域狀態、SSE、響應式
│       └── components/
│           ├── ChatList.jsx            # 對話列表（urgency 色彩、標籤）
│           ├── ChatDetail.jsx          # 訊息詳情 + 標籤管理
│           ├── ReplyPicker.jsx         # AI 建議選擇器
│           ├── SendPanel.jsx           # 發送 / 略過
│           ├── SettingsModal.jsx       # 5 分頁設定（含商品卡片）
│           └── StickyNotes.jsx         # 浮動隨手記事
├── package.json                        # npm workspaces 根設定
└── railway.toml                        # 部署設定
```

---

## 本地開發

**環境需求**：Node.js 18+、MongoDB（本地或 Atlas）

```bash
# 安裝全部相依套件
npm install

# 設定環境變數
cp backend/.env.example backend/.env
# 編輯 backend/.env

# 同時啟動前後端
npm run dev
# 後台：http://localhost:5173
# API：http://localhost:3000
```

## 環境變數（`backend/.env`）

```env
LINE_CHANNEL_SECRET=            # LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=      # LINE Channel Access Token
OPENAI_API_KEY=                 # OpenAI API Key
MONGODB_URL=                    # MongoDB 連線字串
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # Google Service Account Email
GOOGLE_PRIVATE_KEY=             # Service Account 私鑰（\n 需為真正換行）
GOOGLE_SHEET_ID=                # 備份用 Google Sheet ID
FRONTEND_URL=                   # 前端網址（CORS 白名單）
PORT=3000
```

---

## Railway 部署（5 分鐘上線）

1. Fork 此 Repo → 建立 Railway Project → 連結 GitHub Repo
2. 新增 MongoDB Database Plugin
3. 填入環境變數
4. Push → 自動 build & deploy（`railway.toml` 已設定好）
5. 將 Railway 服務網址填入 LINE Developers Console → Webhook URL

**估計費用**：Railway Hobby Plan \$5/月 + OpenAI API（小商家約 \$1–3/月）

---

## 注意事項

- LINE `replyToken` 有 **5 分鐘**有效期，超時後本系統改用 Push Message
- 自動回覆計時器在記憶體中，服務重啟後尚未觸發的計時器會遺失（可接受的取捨）
- SSE 在 Railway 需 `X-Accel-Buffering: no` header（已內建）
- Google Sheets 私鑰 `\n` 必須為真正換行符，不能是字串 `\n`

---

> 舊版 Python/FastAPI 原型保留於 `main.py`，僅供參考。
