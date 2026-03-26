const express = require('express');
const line = require('@line/bot-sdk');
const openaiService = require('../services/openaiService');
const dbService = require('../services/dbService');
const { getUserProfile } = require('../services/lineService');
const BusinessProfile = require('../models/BusinessProfile');

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
      // Fetch LINE profile and business profile concurrently
      const [lineProfile, businessProfile] = await Promise.all([
        getUserProfile(lineUserId),
        BusinessProfile.findOne().lean()
      ]);

      // Generate AI replies with business context
      const aiReplies = await openaiService.generateReplies(userMessage, businessProfile);

      await dbService.createMessage({
        lineUserId,
        displayName: lineProfile.displayName || '',
        userMessage,
        replyToken,
        aiReplies,
        status: 'pending'
      });
      console.log(`[Webhook] Message saved from ${lineProfile.displayName || lineUserId}`);
    } catch (err) {
      console.error('[Webhook] Error processing event:', err.message);
      try {
        await dbService.createMessage({
          lineUserId,
          displayName: 'Unknown',
          userMessage,
          replyToken,
          aiReplies: ['', '', ''],
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
