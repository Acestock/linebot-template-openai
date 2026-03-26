const express = require('express');
const line = require('@line/bot-sdk');
const openaiService = require('../services/openaiService');
const dbService = require('../services/dbService');
const { getUserProfile, pushMessage } = require('../services/lineService');
const BusinessProfile = require('../models/BusinessProfile');
const Keyword = require('../models/Keyword');
const sseService = require('../services/sseService');
const autoReplyService = require('../services/autoReplyService');

const router = express.Router();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

router.use(line.middleware(lineConfig));

router.post('/', async (req, res) => {
  res.status(200).send('OK');

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const { replyToken, source, message } = event;
    const lineUserId = source.userId || 'unknown';
    const userMessage = message.text;

    try {
      const [lineProfile, businessProfile, keywords] = await Promise.all([
        getUserProfile(lineUserId),
        BusinessProfile.findOne().lean(),
        Keyword.find({ isActive: true }).sort({ order: 1 }).lean()
      ]);

      const { replies, urgency, keywordMatch } = await openaiService.analyzeMessage(
        userMessage, businessProfile, keywords
      );

      // Keyword matched — auto-reply immediately, no admin review needed
      if (keywordMatch && keywordMatch.reply) {
        await pushMessage(lineUserId, keywordMatch.reply);
        await dbService.createMessage({
          lineUserId,
          displayName: lineProfile.displayName || '',
          userMessage,
          replyToken,
          aiReplies: replies,
          urgency,
          status: 'replied',
          selectedReply: `[關鍵字自動回覆] ${keywordMatch.reply}`,
          repliedAt: new Date()
        });
        console.log(`[Webhook] Keyword matched "${keywordMatch.trigger}" for ${lineProfile.displayName || lineUserId}`);
        sseService.broadcast('new-message', { lineUserId });
        continue;
      }

      await dbService.createMessage({
        lineUserId,
        displayName: lineProfile.displayName || '',
        userMessage,
        replyToken,
        aiReplies: replies,
        urgency,
        status: 'pending'
      });
      console.log(`[Webhook] Saved [${urgency}] message from ${lineProfile.displayName || lineUserId}`);

      // Schedule auto-reply if enabled (resets timer for segmented messages)
      if (businessProfile?.autoReply) {
        autoReplyService.schedule(lineUserId, businessProfile.autoReplyDelay || 60);
      }

      sseService.broadcast('new-message', { lineUserId });
    } catch (err) {
      console.error('[Webhook] Error processing event:', err.message);
      try {
        await dbService.createMessage({
          lineUserId,
          displayName: 'Unknown',
          userMessage,
          replyToken,
          aiReplies: ['', '', ''],
          urgency: 'normal',
          status: 'failed',
          errorMessage: err.message
        });
      } catch (dbErr) {
        console.error('[Webhook] Failed to save error record:', dbErr.message);
      }
    }
  }
});

module.exports = router;
