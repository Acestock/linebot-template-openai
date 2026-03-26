const express = require('express');
const dbService = require('../services/dbService');
const { pushMessage } = require('../services/lineService');
const sheetService = require('../services/sheetService');
const BusinessProfile = require('../models/BusinessProfile');
const Template = require('../models/Template');
const Keyword = require('../models/Keyword');
const Label = require('../models/Label');
const CustomerLabel = require('../models/CustomerLabel');
const Message = require('../models/Message');
const openaiService = require('../services/openaiService');
const sseService = require('../services/sseService');

const router = express.Router();

// ─── SSE (real-time push) ─────────────────────────────────────────────────────

// GET /api/sse
router.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevent Nginx/Railway buffering
  res.flushHeaders();

  res.write('data: {"type":"connected"}\n\n');
  sseService.addClient(res);

  // heartbeat every 25s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseService.removeClient(res);
  });
});

// ─── Conversations (user-grouped view) ───────────────────────────────────────

// GET /api/conversations
router.get('/conversations', async (req, res) => {
  try {
    const groups = await Message.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$lineUserId',
          displayName: { $last: '$displayName' },
          latestAt: { $last: '$createdAt' },
          statuses: { $push: '$status' },
          allMessages: {
            $push: { _id: '$_id', userMessage: '$userMessage', createdAt: '$createdAt', status: '$status', urgency: '$urgency' }
          },
          lastRepliedMsg: {
            $last: {
              $cond: [{ $eq: ['$status', 'replied'] }, '$selectedReply', null]
            }
          }
        }
      },
      {
        $addFields: {
          lineUserId: '$_id',
          pendingMessages: {
            $filter: {
              input: '$allMessages',
              as: 'm',
              cond: { $eq: ['$$m.status', 'pending'] }
            }
          }
        }
      },
      {
        $addFields: {
          pendingCount: { $size: '$pendingMessages' },
          urgency: {
            $cond: [
              { $in: ['angry', { $map: { input: '$pendingMessages', as: 'pm', in: '$$pm.urgency' } }] },
              'angry',
              { $cond: [
                { $in: ['urgent', { $map: { input: '$pendingMessages', as: 'pm', in: '$$pm.urgency' } }] },
                'urgent',
                'normal'
              ]}
            ]
          },
          status: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: { input: '$statuses', as: 's', cond: { $eq: ['$$s', 'pending'] } }
                    }
                  },
                  0
                ]
              },
              'pending',
              {
                $cond: [
                  {
                    $gt: [
                      {
                        $size: {
                          $filter: { input: '$statuses', as: 's', cond: { $eq: ['$$s', 'processing'] } }
                        }
                      },
                      0
                    ]
                  },
                  'processing',
                  { $arrayElemAt: ['$statuses', -1] }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          sortOrder: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'pending'] }, then: 0 },
                { case: { $eq: ['$status', 'processing'] }, then: 1 },
                { case: { $eq: ['$status', 'failed'] }, then: 2 }
              ],
              default: 3
            }
          }
        }
      },
      { $project: { statuses: 0, allMessages: 0 } },
      // pending first, then by latest message time desc
      { $sort: { sortOrder: 1, latestAt: -1 } }
    ]);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:lineUserId/suggest
