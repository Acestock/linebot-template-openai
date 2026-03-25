# LINE AI 聊天輔助系統 — 部署指南

本指南將帶您一步一步完成系統部署，全程約需 **30 分鐘**。
完成後，您將擁有一套可以接收 LINE 訊息、由 AI 生成回覆建議、並透過網頁後台手動發送的客服系統。

---

## 事前準備：需要申請的帳號

| 服務 | 用途 | 費用 |
|------|------|------|
| [LINE Developers](https://developers.line.biz/) | 建立 LINE Bot | 免費 |
| [OpenAI Platform](https://platform.openai.com/) | GPT-4o AI 回覆 | 付費（依使用量計費） |
| [Google Cloud](https://console.cloud.google.com/) | 自動備份至 Google Sheet | 免費（Service Account） |
| [Railway](https://railway.app/) | 部署後端、前端、資料庫 | 免費方案可用 |
| [GitHub](https://github.com/) | 存放程式碼 | 免費 |

> **資料庫不需另外申請**，直接使用 Railway 內建的 MongoDB 外掛即可。

---

## Step 1：LINE Messaging API 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)，登入 LINE 帳號
2. 點擊 **Create a Provider**，輸入名稱（例如：我的客服系統）
3. 選擇 **Create a Messaging API channel**，填寫基本資料後建立
4. 進入 Channel 頁面：
   - **Basic settings** → 找到 **Channel secret** → 複製並儲存
   - **Messaging API** → 最下方 **Channel access token** → 點 **Issue** → 複製並儲存
5. 在 **Messaging API** 頁面：
   - **Webhook settings** → 開啟 **Use webhook**（Webhook URL 待 Step 6 再填）
   - **LINE Official Account features** → **Auto-reply messages** → 設為 **Disabled**（關閉自動回覆）

---

## Step 2：OpenAI API Key

1. 前往 [OpenAI Platform](https://platform.openai.com/)，登入或註冊帳號
2. 點擊右上角帳號 → **API keys**
3. 點擊 **Create new secret key**，輸入名稱後建立
4. **立即複製並儲存**（關閉視窗後無法再次查看）

> 確保帳戶有足夠的額度，且具有 **GPT-4o** 的存取權限。

---

## Step 3：Google Sheets 設定

### 3-1 建立 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com/)，建立一份新試算表
2. 複製網址中的 **Sheet ID**：
   網址格式：`https://docs.google.com/spreadsheets/d/【這段就是Sheet ID】/edit`

### 3-2 建立 Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊左上角 **選擇專案** → **新增專案**，建立一個新專案
3. 左側選單 → **API 和服務** → **啟用的 API 和服務** → 搜尋 **Google Sheets API** → 啟用
4. 左側選單 → **IAM 與管理** → **服務帳戶** → **建立服務帳戶**
5. 輸入名稱後一路點下一步，完成建立
6. 點擊剛建立的 Service Account → **金鑰** 頁籤 → **新增金鑰** → **建立新金鑰** → 選 **JSON** → 下載

### 3-3 從 JSON 取出所需資訊

打開下載的 JSON 檔，找到這兩個欄位：
```json
{
  "client_email": "xxxxx@xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

複製並儲存 `client_email` 和完整的 `private_key`（含 `-----BEGIN...-----` 這兩行）。

### 3-4 分享 Google Sheet 給 Service Account

1. 回到你的 Google Sheet
2. 點擊右上角 **共用**
3. 貼上 `client_email`（例如：`xxxxx@xxxxx.iam.gserviceaccount.com`）
4. 權限選擇 **編輯者** → 確認

> ⚠️ **重要**：`private_key` 裡面的 `\n` 是換行符號，填入環境變數時**保留原樣**，不要替換或刪除。

---

## Step 4：將程式碼上傳至 GitHub

1. 前往 [GitHub](https://github.com/)，登入後點 **New repository**
2. 建立一個新的 Repository（名稱例如：`line-ai-bot`），設為 **Public** 或 **Private**
3. 在本機的專案資料夾執行以下指令（將 `YOUR_USERNAME` 換成你的 GitHub 帳號）：

```bash
git remote add origin https://github.com/YOUR_USERNAME/line-ai-bot.git
git push -u origin main
```

---

## Step 5：Railway 部署

> ⚠️ **重要說明**：Railway 不會自動從設定檔建立服務，後端和前端需要**分別手動建立**，各自指定子資料夾。請按照以下步驟操作。

### 5-1 建立 Railway Project

1. 前往 [Railway](https://railway.app/)，使用 GitHub 帳號登入
2. 點擊 **New Project** → **Deploy from GitHub Repo**
3. 選擇你的 `line-ai-bot` Repository
4. Railway 會建立**第一個服務**，先**不要**讓它開始部署

### 5-2 設定後端服務（backend）

1. 點選剛建立的服務 → **Settings** 頁籤
2. 找到 **Source** → **Root Directory**，填入：
   ```
   backend
   ```
3. 往下找到 **Deploy** → **Start Command**，確認或填入：
   ```
   node src/app.js
   ```
4. 點擊 **Save Changes** → Railway 會自動重新部署

### 5-3 新增 MongoDB 資料庫

1. 回到 Project 頁面，點擊 **New Service**
2. 選擇 **Database → Add MongoDB**
3. 完成後 Railway 會自動將 `MONGODB_URL` 注入所有服務，**不需要手動設定**

### 5-4 新增前端服務（frontend）

1. 回到 Project 頁面，點擊 **New Service** → **GitHub Repo**
2. 選擇**同一個** Repository
3. 點選這個新服務 → **Settings** 頁籤
4. **Root Directory** 填入：
   ```
   frontend
   ```
5. **Start Command** 填入：
   ```
   npx serve dist -p $PORT
   ```
6. 點擊 **Save Changes**

### 5-5 取得前端網址

1. 點選 **frontend** 服務 → **Settings** 頁籤
2. 往下找到 **Networking** → **Generate Domain**
3. Railway 產生類似 `frontend-xxx.up.railway.app` 的網址 → **複製起來備用**

### 5-6 設定後端環境變數

1. 點選 **backend** 服務 → **Variables** 頁籤
2. 點擊 **New Variable**，依序填入以下所有變數：

| 變數名稱 | 填入內容 |
|----------|----------|
| `LINE_CHANNEL_SECRET` | Step 1 取得的 Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | Step 1 取得的 Channel Access Token |
| `OPENAI_API_KEY` | Step 2 取得的 OpenAI API Key |
| `MONGODB_URL` | **不需填**（Railway MongoDB 外掛自動注入） |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Step 3-3 的 `client_email` |
| `GOOGLE_PRIVATE_KEY` | Step 3-3 的完整 `private_key` |
| `GOOGLE_SHEET_ID` | Step 3-1 複製的 Sheet ID |
| `FRONTEND_URL` | Step 5-5 複製的前端網址 |

3. 填完後 backend 服務會自動重新部署

### 5-7 取得後端網址

1. 點選 **backend** 服務 → **Settings** 頁籤
2. **Networking** → **Generate Domain**
3. 複製後端網址（例如：`backend-xxx.up.railway.app`）→ 下一步會用到

---

## Step 6：設定 LINE Webhook URL

1. 回到 [LINE Developers Console](https://developers.line.biz/console/)
2. 進入你的 Channel → **Messaging API** 頁籤
3. **Webhook URL** → 點擊編輯，填入：
   ```
   https://【你的後端網址】/webhook
   ```
   例如：`https://backend-xxx.up.railway.app/webhook`
4. 點擊 **Update** 儲存
5. 點擊 **Verify** → 看到 **Success** 表示設定成功 ✓

---

## Step 7：驗證整個流程

部署完成後，依序完成以下測試：

- [ ] 用 LINE 加你的 Bot 為好友，並傳送一則測試訊息
- [ ] 開啟前端後台（前端服務網址，例如：`https://frontend-xxx.up.railway.app`）
- [ ] 確認左側訊息列表出現剛才的訊息，狀態顯示「待回覆（藍色）」
- [ ] 點選該訊息，右側出現 3 條 AI 回覆建議
- [ ] 選擇其中一條，或自行輸入回覆，點擊「發送到 LINE」
- [ ] 確認 LINE 用戶端收到回覆
- [ ] 打開 Google Sheet，確認最後一行有新增一筆記錄

---

## 常見問題排解

**Q：Webhook Verify 點擊後顯示失敗**
→ 確認 backend 服務已成功部署（Railway 上顯示綠燈）且網址使用 `https`

**Q：訊息列表出現，但 AI 回覆全部是空白**
→ 確認 `OPENAI_API_KEY` 填寫正確，且 OpenAI 帳戶有 GPT-4o 存取權限

**Q：點擊「發送到 LINE」顯示發送失敗（紅色標籤）**
→ 確認 LINE 用戶曾主動傳訊息給 Bot（pushMessage 需要用戶主動互動過）

**Q：Google Sheet 沒有新增記錄**
→ 確認已將 Service Account Email 加為 Google Sheet 的「編輯者」（Step 3-4）

**Q：Railway 顯示 MongoDB 連線錯誤**
→ 確認已在 Project 中新增 MongoDB 外掛（Step 5-2），並重新部署 backend 服務

**Q：前端頁面打開是空白或 API 錯誤**
→ 確認後端 `FRONTEND_URL` 環境變數填入的是前端網址（用於 CORS 設定）

---

## 環境變數總覽

以下為 backend 服務需要設定的完整環境變數清單：

```
LINE_CHANNEL_SECRET=         ← LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=   ← LINE Channel Access Token
OPENAI_API_KEY=              ← OpenAI API Key
MONGODB_URL=                 ← Railway 自動注入，不需填寫
GOOGLE_SERVICE_ACCOUNT_EMAIL= ← Service Account 的 client_email
GOOGLE_PRIVATE_KEY=          ← Service Account 的 private_key（完整 PEM 格式）
GOOGLE_SHEET_ID=             ← Google Sheet 網址中的 ID
FRONTEND_URL=                ← 前端服務的 Public URL（e.g. https://frontend-xxx.up.railway.app）
```
