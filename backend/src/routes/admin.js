const express = require('express');
const dbService = require('../services/dbService');
const { pushMessage } = require('../services/lineService');
const sheetService = require('../services/sheetService');
const BusinessProfile = require('../models/BusinessProfile');
const Template = require('../models/Template');
const Message = require('../models/Message');

const router = express.Router();

// ─── Messages ────────────────────────────────────────────────────────────────

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

    await dbService.updateMessage(req.params.id, { status: 'processing', selectedReply });

    try {
      await pushMessage(msg.lineUserId, selectedReply);

      const updated = await dbService.updateMessage(req.params.id, {
        status: 'replied',
        selectedReply,
        repliedAt: new Date(),
        errorMessage: ''
      });

      sheetService.appendRow(updated).then(() => {
        dbService.updateMessage(req.params.id, { syncedToSheet: true });
      }).catch((err) => {
        console.error('[Admin] Sheet sync failed:', err.message);
      });

      res.json({ success: true, message: updated });
    } catch (lineErr) {
      const errMsg = lineErr.message || 'LINE API error';
      await dbService.updateMessage(req.params.id, { status: 'failed', errorMessage: errMsg });
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

// ─── Customer History ─────────────────────────────────────────────────────────

// GET /api/customers/:lineUserId/history
router.get('/customers/:lineUserId/history', async (req, res) => {
  try {
    const history = await Message.find({ lineUserId: req.params.lineUserId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Business Profile (Settings) ─────────────────────────────────────────────

// GET /api/settings
router.get('/settings', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne();
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/settings', async (req, res) => {
  try {
    const { shopName, industry, products, businessHours, address, faq, toneNote } = req.body;
    const profile = await BusinessProfile.findOneAndUpdate(
      {},
      { shopName, industry, products, businessHours, address, faq, toneNote, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Templates ───────────────────────────────────────────────────────────────

// GET /api/templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await Template.find().sort({ order: 1, createdAt: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates
router.post('/templates', async (req, res) => {
  try {
    const { title, content, order } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
    const template = await Template.create({ title, content, order: order || 0 });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const { title, content, order } = req.body;
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { title, content, order },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
