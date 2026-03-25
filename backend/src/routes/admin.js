const express = require('express');
const dbService = require('../services/dbService');
const lineService = require('../services/lineService');
const sheetService = require('../services/sheetService');

const router = express.Router();

// GET /api/messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await dbService.getMessages();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:id
router.get('/messages/:id', async (req, res) => {
  try {
    const msg = await dbService.getMessageById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:id/send
router.post('/messages/:id/send', async (req, res) => {
  try {
    const { selectedReply } = req.body;
    if (!selectedReply) {
      return res.status(400).json({ error: 'selectedReply is required' });
    }

    const msg = await dbService.getMessageById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (!['pending', 'failed'].includes(msg.status)) {
      return res.status(400).json({ error: `Cannot send message with status: ${msg.status}` });
    }

    // Mark as processing
    await dbService.updateMessage(req.params.id, { status: 'processing', selectedReply });

    try {
      await lineService.sendReply(msg.replyToken, selectedReply);

      const updated = await dbService.updateMessage(req.params.id, {
        status: 'replied',
        selectedReply,
        repliedAt: new Date(),
        errorMessage: ''
      });

      // Async Google Sheets sync
      sheetService.appendRow(updated).then(() => {
        dbService.updateMessage(req.params.id, { syncedToSheet: true });
      }).catch((err) => {
        console.error('[Admin] Sheet sync failed:', err.message);
      });

      res.json({ success: true, message: updated });
    } catch (lineErr) {
      const errMsg = lineErr.message || 'LINE API error';
      await dbService.updateMessage(req.params.id, {
        status: 'failed',
        errorMessage: errMsg
      });
      res.status(502).json({ error: errMsg });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/messages/:id/skip
router.patch('/messages/:id/skip', async (req, res) => {
  try {
    const updated = await dbService.updateMessage(req.params.id, {
      status: 'failed',
      errorMessage: 'Skipped by admin'
    });
    if (!updated) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await dbService.getTodayStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
