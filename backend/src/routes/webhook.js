const express = require('express');
const line = require('@line/bot-sdk');
const openaiService = require('../services/openaiService');
const dbService = require('../services/dbService');
const { getUserProfile } = require('../services/lineService');

const router = express.Router();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

// LINE Signature validation middleware (requires raw body)
router.use(line.middleware(lineConfig));

router.post('/', async (req, res) => {
  // Respond 200 immediately - LINE retries on non-200 responses
  res.status(200).send('OK');

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      continue;
    }

    const { replyToken, source, message } = event;
    const lineUserId = source.userId || 'unknown';
    const userMessage = message.text;

    try {
      // Run profile lookup and OpenAI concurrently to reduce latency
      const [profile, aiReplies] = await Promise.all([
        getUserProfile(lineUserId),
        openaiService.generateReplies(userMessage)
      ]);

      await dbService.createMessage({
        lineUserId,
        displayName: profile.displayName || '',
        userMessage,
        replyToken,
        aiReplies,
        status: 'pending'
      });
      console.log(`[Webhook] Message saved from ${profile.displayName || lineUserId}`);
    } catch (err) {
      console.error('[Webhook] Error processing event:', err.message);
      // Save failed record so agents can see it
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