router.post('/conversations/:lineUserId/suggest', async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const pendingMsgs = await Message.find({ lineUserId, status: 'pending' })
      .sort({ createdAt: 1 })
      .lean();

    if (pendingMsgs.length === 0) {
      return res.json({ aiReplies: ['', '', ''] });
    }

    const combinedText = pendingMsgs.map(m => m.userMessage).join('\n---\n');

    const bp = await BusinessProfile.findOne().lean();
    const aiReplies = await openaiService.generateReplies(combinedText, bp);
    res.json({ aiReplies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:lineUserId/reply
router.post('/conversations/:lineUserId/reply', async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const { selectedReply } = req.body;
    if (!selectedReply) return res.status(400).json({ error: 'selectedReply is required' });

    const pendingMsgs = await Message.find({ lineUserId, status: { $in: ['pending', 'processing'] } });
    if (pendingMsgs.length === 0) return res.status(400).json({ error: 'No pending messages' });

    await Message.updateMany(
      { lineUserId, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'processing' } }
    );

    try {
      await pushMessage(lineUserId, selectedReply);

      const repliedAt = new Date();
      await Message.updateMany(
        { lineUserId, status: 'processing' },
        { $set: { status: 'replied', selectedReply, repliedAt, errorMessage: '' } }
      );

      // Google Sheet sync: one row per message
      const updatedMsgs = await Message.find({ lineUserId, status: 'replied', repliedAt }).lean();
      for (const msg of updatedMsgs) {
        sheetService.appendRow(msg).then(() => {
          Message.findByIdAndUpdate(msg._id, { syncedToSheet: true }).catch(() => {});
        }).catch((err) => {
          console.error('[Admin] Sheet sync failed:', err.message);
        });
      }

      res.json({ success: true });
    } catch (lineErr) {
      const errMsg = lineErr.message || 'LINE API error';
      await Message.updateMany(
        { lineUserId, status: 'processing' },
        { $set: { status: 'failed', errorMessage: errMsg } }
      );
      res.status(502).json({ error: errMsg });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/conversations/:lineUserId/skip
router.patch('/conversations/:lineUserId/skip', async (req, res) => {
  try {
    const { lineUserId } = req.params;
    await Message.updateMany(
      { lineUserId, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'failed', errorMessage: 'Skipped by admin' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ─── Labels ──────────────────────────────────────────────────────────────────

// GET /api/labels
router.get('/labels', async (req, res) => {
  try {
    res.json(await Label.find().sort({ createdAt: 1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/labels
router.post('/labels', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await Label.create({ name, color: color || '#2196F3' }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/labels/:id
router.put('/labels/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const label = await Label.findByIdAndUpdate(req.params.id, { name, color }, { new: true });
    if (!label) return res.status(404).json({ error: 'Label not found' });
    res.json(label);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/labels/:id  — also remove from all customer assignments
router.delete('/labels/:id', async (req, res) => {
  try {
    await Label.findByIdAndDelete(req.params.id);
    await CustomerLabel.updateMany({}, { $pull: { labelIds: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Customer Labels ──────────────────────────────────────────────────────────

// GET /api/customers/labels  — bulk map: { [lineUserId]: [labelObj, ...] }
// MUST be before /customers/:lineUserId/* routes
router.get('/customers/labels', async (req, res) => {
  try {
    const assignments = await CustomerLabel.find().populate('labelIds').lean();
    const map = {};
    for (const a of assignments) {
      map[a.lineUserId] = a.labelIds.filter(Boolean);
    }
    res.json(map);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/customers/:lineUserId/labels  — set label list for one customer
router.patch('/customers/:lineUserId/labels', async (req, res) => {
  try {
    const { labelIds } = req.body;
    const doc = await CustomerLabel.findOneAndUpdate(
      { lineUserId: req.params.lineUserId },
      { labelIds: labelIds || [] },
      { upsert: true, new: true }
    ).populate('labelIds');
    res.json(doc.labelIds.filter(Boolean));
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    const { shopName, industry, products, businessHours, address, faq, toneNote, autoReply, autoReplyDelay } = req.body;
    const profile = await BusinessProfile.findOneAndUpdate(
      {},
      { shopName, industry, products, businessHours, address, faq, toneNote, autoReply, autoReplyDelay, updatedAt: new Date() },
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

// ─── Keywords ────────────────────────────────────────────────────────────────

// GET /api/keywords
router.get('/keywords', async (req, res) => {
  try {
    const keywords = await Keyword.find().sort({ order: 1, createdAt: 1 });
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/keywords
router.post('/keywords', async (req, res) => {
  try {
    const { trigger, reply, isActive, order } = req.body;
    if (!trigger || !reply) return res.status(400).json({ error: 'trigger and reply are required' });
    const kw = await Keyword.create({ trigger, reply, isActive: isActive !== false, order: order || 0 });
    res.status(201).json(kw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/keywords/:id
router.put('/keywords/:id', async (req, res) => {
  try {
    const { trigger, reply, isActive, order } = req.body;
    const kw = await Keyword.findByIdAndUpdate(
      req.params.id,
      { trigger, reply, isActive, order },
      { new: true }
    );
    if (!kw) return res.status(404).json({ error: 'Keyword not found' });
    res.json(kw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/keywords/:id
router.delete('/keywords/:id', async (req, res) => {
  try {
    const kw = await Keyword.findByIdAndDelete(req.params.id);
    if (!kw) return res.status(404).json({ error: 'Keyword not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
