const { google } = require('googleapis');

const SHEET_RANGE = 'Sheet1!A:F';
const HEADER = ['客戶名稱', 'LINE User ID', '訊息時間', '回覆時間', '用戶訊息', '客服回覆'];

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

async function appendCustomerRow(message) {
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

    // Ensure header exists
    const hasHeader = rows.length > 0 && rows[0][0] === HEADER[0];
    if (!hasHeader) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADER] }
      });
    }

    const newRow = [
      message.displayName || '',
      message.lineUserId || '',
      formatDate(message.createdAt),
      formatDate(message.repliedAt),
      message.userMessage || '',
      message.selectedReply || ''
    ];

    // Find the last row index that belongs to this customer (column B = lineUserId)
    // rows are 0-indexed; sheet rows are 1-indexed (row 1 = header)
    let lastCustomerRowIndex = -1; // 0-indexed in rows array
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][1] === message.lineUserId) {
        lastCustomerRowIndex = i;
        break;
      }
    }

    if (lastCustomerRowIndex === -1) {
      // Customer not found — append at end
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });
      console.log(`[Sheets] Appended new customer: ${message.displayName}`);
    } else {
      // Insert new row immediately after the customer's last row
      // Sheet row number (1-indexed) = lastCustomerRowIndex + 1
      // We want to insert AFTER that row, so insertIndex = lastCustomerRowIndex + 1 (0-indexed from sheet start)
      const insertAfterSheetRow = lastCustomerRowIndex + 1; // 1-indexed sheet row of last customer record

      // Get the sheet ID first
      const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = metaRes.data.sheets[0].properties.sheetId;

      // Insert a blank row after the customer's last row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: insertAfterSheetRow, // 0-indexed: insert after row at this index
                endIndex: insertAfterSheetRow + 1
              },
              inheritFromBefore: true
            }
          }]
        }
      });

      // Fill in the newly inserted row (sheet row number = insertAfterSheetRow + 1, 1-indexed)
      const targetRow = insertAfterSheetRow + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${targetRow}:F${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });

      console.log(`[Sheets] Inserted row for ${message.displayName} at row ${targetRow}`);
    }
  } catch (err) {
    console.error('[Sheets] Failed to append customer row:', err.message);
  }
}

// Called by daily cron job — append all unsynced messages, grouped by customer
async function syncAll(messages) {
  // Sort messages by lineUserId then by createdAt so same-customer rows end up together
  const sorted = [...messages].sort((a, b) => {
    if (a.lineUserId < b.lineUserId) return -1;
    if (a.lineUserId > b.lineUserId) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  for (const msg of sorted) {
    await appendCustomerRow(msg);
  }
}

module.exports = { appendCustomerRow, syncAll };
