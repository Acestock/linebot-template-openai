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
| **接單靠打字** | 客人問「可以訂嗎」，要手動收集品項、確認數量、記錄資料 |
| **記不住老客戶** | 輪班換人，完全沒有上次溝通的背景，重新從頭問 |
| **無法分眾溝通** | 想對 VIP 客戶推播促銷，只能全部一起發，騷擾非目標客群 |
| **後台安全性低** | 任何人開後台網址就能看到所有客戶對話資料 |

本系統將 OpenAI GPT-4o 接入 LINE 後台，讓客服人員可以在網頁後台查看所有訊息、取得 AI 建議、一鍵回覆，並讓常見問題和商品介紹完全自動處理。

---

## 核心功能亮點

### 🔐 後台登入驗證 — 解決：安全性低

**痛點**：後台掌握所有客戶對話、商家資料，卻任何人打開網址就能進入。

**解法**：帳號密碼登入機制，7 天 Token 驗證。所有 API 均需 Bearer Token，後台資料完全保護。

```
後台 → 輸入帳號/密碼 → 取得 Token → localStorage 保存 → 自動帶入每次 API 請求
```

---

### 📋 訂單下定系統 — 解決：接單靠打字

**痛點**：客人問「我要訂兩份A餐一份B餐」，客服要手動整理品項、回覆確認、建立訂單，容易出錯且費時。

**解法**：後台設定品項清單 → 一鍵傳送「訂購單 Flex Message 卡片」 → 客人點「我想下單」確認 → 系統自動建立訂單 → 通知指定管理員 LINE → 後台即時收到推播通知。

```
客服後台                    LINE 用戶端
    │                           │
    ├── 點「傳送訂購單」 ───────→ 收到商品卡片（含品項/價格/按鈕）
    │                           │
    │                    客人點「我想下單」
    │                           │
    ←── SSE 即時更新 ←── 系統自動建立訂單 + 通知管理員
    │
    └── 後台可查看/更新訂單狀態（新訂單/處理中/已完成/已取消）
```

- 品項管理：名稱、說明、價格（支援「面議」「報價」等彈性格式）、單位
- 訂單管理：狀態追蹤、備注、刪除、分頁篩選
- 新訂單角標：App 標題即時顯示未處理訂單數

---

### 🧠 AI 對話記憶摘要 — 解決：記不住老客戶

**痛點**：客服換班或多人共管，根本不知道上次跟這個客人聊到哪，要從頭看幾百則記錄。

**解法**：每次回覆後，系統以 GPT-4o-mini 自動更新「對話摘要」（~100字），儲存在後台；下次開啟對話，AI 回覆建議已將此客戶背景納入考量。

```
每次回覆後（非同步，不影響回覆速度）：
    取最近 20 則訊息 → GPT-4o-mini 摘要 → 存入 CustomerSetting
    
下次生成 AI 建議時：
    【此客戶對話背景摘要】：上次詢問過夏季款式，有意購買但等打折...
                ↓
    AI 建議更貼合此客戶脈絡，而非完全重頭分析
```

- 後台可展開查看摘要（含最後更新時間）
- 支援手動編輯摘要（客服人工備注）
- 使用 GPT-4o-mini，成本約為 GPT-4o 的 1/10

---

### 📢 標籤群發 — 解決：無法分眾溝通

**痛點**：想對「VIP 客戶」推播促銷訊息，或對「待跟進」客戶發送提醒，LINE 官方只能全體發送，浪費費用且騷擾其他客戶。

**解法**：自訂標籤（如 VIP、潛在客戶、已購買），貼給對應客戶後，透過「群發」功能選擇標籤 → 預覽人數 → 發送專屬訊息。

- 即時顯示「此標籤共 N 位客戶」
- 發送前確認人數，避免誤操作
- 發送結果回報（成功/失敗筆數）

---

### 📚 FAQ 知識庫 — 解決：重複問題太多

**痛點**：「幾點開？」「有無外送？」每天同樣問題要回幾十次。雖有關鍵字觸發，但每個小問題都設定一條規則太麻煩，而且問法稍有不同就觸發不到。

