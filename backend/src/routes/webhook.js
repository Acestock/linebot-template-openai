const express = require('express');
const line = require('@line/bot-sdk');
const openaiService = require('../services/openaiService');
const dbService = require('../services/dbService');

const router = express.Router();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

// LINE Signature validation middleware (requires raw body)
router.use(line.middleware(lineConfig));

router.post('/', async (req, res) => {
  res.status(200).send('OK');

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      continue;
    }

    const { replyToken, source, message } = event;
    const lineUserId = source.userId || 'unknown';
    const userMessage = message.text;

    let displayName = '';
    try {
      const client = new line.messagingApi.MessagingApiClient({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
      });
      const profile = await client.getProfile(lineUserId);
      displayName = profile.displayName || '';
    } catch (err) {
      console.error('[Webhook] Failed to get user profile:', err.message);
    }

    let aiReplies = ['', '', ''];
    try {
      aiReplies = await openaiService.generateReplies(userMessage);
    } catch (err) {
      console.error('[Webhook] OpenAI failed, using fallback:', err.message);
    }

    try {
      await dbService.createMessage({
        lineUserId,
        displayName,
        userMessage,
        replyToken,
        aiReplies,
        status: 'pending'
      });
      console.log(`[Webhook] Message saved from ${displayName || lineUserId}`);
    } catch (err) {
      console.error('[Webhook] Failed to save message:', err.message);
    }
  }
});

module.exports = router;
