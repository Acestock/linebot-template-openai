const express = require('express');
const Reservation = require('../models/Reservation');
const { verifyCheckMac } = require('../services/ecpayService');

const router = express.Router();

// ── POST /api/ecpay/callback ───────────────────────────────────────────────────
// ECPay server-to-server payment notification (no auth)
router.post('/callback', async (req, res) => {
  try {
    const body = req.body;

    if (!verifyCheckMac(body)) {
      console.warn('[ECPay] CheckMacValue mismatch', body);
      return res.send('0|CheckMacValue Error');
    }

    // RtnCode === '1' means payment succeeded
    if (body.RtnCode === '1') {
      // Find reservation by paymentRef (MerchantTradeNo stored at pay-initiation time)
      const r = await Reservation.findOne({ paymentRef: body.MerchantTradeNo });
      if (r && r.paymentStatus !== 'paid') {
        r.paymentStatus = 'paid';
        r.status = 'completed';
        await r.save();
        console.log(`[ECPay] Payment confirmed for reservation ${r._id}`);
      }
    } else {
      console.log(`[ECPay] Payment failed/pending, RtnCode=${body.RtnCode}, TradeNo=${body.MerchantTradeNo}`);
    }

    res.send('1|OK');
  } catch (err) {
    console.error('[ECPay] Callback error:', err.message);
    res.send('0|' + err.message.slice(0, 50));
  }
});

// ── GET /ecpay/result ─────────────────────────────────────────────────────────
// User browser return page after ECPay payment flow
// (registered at app level as /ecpay/result, not /api/ecpay/result)
router.get('/result', async (req, res) => {
  const { reservationId } = req.query;
  let paid = false;
  let venueName = '';

  if (reservationId) {
    try {
      const r = await Reservation.findById(reservationId).lean();
      if (r) {
        paid = r.paymentStatus === 'paid';
        venueName = r.venueName || '';
      }
    } catch (_) {}
  }

  const title  = paid ? '付款成功！' : '付款結果';
  const icon   = paid ? '✅' : '⏳';
  const msg    = paid
    ? `您在「${venueName || '場地'}」的預約已完成結帳，感謝使用！`
    : '付款處理中，請稍後回 LINE 確認預約狀態。';

  res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans TC',system-ui,sans-serif;background:#f7f7f7;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#fff;border-radius:16px;padding:36px 24px;text-align:center;
          max-width:340px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,.1)}
    .icon{font-size:56px;margin-bottom:16px}
    h2{font-size:20px;font-weight:700;margin-bottom:8px;color:#111}
    p{font-size:14px;color:#666;line-height:1.6;margin-bottom:28px}
    a{display:block;padding:14px;background:#06c755;color:#fff;border-radius:12px;
      text-decoration:none;font-size:15px;font-weight:700}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${msg}</p>
    <a href="javascript:history.back()">返回 LINE App</a>
  </div>
  <script>
    // Auto-navigate back after 5s if user doesn't click
    setTimeout(() => { history.back(); }, 5000);
  </script>
</body>
</html>`);
});

module.exports = router;
