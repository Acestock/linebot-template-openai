const { google } = require('googleapis');

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

async function appendRow(message) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      formatDate(message.createdAt),
      message.displayName || '',
      message.userMessage || '',
      message.selectedReply || '',
      message.status || '',
      formatDate(message.repliedAt)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    console.log('[Sheets] Row appended for message:', message._id);
  } catch (err) {
    console.error('[Sheets] Failed to append row:', err.message);
  }
}

async function syncAll(messages) {
  for (const msg of messages) {
    await appendRow(msg);
  }
}

module.exports = { appendRow, syncAll };
