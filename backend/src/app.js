require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');
const { authMiddleware, createToken } = require('./middleware/auth');
const dbService = require('./services/dbService');
const sheetService = require('./services/sheetService');
const { startNotifyJob } = require('./services/calendarService');
const { startReservationReminderJob } = require('./services/reservationCronService');

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[Auth] WARNING: ADMIN_PASSWORD is not set. Please set it in environment variables.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - 本地開發時允許 Vite dev server（production 同 origin 不需要）
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4000'
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// LINE Webhook route requires raw body for signature validation
app.use('/webhook', webhookRouter);

// JSON body parser for all other routes
app.use(express.json());

// ── Auth helpers ──────────────────────────────────────────────────────────────
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// POST /api/auth/login — public, no auth required
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD;
  if (!validPass) return res.status(500).json({ error: 'ADMIN_PASSWORD 未設定，請聯絡管理員' });
  if (!username || !password) return res.status(400).json({ error: '請輸入帳號與密碼' });
  if (!safeEqual(username, validUser) || !safeEqual(password, validPass))
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  res.json({ token: createToken() });
});

// GET /api/auth/verify — check if current token is still valid
app.get('/api/auth/verify', authMiddleware, (req, res) => res.json({ ok: true }));

// LIFF public API (LINE user auth, not admin auth — must be before authMiddleware)
const liffRouter = require('./routes/liff');
app.use('/api/liff', liffRouter);

// ECPay callback (no admin auth — called by ECPay servers + user browser)
const ecpayRouter = require('./routes/ecpay');
app.use('/api/ecpay', ecpayRouter);   // POST /api/ecpay/callback
app.use('/ecpay',     ecpayRouter);   // GET  /ecpay/result (user return page)

// All other /api/* routes require auth
app.use('/api', authMiddleware);
app.use('/api', adminRouter);

// Serve frontend static files (production build)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback - all non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('[DB] MongoDB connected'))
  .catch((err) => console.error('[DB] MongoDB connection error:', err.message));

// Daily cron at 02:00 - sync unsynced replied messages to Google Sheet
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Running daily Google Sheet sync...');
  try {
    const unsynced = await dbService.getUnsynced();
    if (unsynced.length === 0) {
      console.log('[Cron] No unsynced messages found.');
      return;
    }
    await sheetService.syncAll(unsynced);
    for (const msg of unsynced) {
      await dbService.updateMessage(msg._id, { syncedToSheet: true });
    }
    console.log(`[Cron] Synced ${unsynced.length} messages to Google Sheet.`);
  } catch (err) {
    console.error('[Cron] Sync failed:', err.message);
  }
}, { timezone: 'Asia/Taipei' });

// Start calendar event LINE notification cron job (every minute)
startNotifyJob();

// Start reservation auto-cancel + checkout reminder cron job (every minute)
startReservationReminderJob();

app.listen(PORT, () => {
  console.log(`[Server] Backend running on port ${PORT}`);
});
