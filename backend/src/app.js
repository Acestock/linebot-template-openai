require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');
const dbService = require('./services/dbService');
const sheetService = require('./services/sheetService');

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

// Admin REST API routes
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

app.listen(PORT, () => {
  console.log(`[Server] Backend running on port ${PORT}`);
});
