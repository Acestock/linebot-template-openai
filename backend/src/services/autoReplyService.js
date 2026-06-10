const Message = require('../models/Message');
const BusinessProfile = require('../models/BusinessProfile');
const FAQ = require('../models/FAQ');
const CalendarEvent = require('../models/CalendarEvent');
const { generateReplies } = require('./openaiService');
const { buildScheduleContext, getUpcomingEvents } = require('./calendarService');
const { pushMessage } = require('./lineService');
const sseService = require('./sseService');

// Per-user debounce timers — reset every time a new message arrives from the same user
const timers = new Map();

function schedule(lineUserId, delaySeconds) {
  if (timers.has(lineUserId)) clearTimeout(timers.get(lineUserId));

  const timer = setTimeout(async () => {
    timers.delete(lineUserId);
    await execute(lineUserId);
  }, delaySeconds * 1000);

  timers.set(lineUserId, timer);
}

function cancel(lineUserId) {
  if (timers.has(lineUserId)) {
    clearTimeout(timers.get(lineUserId));
    timers.delete(lineUserId);
  }
}

async function execute(lineUserId) {
  try {
    // Re-check auto-reply is still enabled
    const [bp, faqs, setting] = await Promise.all([
      BusinessProfile.findOne().lean(),
      FAQ.find({ isActive: true }).sort({ order: 1 }).lean(),
      require('../models/CustomerSetting').findOne({ lineUserId }).lean()
    ]);
    if (!bp || !bp.autoReply) return;
    const conversationSummary = setting?.conversationSummary || '';

    // Build schedule context if appointment reply is enabled
    let scheduleContext = '';
    if (bp.appointmentReplyEnabled) {
      const upcomingEvents = await getUpcomingEvents();
      scheduleContext = buildScheduleContext(bp.workingHours, upcomingEvents);
    }

    // Check still has pending messages (admin may have already replied)
    const pendingMsgs = await Message.find({ lineUserId, status: 'pending' })
      .sort({ createdAt: 1 })
      .lean();
    if (pendingMsgs.length === 0) return;

    // Join messages with a neutral separator — no [訊息N] tags that AI might echo back
    const combinedText = pendingMsgs.map(m => m.userMessage).join('\n---\n');

    // Detect scheduling intent from any pending message
    const hasSchedulingIntent = pendingMsgs.some(m => m.intent === 'scheduling');
    const effectiveIntent = hasSchedulingIntent ? 'scheduling' : 'none';

    const replies = await generateReplies(combinedText, bp, effectiveIntent, faqs, conversationSummary, scheduleContext);
    // Use the 親切 (friendly) version as auto-reply
    const replyText = (replies[1] && replies[1].trim()) ? replies[1] : (replies[0] || '');
    if (!replyText) {
      console.warn('[AutoReply] No reply generated for', lineUserId);
      return;
    }

    await pushMessage(lineUserId, replyText);

    const repliedAt = new Date();
    await Message.updateMany(
      { lineUserId, status: 'pending' },
      { $set: { status: 'replied', selectedReply: `[自動回覆] ${replyText}`, repliedAt } }
    );

    sseService.broadcast('new-message', { lineUserId });
    console.log(`[AutoReply] Sent to ${lineUserId}`);

    // Async: update conversation summary
    (async () => {
      try {
        const { summarizeConversation } = require('./openaiService');
        const CustomerSetting = require('../models/CustomerSetting');
        const recentMsgs = await Message.find({ lineUserId }).sort({ createdAt: -1 }).limit(20).lean();
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
        console.error('[AutoReply] Summary update failed:', e.message);
      }
    })();
  } catch (err) {
    console.error('[AutoReply] Error:', err.message);
  }
}

module.exports = { schedule, cancel };
