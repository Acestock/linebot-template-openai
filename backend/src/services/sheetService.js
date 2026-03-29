const { google } = require('googleapis');

const SHEET_RANGE = 'Sheet1!A:G';
const HEADER = ['客戶名稱', 'LINE User ID', '首次聯繫時間', '最後訊息時間', '最後訊息內容', '最後回覆內容', '總對話次數'];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : ''
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function upsertCustomerRow(message) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Read all existing rows
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: SHEET_RANGE
    });
    const rows = getRes.data.values || [];

    // Determine if first row is header
    const hasHeader = rows.length > 0 && rows[0][0] === HEADER[0];

    // Ensure header exists
    if (!hasHeader) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADER] }
      });
    }

    // Data rows (excluding header)
    const dataRows = hasHeader ? rows.slice(1) : rows;
    // 1-indexed sheet row numbers: header is row 1, data starts at row 2
    const dataStartRow = hasHeader ? 2 : 1;

    // Find existing row for this customer by LINE User ID (column B = index 1)
    const existingIndex = dataRows.findIndex(row => row[1] === message.lineUserId);

    const firstContact = existingIndex >= 0
      ? (dataRows[existingIndex][2] || formatDate(message.createdAt))
      : formatDate(message.createdAt);

    const currentCount = existingIndex >= 0
      ? (parseInt(dataRows[existingIndex][6]) || 0) + 1
      : 1;

    const newRow = [
      message.displayName || '',
      message.lineUserId || '',
      firstContact,
      formatDate(message.repliedAt || message.createdAt),
      message.userMessage || '',
      message.selectedReply || '',
      currentCount
    ];

    if (existingIndex >= 0) {
      // Update existing row
      const rowNumber = dataStartRow + existingIndex;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${rowNumber}:G${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });
      console.log(`[Sheets] Updated customer row for: ${message.displayName} (${message.lineUserId})`);
    } else {
      // Append new customer row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });
      console.log(`[Sheets] Added new customer row for: ${message.displayName} (${message.lineUserId})`);
    }
  } catch (err) {
    console.error('[Sheets] Failed to upsert customer row:', err.message);
  }
}

// Called by daily cron job — groups by customer and upserts latest record per customer
async function syncAll(messages) {
  // Take the latest replied message per customer
  const byCustomer = {};
  for (const msg of messages) {
    const existing = byCustomer[msg.lineUserId];
    if (!existing || new Date(msg.repliedAt) > new Date(existing.repliedAt)) {
      byCustomer[msg.lineUserId] = msg;
    }
  }
  for (const msg of Object.values(byCustomer)) {
    await upsertCustomerRow(msg);
  }
}

module.exports = { upsertCustomerRow, syncAll };
