const express = require('express');
const line = require('@line/bot-sdk');
const openaiService = require('../services/openaiService');
const dbService = require('../services/dbService');
const { getUserProfile, pushMessage, pushFlexCard, pushOrderCard } = require('../services/lineService');
const BusinessProfile = require('../models/BusinessProfile');
const Keyword = require('../models/Keyword');
const ProductCard = require('../models/ProductCard');
const CustomerSetting = require('../models/CustomerSetting');
const FAQ = require('../models/FAQ');
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
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
    // Handle order confirmation postback
    if (event.type === 'postback' && event.postback?.data === 'action=order_confirm') {
      try {
        const lineUserId = event.source.userId;
        const [profile, bp, activeItems] = await Promise.all([
          getUserProfile(lineUserId),
          BusinessProfile.findOne().lean(),
          OrderItem.find({ isActive: true }).sort({ order: 1 }).lean()
        ]);
        const displayName = profile.displayName || '';

        // Create order record
        const order = await Order.create({
          lineUserId,
          displayName,
          items: activeItems.map(i => ({ name: i.name, price: i.price, unit: i.unit, quantity: 1 })),
          status: 'new'
        });

        // Confirm to customer
        await pushMessage(lineUserId, `✅ 已收到您的下單請求！\n店家將盡快與您確認品項及數量，感謝您 🙏`);

        // Notify admin via LINE if adminLineUserId is set
        if (bp?.adminLineUserId) {
          const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
          const itemList = activeItems.map(i => `• ${i.name}  ${i.price}${i.unit ? '/' + i.unit : ''}`).join('\n');
          await pushMessage(bp.adminLineUserId,
            `🛒 新訂單通知！\n客戶：${displayName}\n時間：${now}\n\n寄送品項選單：\n${itemList}\n\n請至後台確認訂單詳情並聯繫客戶。`
          );
        }

        sseService.broadcast('new-order', { orderId: order._id, lineUserId });
      } catch (err) {
        console.error('[Webhook] Postback order error:', err.message);
      }
      continue;
    }

    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const { replyToken, source, message } = event;
    const lineUserId = source.userId || 'unknown';
    const userMessage = message.text;

    try {
      const [lineProfile, businessProfile, keywords, faqs] = await Promise.all([
        getUserProfile(lineUserId),
        BusinessProfile.findOne().lean(),
        Keyword.find({ isActive: true }).sort({ order: 1 }).lean(),
        FAQ.find({ isActive: true }).sort({ order: 1 }).lean()
      ]);

      const { replies, urgency, intent, keywordMatch } = await openaiService.analyzeMessage(
        userMessage, businessProfile, keywords, faqs
      );

      // Keyword matched — auto-reply immediately, no admin review needed
      if (keywordMatch && keywordMatch.trigger) {
        const matchedKw = keywords.find(k => k.trigger === keywordMatch.trigger);

        let autoReplySummary = '';
        let sendOk = false;

        if (matchedKw?.replyType === 'card' && matchedKw?.cardIds?.length > 0) {
          // Send Flex Message card(s) as bubble or carousel
          const cards = await ProductCard.find({ _id: { $in: matchedKw.cardIds } }).lean();
          if (cards.length > 0) {
            await pushFlexCard(lineUserId, cards);
            autoReplySummary = `[卡片自動回覆] ${cards.map(c => c.title).join('、')}`;
            sendOk = true;
          }
        }

        if (!sendOk && keywordMatch.reply) {
          // Fall back to text reply
          await pushMessage(lineUserId, keywordMatch.reply);
          autoReplySummary = `[關鍵字自動回覆] ${keywordMatch.reply}`;
          sendOk = true;
        }

        if (sendOk) {
          await dbService.createMessage({
            lineUserId,
            displayName: lineProfile.displayName || '',
            userMessage,
            replyToken,
            aiReplies: replies,
            urgency, intent,
            status: 'replied',
            selectedReply: autoReplySummary,
            repliedAt: new Date()
          });
          console.log(`[Webhook] Keyword matched "${keywordMatch.trigger}" for ${lineProfile.displayName || lineUserId}`);
          sseService.broadcast('new-message', { lineUserId });
          continue;
        }
      }

      await dbService.createMessage({
        lineUserId,
        displayName: lineProfile.displayName || '',
        userMessage,
        replyToken,
        aiReplies: replies,
        urgency, intent,
        status: 'pending'
      });
      console.log(`[Webhook] Saved [${urgency}] message from ${lineProfile.displayName || lineUserId}`);

      // Schedule auto-reply if enabled globally AND not disabled for this user
      if (businessProfile?.autoReply) {
        const userSetting = await CustomerSetting.findOne({ lineUserId }).lean();
        const userAutoReply = userSetting ? userSetting.autoReplyEnabled : true;
        if (userAutoReply) {
          autoReplyService.schedule(lineUserId, businessProfile.autoReplyDelay || 60);
        }
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
