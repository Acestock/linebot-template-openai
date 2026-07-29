const express = require('express');
const dbService = require('../services/dbService');
const {
  pushMessage, pushOrderCard,
  getRichMenuTemplates, createRichMenu, createRichMenuRaw, listRichMenus,
  deleteRichMenuById, setDefaultRichMenuById, cancelDefaultRichMenuAll,
  getRichMenu, getDefaultRichMenuId,
  uploadRichMenuImageFromUrl, getRichMenuImageBuffer
} = require('../services/lineService');
const sheetService = require('../services/sheetService');
const BusinessProfile = require('../models/BusinessProfile');
const Template = require('../models/Template');
const Keyword = require('../models/Keyword');
const ProductCard = require('../models/ProductCard');
const Label = require('../models/Label');
const CustomerLabel = require('../models/CustomerLabel');
const FAQ = require('../models/FAQ');
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const CalendarEvent = require('../models/CalendarEvent');
const CustomerSetting = require('../models/CustomerSetting');
const Message = require('../models/Message');
const AIUsageLog = require('../models/AIUsageLog');
const openaiService = require('../services/openaiService');
const { summarizeConversation } = openaiService;
const sseService = require('../services/sseService');
const autoReplyService = require('../services/autoReplyService');
const { buildScheduleContext, getUpcomingEvents } = require('../services/calendarService');

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
            $push: { _id: '$_id', userMessage: '$userMessage', createdAt: '$createdAt', status: '$status', urgency: '$urgency', intent: '$intent' }
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
          intent: {
            $cond: [
              { $in: ['purchase', { $map: { input: '$pendingMessages', as: 'pm', in: '$$pm.intent' } }] },
              'purchase',
              'none'
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
      { $sort: { sortOrder: 1, latestAt: -1 } },
      // Join per-user auto-reply setting
      {
        $lookup: {
          from: 'customersettings',
          localField: 'lineUserId',
          foreignField: 'lineUserId',
          as: 'settingArr'
        }
      },
      {
        $addFields: {
          autoReplyEnabled: {
            $cond: [
              { $gt: [{ $size: '$settingArr' }, 0] },
              { $arrayElemAt: ['$settingArr.autoReplyEnabled', 0] },
              true
            ]
          }
        }
      },
      { $project: { settingArr: 0 } }
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
    const hasPurchaseIntent = pendingMsgs.some(m => m.intent === 'purchase');
    const hasSchedulingIntent = pendingMsgs.some(m => m.intent === 'scheduling');
    const effectiveIntent = hasPurchaseIntent ? 'purchase' : hasSchedulingIntent ? 'scheduling' : 'none';

    const [bp, faqs, setting] = await Promise.all([
      BusinessProfile.findOne().lean(),
      FAQ.find({ isActive: true }).sort({ order: 1 }).lean(),
      CustomerSetting.findOne({ lineUserId }).lean()
    ]);
    const conversationSummary = setting?.conversationSummary || '';

    let scheduleContext = '';
    if (hasSchedulingIntent && bp?.appointmentReplyEnabled) {
      const upcomingEvents = await getUpcomingEvents();
      scheduleContext = buildScheduleContext(bp.workingHours, upcomingEvents);
    }

    const aiReplies = await openaiService.generateReplies(
      combinedText, bp, effectiveIntent, faqs, conversationSummary, scheduleContext
    );
    res.json({ aiReplies, intent: effectiveIntent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:lineUserId/reply
router.post('/conversations/:lineUserId/reply', async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const { selectedReply } = req.body;
    // Cancel any pending auto-reply timer so it doesn't send a duplicate
    autoReplyService.cancel(lineUserId);
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

      // Google Sheet sync: append a row for each replied message, grouped by customer
      const updatedMsgs = await Message.find({ lineUserId, status: 'replied', repliedAt }).lean();
      for (const msg of updatedMsgs) {
        sheetService.appendCustomerRow(msg).then(() => {
          Message.findByIdAndUpdate(msg._id, { syncedToSheet: true }).catch(() => {});
        }).catch((err) => {
          console.error('[Admin] Sheet sync failed:', err.message);
        });
      }

      res.json({ success: true });

      // Async: update conversation summary (do not block response)
      (async () => {
        try {
          const recentMsgs = await Message.find({ lineUserId })
            .sort({ createdAt: -1 }).limit(20).lean();
          const displayName = recentMsgs[0]?.displayName || '';
          const existing = await CustomerSetting.findOne({ lineUserId }).lean();
          const newSummary = await summarizeConversation(
            recentMsgs.reverse(), existing?.conversationSummary || '', displayName
          );
          await CustomerSetting.findOneAndUpdate(
            { lineUserId },
            { conversationSummary: newSummary, summaryUpdatedAt: new Date() },
            { upsert: true }
          );
        } catch (e) {
          console.error('[Admin] Summary update failed:', e.message);
        }
      })();
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

      sheetService.appendCustomerRow(updated).then(() => {
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

// ─── Order Items (品項目錄) ───────────────────────────────────────────────────

router.get('/order-items', async (req, res) => {
  try { res.json(await OrderItem.find().sort({ order: 1, createdAt: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/order-items', async (req, res) => {
  try {
    const { name, description, price, unit, order } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price required' });
    res.status(201).json(await OrderItem.create({ name, description, price, unit, order: order || 0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/order-items/:id', async (req, res) => {
  try {
    const { name, description, price, unit, isActive, order } = req.body;
    const item = await OrderItem.findByIdAndUpdate(
      req.params.id, { name, description, price, unit, isActive, order }, { new: true }
    );
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/order-items/:id', async (req, res) => {
  try {
    await OrderItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders/send-card — send order card to a customer (MUST be before /orders/:id)
router.post('/orders/send-card', async (req, res) => {
  try {
    const { lineUserId } = req.body;
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId required' });
    const [items, bp] = await Promise.all([
      OrderItem.find({ isActive: true }).sort({ order: 1 }).lean(),
      BusinessProfile.findOne().lean()
    ]);
    if (items.length === 0) return res.status(400).json({ error: '尚未設定任何品項，請先至設定新增' });
    await pushOrderCard(lineUserId, items, bp?.shopName || '');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Orders (訂單管理) ────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    res.json(await Order.find(filter).sort({ createdAt: -1 }).limit(200));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/orders/:id', async (req, res) => {
  try {
    const { status, note, items } = req.body;
    const update = {};
    if (status) update.status = status;
    if (note !== undefined) update.note = note;
    if (items) update.items = items;
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ error: 'not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FAQ ─────────────────────────────────────────────────────────────────────

// GET /api/faqs
router.get('/faqs', async (req, res) => {
  try {
    res.json(await FAQ.find().sort({ order: 1, createdAt: 1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/faqs
router.post('/faqs', async (req, res) => {
  try {
    const { question, answer, order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
    res.status(201).json(await FAQ.create({ question, answer, order: order || 0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/faqs/:id
router.put('/faqs/:id', async (req, res) => {
  try {
    const { question, answer, isActive, order } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id, { question, answer, isActive, order }, { new: true }
    );
    if (!faq) return res.status(404).json({ error: 'not found' });
    res.json(faq);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/faqs/:id
router.delete('/faqs/:id', async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

// POST /api/customers/broadcast  — send message to all users with a specific label
// MUST be before /customers/:lineUserId/* routes
router.post('/customers/broadcast', async (req, res) => {
  try {
    const { labelId, message } = req.body;
    if (!labelId || !message || !message.trim()) {
      return res.status(400).json({ error: 'labelId and message are required' });
    }

    // Find all customers with this label
    const assignments = await CustomerLabel.find({ labelIds: labelId }).lean();
    if (assignments.length === 0) {
      return res.json({ sent: 0, failed: 0, total: 0 });
    }

    // Get latest displayName for each user from Message history
    const lineUserIds = assignments.map(a => a.lineUserId);
    const latestMsgs = await Message.aggregate([
      { $match: { lineUserId: { $in: lineUserIds }, displayName: { $exists: true, $ne: '' } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$lineUserId', displayName: { $first: '$displayName' } } }
    ]);
    const nameMap = {};
    for (const m of latestMsgs) nameMap[m._id] = m.displayName;

    let sent = 0;
    let failed = 0;
    const now = new Date();

    for (const a of assignments) {
      try {
        await pushMessage(a.lineUserId, message.trim());
        await Message.create({
          lineUserId: a.lineUserId,
          displayName: nameMap[a.lineUserId] || '',
          userMessage: '',
          replyToken: '',
          aiReplies: [],
          isProactive: true,
          selectedReply: message.trim(),
          status: 'replied',
          repliedAt: now
        });
        sseService.broadcast('new-message', { lineUserId: a.lineUserId });
        sent++;
      } catch {
        failed++;
      }
    }

    res.json({ sent, failed, total: assignments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/push  — proactive message from admin to customer
// MUST be before /customers/:lineUserId/* routes
router.post('/customers/push', async (req, res) => {
  try {
    const { lineUserId, message, displayName } = req.body;
    if (!lineUserId || !message || !message.trim()) {
      return res.status(400).json({ error: 'lineUserId and message are required' });
    }

    await pushMessage(lineUserId, message.trim());

    await Message.create({
      lineUserId,
      displayName: displayName || '',
      userMessage: '',
      replyToken: '',
      aiReplies: [],
      isProactive: true,
      selectedReply: message.trim(),
      status: 'replied',
      repliedAt: new Date()
    });

    sseService.broadcast('new-message', { lineUserId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/customers/autoreply  — toggle per-user auto-reply
// MUST be before /customers/:lineUserId/* routes
router.patch('/customers/autoreply', async (req, res) => {
  try {
    const { lineUserId, enabled } = req.body;
    if (!lineUserId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'lineUserId and enabled (boolean) are required' });
    }
    await CustomerSetting.findOneAndUpdate(
      { lineUserId },
      { $set: { autoReplyEnabled: enabled } },
      { upsert: true, new: true }
    );
    res.json({ success: true, autoReplyEnabled: enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:lineUserId/summary
router.get('/customers/:lineUserId/summary', async (req, res) => {
  try {
    const setting = await CustomerSetting.findOne({ lineUserId: req.params.lineUserId }).lean();
    res.json({
      conversationSummary: setting?.conversationSummary || '',
      summaryUpdatedAt: setting?.summaryUpdatedAt || null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/customers/:lineUserId/summary — manual edit or clear
router.patch('/customers/:lineUserId/summary', async (req, res) => {
  try {
    const { conversationSummary } = req.body;
    await CustomerSetting.findOneAndUpdate(
      { lineUserId: req.params.lineUserId },
      { conversationSummary: conversationSummary || '', summaryUpdatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    const { shopName, industry, products, businessHours, address, faq, toneNote, autoReply, autoReplyDelay, adminLineUserId, liffTitle } = req.body;
    const profile = await BusinessProfile.findOneAndUpdate(
      {},
      { shopName, industry, products, businessHours, address, faq, toneNote, autoReply, autoReplyDelay, adminLineUserId, liffTitle, updatedAt: new Date() },
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
    const { trigger, replyType, reply, cardIds, isActive, order } = req.body;
    if (!trigger) return res.status(400).json({ error: 'trigger is required' });
    if (replyType === 'card' && (!cardIds || cardIds.length === 0)) return res.status(400).json({ error: 'at least one cardId is required for card type' });
    if (replyType !== 'card' && !reply) return res.status(400).json({ error: 'reply is required for text type' });
    const kw = await Keyword.create({
      trigger, replyType: replyType || 'text', reply: reply || '',
      cardIds: cardIds || [], isActive: isActive !== false, order: order || 0
    });
    res.status(201).json(kw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/keywords/:id
router.put('/keywords/:id', async (req, res) => {
  try {
    const { trigger, replyType, reply, cardIds, isActive, order } = req.body;
    const kw = await Keyword.findByIdAndUpdate(
      req.params.id,
      { trigger, replyType: replyType || 'text', reply: reply || '', cardIds: cardIds || [], isActive, order },
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

// ─── Product Cards ────────────────────────────────────────────────────────────

// GET /api/cards
router.get('/cards', async (req, res) => {
  try {
    res.json(await ProductCard.find().sort({ createdAt: 1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cards
router.post('/cards', async (req, res) => {
  try {
    const { title, subtitle, imageUrl, priceItems, buttonText, buttonUrl,
            headerBgColor, titleColor, subtitleColor, buttonColor, bodyBgColor,
            template, titleFontSize, subtitleFontSize, priceNameFontSize, priceFontSize,
            titleAlign, subtitleAlign, priceAlign, showDivider, isActive } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const card = await ProductCard.create({
      title, subtitle: subtitle || '', imageUrl: imageUrl || '',
      priceItems: priceItems || [], buttonText: buttonText || '', buttonUrl: buttonUrl || '',
      headerBgColor: headerBgColor || '#ffffff', titleColor: titleColor || '#111111',
      subtitleColor: subtitleColor || '#888888', buttonColor: buttonColor || '#00B900',
      bodyBgColor: bodyBgColor || '#ffffff',
      template: template || 'classic',
      titleFontSize: titleFontSize || 'xl', subtitleFontSize: subtitleFontSize || 'sm',
      priceNameFontSize: priceNameFontSize || 'sm', priceFontSize: priceFontSize || 'sm',
      titleAlign: titleAlign || 'center', subtitleAlign: subtitleAlign || 'center',
      priceAlign: priceAlign || 'start', showDivider: showDivider !== false,
      isActive: isActive !== false
    });
    res.status(201).json(card);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cards/:id
router.put('/cards/:id', async (req, res) => {
  try {
    const { title, subtitle, imageUrl, priceItems, buttonText, buttonUrl,
            headerBgColor, titleColor, subtitleColor, buttonColor, bodyBgColor,
            template, titleFontSize, subtitleFontSize, priceNameFontSize, priceFontSize,
            titleAlign, subtitleAlign, priceAlign, showDivider, isActive } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const card = await ProductCard.findByIdAndUpdate(
      req.params.id,
      { title, subtitle, imageUrl, priceItems, buttonText, buttonUrl,
        headerBgColor, titleColor, subtitleColor, buttonColor, bodyBgColor,
        template, titleFontSize, subtitleFontSize, priceNameFontSize, priceFontSize,
        titleAlign, subtitleAlign, priceAlign, showDivider, isActive },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cards/:id  — also remove from all keyword cardIds arrays
router.delete('/cards/:id', async (req, res) => {
  try {
    await ProductCard.findByIdAndDelete(req.params.id);
    // Remove from cardIds arrays; if array becomes empty, reset to text type
    await Keyword.updateMany({ cardIds: req.params.id }, { $pull: { cardIds: req.params.id } });
    await Keyword.updateMany({ cardIds: { $size: 0 }, replyType: 'card' }, { $set: { replyType: 'text' } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Calendar ─────────────────────────────────────────────────────────────────

// GET /api/calendar/events?start=ISO&end=ISO
router.get('/calendar/events', async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start || end) {
      filter.startDateTime = {};
      if (start) filter.startDateTime.$gte = new Date(start);
      if (end)   filter.startDateTime.$lte = new Date(end);
    }
    const events = await CalendarEvent.find(filter).sort({ startDateTime: 1 }).lean();
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/calendar/events
router.post('/calendar/events', async (req, res) => {
  try {
    const { title, description, startDateTime, endDateTime, isAllDay, type, color, notifyLineUserId, notifyMinutesBefore } = req.body;
    if (!title || !startDateTime || !endDateTime) return res.status(400).json({ error: '標題與時間為必填' });
    const event = await CalendarEvent.create({
      title, description, startDateTime, endDateTime, isAllDay, type, color, notifyLineUserId, notifyMinutesBefore
    });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/calendar/events/:id
router.put('/calendar/events/:id', async (req, res) => {
  try {
    const { title, description, startDateTime, endDateTime, isAllDay, type, color, notifyLineUserId, notifyMinutesBefore } = req.body;
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { title, description, startDateTime, endDateTime, isAllDay, type, color, notifyLineUserId, notifyMinutesBefore, notified: false },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/calendar/events/:id
router.delete('/calendar/events/:id', async (req, res) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/calendar/working-hours  — returns full bp (workingHours + appointmentReplyEnabled)
router.get('/calendar/working-hours', async (req, res) => {
  try {
    const bp = await BusinessProfile.findOne().lean();
    res.json({
      workingHours: bp?.workingHours || {},
      appointmentReplyEnabled: bp?.appointmentReplyEnabled || false
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/calendar/working-hours
router.put('/calendar/working-hours', async (req, res) => {
  try {
    const { workingHours, appointmentReplyEnabled } = req.body;
    await BusinessProfile.findOneAndUpdate(
      {},
      { $set: { workingHours, appointmentReplyEnabled } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Usage Stats ──────────────────────────────────────────────────────────

// GET /api/ai-usage?days=30
router.get('/ai-usage', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await AIUsageLog.find({ createdAt: { $gte: since } }).lean();

    const totalCost   = logs.reduce((s, l) => s + l.estimatedCostUSD, 0);
    const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0);
    const totalCalls  = logs.length;

    const byType = {};
    for (const log of logs) {
      if (!byType[log.type]) byType[log.type] = { calls: 0, tokens: 0, costUSD: 0 };
      byType[log.type].calls++;
      byType[log.type].tokens  += log.totalTokens;
      byType[log.type].costUSD += log.estimatedCostUSD;
    }

    // Daily breakdown — last N days
    const daily = {};
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { calls: 0, costUSD: 0 };
      daily[day].calls++;
      daily[day].costUSD += log.estimatedCostUSD;
    }

    // All-time totals
    const allLogs = await AIUsageLog.find().lean();
    const allTimeCost = allLogs.reduce((s, l) => s + l.estimatedCostUSD, 0);

    res.json({ totalCalls, totalTokens, totalCost, byType, daily, days, allTimeCost });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Rich Menu ───────────────────────────────────────────────────────────────

// GET /api/rich-menu/templates
router.get('/rich-menu/templates', (req, res) => {
  res.json(getRichMenuTemplates());
});

// GET /api/rich-menu/list
router.get('/rich-menu/list', async (req, res) => {
  try {
    const menus = await listRichMenus();
    res.json(menus);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/rich-menu/create
router.post('/rich-menu/create', async (req, res) => {
  try {
    const { templateKey, buttons, chatBarText } = req.body;
    if (!templateKey || !buttons) return res.status(400).json({ error: 'templateKey and buttons required' });
    const richMenuId = await createRichMenu({ templateKey, buttons, chatBarText });
    res.json({ richMenuId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/rich-menu/:id/image — proxy LINE rich menu image (requires auth via token query param for <img> tags)
router.get('/rich-menu/:id/image', async (req, res) => {
  try {
    const { buffer, contentType } = await getRichMenuImageBuffer(req.params.id);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (err) {
    res.status(404).json({ error: 'Image not found' });
  }
});

// POST /api/rich-menu/:id/upload-image — upload image from URL
router.post('/rich-menu/:id/upload-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });
    await uploadRichMenuImageFromUrl(req.params.id, imageUrl);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/rich-menu/:id/set-default
router.post('/rich-menu/:id/set-default', async (req, res) => {
  try {
    await setDefaultRichMenuById(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/rich-menu/default
router.delete('/rich-menu/default', async (req, res) => {
  try {
    await cancelDefaultRichMenuAll();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/rich-menu/:id
router.delete('/rich-menu/:id', async (req, res) => {
  try {
    await deleteRichMenuById(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/rich-menu/:id/detail — fetch single rich menu definition
router.get('/rich-menu/:id/detail', async (req, res) => {
  try {
    const menu = await getRichMenu(req.params.id);
    res.json(menu);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/rich-menu/:id — update button actions (delete old → recreate with same layout)
router.put('/rich-menu/:id', async (req, res) => {
  try {
    const { buttons, chatBarText } = req.body;
    if (!buttons || !Array.isArray(buttons)) return res.status(400).json({ error: 'buttons array required' });

    const existing = await getRichMenu(req.params.id);
    const defaultId = await getDefaultRichMenuId();
    const wasDefault = defaultId === req.params.id;

    const newAreas = existing.areas.map((area, i) => {
      const btn = buttons[i] || {};
      let action;
      if (btn.actionType === 'message') {
        action = { type: 'message', label: btn.label || `按鈕${i + 1}`, text: btn.text || btn.label || `按鈕${i + 1}` };
      } else if (btn.actionType === 'postback') {
        action = { type: 'postback', label: btn.label || `按鈕${i + 1}`, data: btn.data || 'action=none', displayText: btn.label || `按鈕${i + 1}` };
      } else {
        action = { type: 'uri', label: btn.label || `按鈕${i + 1}`, uri: btn.uri || 'https://line.me' };
      }
      return { bounds: area.bounds, action };
    });

    await deleteRichMenuById(req.params.id);

    const newId = await createRichMenuRaw({
      size: existing.size,
      selected: true,
      name: chatBarText || existing.chatBarText || '選單',
      chatBarText: chatBarText || existing.chatBarText || '選單',
      areas: newAreas
    });

    if (wasDefault) {
      try { await setDefaultRichMenuById(newId); } catch {}
    }

    res.json({ richMenuId: newId, wasDefault });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Venues ──────────────────────────────────────────────────────────────────
const Venue        = require('../models/Venue');
const VenuePlan    = require('../models/VenuePlan');
const Announcement = require('../models/Announcement');
const Reservation  = require('../models/Reservation');

router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(venues);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/venues', async (req, res) => {
  try {
    const venue = await Venue.create(req.body);
    res.json(venue);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!venue) return res.status(404).json({ error: 'Not found' });
    res.json(venue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/venues/:id', async (req, res) => {
  try {
    await Venue.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Venue Plans ──────────────────────────────────────────────────────────────
router.get('/venues/:venueId/plans', async (req, res) => {
  try {
    const plans = await VenuePlan.find({ venueId: req.params.venueId }).sort({ order: 1 }).lean();
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/venues/:venueId/plans', async (req, res) => {
  try {
    const plan = await VenuePlan.create({ ...req.body, venueId: req.params.venueId });
    res.json(plan);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/venues/:venueId/plans/:planId', async (req, res) => {
  try {
    const plan = await VenuePlan.findOneAndUpdate(
      { _id: req.params.planId, venueId: req.params.venueId }, req.body, { new: true }
    );
    if (!plan) return res.status(404).json({ error: 'Not found' });
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/venues/:venueId/plans/:planId', async (req, res) => {
  try {
    await VenuePlan.findOneAndDelete({ _id: req.params.planId, venueId: req.params.venueId });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Announcements ────────────────────────────────────────────────────────────
router.get('/announcements', async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/announcements', async (req, res) => {
  try {
    const item = await Announcement.create(req.body);
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/announcements/:id', async (req, res) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Reservation Admin ────────────────────────────────────────────────────────
router.get('/reservations', async (req, res) => {
  try {
    const filter = {};
    if (req.query.venue)  filter.venueId = req.query.venue;
    if (req.query.status) filter.status  = req.query.status;
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 24 * 60 * 60 * 1000) };
    }
    const items = await Reservation.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/reservations/:id', async (req, res) => {
  try {
    const item = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