**解法**：建立結構化 FAQ（問題/答案對），AI 分析訊息時會參考所有 FAQ，即使客人問法不同也能正確回答。

```
FAQ 設定：
  Q: 幾點開門？
  A: 每天早上 10 點到晚上 9 點，週二公休。

客人傳：「你們星期三有開嗎」
GPT-4o：根據 FAQ 回答「我們週二公休，其他時間含週三都有營業...」
```

- 後台 FAQ 管理介面（新增/編輯/刪除/啟用停用）
- 排序功能，控制 AI 回覆時的參考優先級
- 與商家知識庫並行，結構更清晰、易維護

---

### 🃏 AI 回覆建議（Human-in-the-Loop）

```
客人訊息 → GPT-4o 生成 3 則建議（正式版 / 親切版 / 簡潔版）
                         ↓
            客服人員選擇或修改其中一則
                         ↓
                      發送至 LINE
```

AI 說什麼，人類決定要不要送出。有效避免 AI 幻覺造成客訴。

- 偵測到**購買意圖**時，切換為促成交易模式（引導下單、安心保證、促成成交）
- 購買意圖對話以綠色邊框 + 🛒 標記，讓客服優先處理

---

### 🔍 智慧關鍵字觸發 + 商品卡片

不是死板的字串比對，而是透過 GPT-4o 做語意理解：

- 設定觸發主題「菜單」→ 客人說「有啥可以吃的」也會命中
- 每個觸發主題可回傳：文字 or **LINE Flex Message 卡片**（支援圖片、價目表、按鈕）
- 可複選多張卡片，自動以 **Carousel 輪播**方式發送
- 卡片支援自訂：標題背景色、標題顏色、副標題顏色、按鈕顏色
- 設定介面提供**即時 LINE 預覽**，所見即所得

---

### 🚨 緊急訊息偵測

| 標記 | 觸發條件 | 後台顯示 |
|------|----------|----------|
| `angry` | 語氣憤怒、強烈不滿、情緒激動 | 🔴 紅色邊框 |
| `urgent` | 急迫需求、反覆追問、趕時間 | 🟡 黃色邊框 |
| `normal` | 一般詢問 | 無特別標示 |

---

### ⏱ 自動回覆防抖機制

```
客人：「你好」              ← 計時器啟動（60s）
客人：「我想問一下」        ← 計時器重置
客人：「你們幾點關？」      ← 計時器重置
（60 秒後，3 則合併分析）  ← 統一回覆一次，不打擾客人
```

---

## 與 LINE 官方功能的比較

| 功能面向 | LINE 官方帳號 | 本系統 |
|----------|--------------|--------|
| 後台安全性 | ❌ 無登入機制 | ✅ **帳號密碼 + Token 驗證** |
| 關鍵字觸發 | ✅ 精準字串比對 | ✅ **語意匹配**（「幾點開門」→「營業時間」） |
| 自動回覆 | ✅ 固定文字 | ✅ **AI 動態生成**，符合商家知識庫語氣 |
| FAQ 知識庫 | ❌ 無結構化 Q&A | ✅ **結構化 FAQ 管理**，AI 參考作答 |
| 訂單管理 | ❌ 無 | ✅ **完整訂單流程**：發卡→確認→追蹤→通知 |
| 對話記憶 | ❌ 無 | ✅ **AI 自動摘要**，客服切換時不失去脈絡 |
| 群發分眾 | ✅ 有但依訊息費計費 | ✅ **依標籤群發**，自訂目標客群 |
| 商品介紹卡片 | ✅ 需在官方後台逐張設定 | ✅ **即時預覽，支援自訂配色**，觸發詞一鍵發送 |
| 多卡片輪播 | ✅ 有但設定繁瑣 | ✅ 勾選多張卡片即自動 Carousel |
| 客服人員介入 | ❌ 需切換「聊天」模式 | ✅ **網頁後台集中管理**，AI 建議 + 人工確認 |
| 情緒/緊急偵測 | ❌ 無 | ✅ **GPT-4o 情緒分析**，憤怒/緊急訊息自動標紅 |
| 對話分組 | ❌ 逐則訊息顯示 | ✅ **依用戶分組**，多則分段訊息合併分析 |
| 防抖自動回覆 | ❌ 每則觸發 | ✅ **60 秒防抖**，確保客人說完再統一回覆 |
| 客戶標籤分類 | ✅ 基礎分眾功能 | ✅ **自訂名稱與顏色**，即時貼標 |
| 後台行動版 | ❌ 官方 App 操作，無自訂後台 | ✅ **響應式 Web 後台**，手機也能用 |
| 資料備份 | ❌ 無法匯出對話 | ✅ **自動同步 Google Sheets** |

