const Message = require('../models/Message');
const BusinessProfile = require('../models/BusinessProfile');
const { generateReplies } = require('./openaiService');
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
    const bp = await BusinessProfile.findOne().lean();
    if (!bp || !bp.autoReply) return;

    // Check still has pending messages (admin may have already replied)
    const pendingMsgs = await Message.find({ lineUserId, status: 'pending' })
      .sort({ createdAt: 1 })
      .lean();
    if (pendingMsgs.length === 0) return;

    const combinedText = pendingMsgs.length === 1
      ? pendingMsgs[0].userMessage
      : pendingMsgs.map((m, i) => `[訊息${i + 1}] ${m.userMessage}`).join('\n');

    const replies = await generateReplies(combinedText, bp);
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
  } catch (err) {
    console.error('[AutoReply] Error:', err.message);
  }
}

module.exports = { schedule, cancel };
