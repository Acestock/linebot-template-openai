const express = require('express');
const Reservation = require('../models/Reservation');
const Coupon = require('../models/Coupon');
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
        r.unpaidExit = false;
        await r.save();
        // Mark applied coupon as used
        if (r.appliedCouponId) {
          await Coupon.findByIdAndUpdate(r.appliedCouponId, {
            status: 'used', usedAt: new Date(), usedForReservationId: r._id
          });
        }
        console.log(`[ECPay] Payment confirmed for reservation ${r._id}`);
      }
    } else {
      // Payment failed/cancelled — clear paymentRef so user can retry and cron can eventually clean up
      try {
        const r = await Reservation.findOne({ paymentRef: body.MerchantTradeNo });
        if (r && r.status === 'checked_in' && r.paymentStatus !== 'paid') {
          r.paymentRef = '';
          await r.save();
        }
      } catch (_) {}
      console.log(`[ECPay] Payment failed/cancelled, RtnCode=${body.RtnCode}, TradeNo=${body.MerchantTradeNo}`);
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
  const { reservationId, liffId } = req.query;
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

  const title   = paid ? '付款成功！' : '付款結果';
  const icon    = paid ? '✅' : '⏳';
  const mainMsg = paid
    ? `您在「${venueName || '場地'}」的預約已完成結帳，感謝使用！`
    : '付款仍在處理中，請稍後至「個人資料 → 預約紀錄」確認狀態。';

  const liffAppUrl = liffId ? `https://liff.line.me/${liffId}` : '';
  const redirectScript = liffAppUrl ? `
    <script>
      setTimeout(() => { window.location.href = '${liffAppUrl}'; }, 2500);
    </script>` : '';

  const backBtn = liffAppUrl
    ? `<a href="${liffAppUrl}" style="display:block;margin-top:20px;padding:13px;background:#06C755;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">回到預約系統</a>`
    : `<div class="hint"><div class="arrow">↗</div>請點右上角 <strong>✕</strong> 關閉此頁面，<br>回到 LINE 查看預約紀錄</div>`;

  const countdownHtml = liffAppUrl
    ? `<p style="color:#aaa;font-size:12px;margin-top:10px;">2.5 秒後自動回到預約系統…</p>`
    : '';

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
    p{font-size:14px;color:#666;line-height:1.6;margin-bottom:12px}
    .hint{background:#f0f0f0;border-radius:10px;padding:12px 14px;
          font-size:13px;color:#555;line-height:1.7}
    .arrow{font-size:18px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${mainMsg}</p>
    ${backBtn}
    ${countdownHtml}
  </div>
  ${redirectScript}
</body>
</html>`);
});

module.exports = router;