---

## 與市場競品的比較

目前市面上針對 LINE 的客服/行銷工具主要分兩類：

### 行銷自動化平台（如 Omnichat、MAAC、Crescendo Lab）

這類平台功能完整、適合有專職行銷團隊的中大型電商，但：
- 月費通常 NT$ 3,000–30,000+，依訊息量計費
- 功能複雜，需要學習曲線，小商家用不到 80% 的功能
- AI 回覆為附加模組，須額外付費
- 無法自行客製邏輯
- 對話記憶、訂單整合通常需要搭配 CRM 另購

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
- 📦 **訂單全程數位化**：從詢問到確認到追蹤，不再靠紙本或口頭記錄
- 🧠 **不失憶的客服**：摘要功能讓每位客服都能立即掌握客戶背景
- 💰 **成本極低**：僅需 Railway 主機費（約 \$5/月）+ OpenAI API 用量費（一般小商家約 \$1–5/月）
- 🚀 **部署快速**：30 分鐘內從 clone 到上線

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                      LINE 用戶端                         │
└──────────────────────┬──────────────────────────────────┘
                       │ 傳送訊息 / 點擊按鈕（postback）
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  LINE Messaging API                      │
│              (Webhook → 本系統後端)                       │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │        Express 後端         │
         │  ┌─────────────────────┐   │
         │  │   webhook.js        │   │  ← 簽名驗證、postback 事件、訂單建立
         │  └────────┬────────────┘   │
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │  openaiService.js   │   │  ← GPT-4o 情緒分析 + 語意匹配
         │  │                     │   │     + 建議回覆 + FAQ 參考
         │  │  summarize()        │   │  ← GPT-4o-mini 對話摘要
         │  └────────┬────────────┘   │
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │   MongoDB           │   │  ← 訊息、設定、標籤、FAQ
         │  │   (9 個 Collection) │   │     卡片、關鍵字、訂單儲存
         │  └────────┬────────────┘   │
         │           │                │
         │  ┌────────▼────────────┐   │
         │  │   sseService.js     │   │  ← 即時推播至後台（新訊息/新訂單）
         │  └─────────────────────┘   │
         │                            │
         │  admin.js (REST API)        │  ← 後台所有操作（Token 驗證）
         └─────────────┬──────────────┘
                       │ /api/*
         ┌─────────────▼──────────────┐
         │      React 前端後台         │
         │  - 後台登入（Token 驗證）   │
         │  - 對話列表（urgency 標示） │
         │  - AI 建議 + 人工發送       │
         │  - 對話摘要（可編輯）       │
         │  - 訂單下定 + 訂單管理      │
         │  - 標籤群發                 │
         │  - FAQ 知識庫管理           │
         │  - 商品卡片 / 訂購品項      │
         │  - 設定、標籤、關鍵字       │
         └────────────────────────────┘
```

### 訊息處理流程

```
LINE 用戶傳訊
    │
    ▼
POST /webhook（HMAC-SHA256 簽名驗證）
    │
    ├─ postback 事件（action=order_confirm）？
    │     └─ 是 → 建立 Order → 回覆客戶確認 → 通知管理員 → SSE broadcast
    │
    ├─ 並行取得：用戶資料 + 商家設定 + 關鍵字 + FAQ + 對話摘要 + CustomerSetting
    │
    ▼
analyzeMessage(text, bp, keywords, faqs, conversationSummary)
    ├─ 語意匹配關鍵字？
    │     └─ 是 → 立即 pushMessage / pushFlexCard → 結束
    │
    ├─ 情緒分析 → urgency: normal / urgent / angry
    ├─ 購買意圖 → intent: none / purchase
    │
    └─ 儲存 Message（pending） → SSE broadcast → 前台即時更新
         │
         ▼（若開啟自動回覆）
    autoReplyService.schedule()  ← 60s 防抖計時器
         │
         ▼（計時器到期）
    generateReplies(text, bp, intent, faqs, conversationSummary)
         │
         ▼
    pushMessage → updateMany(pending → replied)
         │
         ▼（非同步，不阻塞回覆）
    Google Sheets 同步 + 更新對話摘要（GPT-4o-mini）
```

---

## 功能詳覽

### 訂購品項設定

後台「設定 → 訂購品項」可管理商家可供訂購的品項：

| 欄位 | 說明 |
|------|------|
| 名稱 | 品項名稱（必填） |
| 說明 | 簡短描述（選填） |
| 價格 | 支援 `$60`、`NT$100`、`面議`、`報價` 等彈性格式 |
| 單位 | 杯、份、個、盒（選填） |
| 啟用 | 關閉後不出現在訂購單卡片 |

### 訂單管理後台

右側滑入面板，支援：
- 依狀態篩選（新訂單 / 處理中 / 已完成 / 已取消）
- 每筆訂單顯示：客戶名稱、時間、品項清單、備注
- 狀態流轉按鈕（新訂單→處理中→已完成 or 取消）
- 備注編輯、訂單刪除

### 對話摘要

每位客戶的對話詳情頁頂端可展開「對話摘要」區塊：
- 藍色卡片顯示 AI 自動更新的摘要
- 顯示最後更新時間
- 支援客服人工點擊「編輯」直接修改
- 未有摘要時顯示「＋ 新增對話摘要」提示

---

## 技術架構

| 層級 | 技術 | 選用原因 |
|------|------|----------|
| 後端 | Node.js + Express | 輕量、非同步 I/O 適合即時推播 |
| 前端 | React + Vite | 元件化，快速開發互動介面 |
| 資料庫 | MongoDB | Schema 彈性，訊息結構易於演進 |
| AI（主） | OpenAI GPT-4o | 繁中理解能力優，支援結構化輸出 |
| AI（摘要） | OpenAI GPT-4o-mini | 成本 1/10，適合高頻的摘要任務 |
| 即時推播 | SSE（非 WebSocket） | 單向推播即可，零依賴，自動重連 |
| 訊息平台 | LINE Messaging API | Webhook + Push Message + Flex Message |
| 備份 | Google Sheets API | 非技術人員也能查看歷史紀錄 |
| 部署 | Railway | 單一服務，npm workspaces，5 分鐘部署 |

---

## 專案結構

```
├── backend/
│   ├── src/
│   │   ├── app.js                      # Express 主程式、CORS、靜態服務前端
│   │   ├── middleware/
│   │   │   └── auth.js                 # Bearer Token 驗證、會話管理
│   │   ├── routes/
│   │   │   ├── webhook.js              # LINE Webhook 入口（含 postback 訂單確認）
│   │   │   └── admin.js                # 後台所有 REST API
│   │   ├── services/
│   │   │   ├── openaiService.js        # analyzeMessage() / generateReplies() / summarizeConversation()
│   │   │   ├── lineService.js          # pushMessage() / pushFlexCard() / pushOrderCard()
│   │   │   ├── dbService.js            # MongoDB CRUD 封裝
│   │   │   ├── sheetService.js         # Google Sheets 同步
│   │   │   ├── sseService.js           # SSE 客戶端管理 & 廣播
│   │   │   └── autoReplyService.js     # 防抖計時器 + 自動回覆 + 摘要更新
│   │   └── models/
│   │       ├── Message.js              # 訊息（urgency、intent、status、isProactive）
│   │       ├── BusinessProfile.js      # 商家知識庫 + autoReply 設定 + adminLineUserId
│   │       ├── Keyword.js              # 關鍵字規則（replyType: text/card）
│   │       ├── ProductCard.js          # 商品卡片（含自訂配色）
│   │       ├── Label.js                # 標籤定義
│   │       ├── CustomerLabel.js        # 客戶-標籤對應
│   │       ├── CustomerSetting.js      # 個人自動回覆開關 + 對話摘要
│   │       ├── FAQ.js                  # FAQ 知識庫（Q&A 對）
│   │       ├── OrderItem.js            # 訂購品項定義
│   │       └── Order.js                # 訂單（status / items / note）
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx                     # 全域狀態、SSE、響應式、訂單角標
│       ├── config.js                   # authFetch() Bearer Token 封裝
│       └── components/
│           ├── ChatList.jsx            # 對話列表（urgency 色彩、購買意圖標記）
│           ├── ChatDetail.jsx          # 訊息詳情 + ConversationSummary + SendOrderCard
│           ├── ReplyPicker.jsx         # AI 建議選擇器（purchase intent 綠色模式）
│           ├── SendPanel.jsx           # 發送 / 略過
│           ├── TemplatePanel.jsx       # 快捷回覆模板選擇器
│           ├── SettingsModal.jsx       # 7 分頁設定（含 FAQ / 訂購品項）
│           ├── BroadcastModal.jsx      # 標籤群發介面
│           ├── OrdersModal.jsx         # 訂單管理面板
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
# LINE
LINE_CHANNEL_SECRET=            # LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=      # LINE Channel Access Token

# OpenAI
OPENAI_API_KEY=                 # OpenAI API Key

# MongoDB
MONGODB_URL=                    # MongoDB 連線字串

# 後台登入（必填，未設定則登入時回傳 500）
ADMIN_USERNAME=admin            # 後台帳號（預設 admin）
ADMIN_PASSWORD=                 # 後台密碼（必填，請自行設定強密碼）

# Google Sheets（選填）
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # Google Service Account Email
GOOGLE_PRIVATE_KEY=             # Service Account 私鑰（\n 需為真正換行）
GOOGLE_SHEET_ID=                # 備份用 Google Sheet ID

# 其他
FRONTEND_URL=                   # 前端網址（CORS 白名單）
PORT=3000
```

### 後台帳號設定（重要）

後台登入憑證**完全由環境變數控制**，程式碼中無任何預設密碼：

- `ADMIN_USERNAME`：預設為 `admin`，可自訂
- `ADMIN_PASSWORD`：**必填**，未設定則登入 API 回傳 500 錯誤
- 在 Railway 部署時，於 Variables 頁面設定以上兩個變數

### 訂單通知設定

後台「設定 → 自動回覆」中的「管理員 LINE User ID」欄位（`adminLineUserId`），填入要接收訂單通知的 LINE 帳號 User ID。可透過 LINE Bot 傳訊後從 webhook log 取得。

---

## Railway 部署（5 分鐘上線）

1. Fork 此 Repo → 建立 Railway Project → 連結 GitHub Repo
2. 新增 MongoDB Database Plugin
3. 填入環境變數（**包含 `ADMIN_PASSWORD`**）
4. Push → 自動 build & deploy（`railway.toml` 已設定好）
5. 將 Railway 服務網址填入 LINE Developers Console → Webhook URL

**估計費用**：Railway Hobby Plan \$5/月 + OpenAI API（小商家約 \$1–3/月）

---

## 注意事項

- LINE `replyToken` 有 **5 分鐘**有效期，超時後本系統改用 Push Message
- 自動回覆計時器在記憶體中，服務重啟後尚未觸發的計時器會遺失（可接受的取捨）
- SSE 在 Railway 需 `X-Accel-Buffering: no` header（已內建）
- Google Sheets 私鑰 `\n` 必須為真正換行符，不能是字串 `\n`
- 對話摘要使用非同步更新，回覆後約 2–3 秒完成，不影響回覆速度
- 訂單通知需填寫 `adminLineUserId`，否則通知步驟會靜默跳過

---

> 舊版 Python/FastAPI 原型保留於 `main.py`，僅供參考。
