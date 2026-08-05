const express = require('express');
const Reservation = require('../models/Reservation');
const Coupon      = require('../models/Coupon');
const { verifyAndDecrypt } = require('../services/newebpayService');

const router = express.Router();

// ── POST /api/newebpay/notify ─────────────────────────────────────────────────
// Server-to-server payment notification from NewebPay (no admin auth)
router.post('/notify', async (req, res) => {
  try {
    const { valid, tradeData } = verifyAndDecrypt(req.body);
    if (!valid) {
      console.warn('[NewebPay] Invalid notify payload', req.body);
      return res.status(400).send('FAIL');
    }

    const { Status, MerchantOrderNo } = tradeData;
    console.log(`[NewebPay] notify: Status=${Status}, OrderNo=${MerchantOrderNo}`);

    const r = await Reservation.findOne({ paymentRef: MerchantOrderNo });
    if (!r) {
      console.warn(`[NewebPay] Reservation not found for paymentRef=${MerchantOrderNo}`);
      return res.send('SUCCESS'); // still 200 so NewebPay doesn't retry forever
    }

    if (Status === 'SUCCESS') {
      if (r.paymentStatus !== 'paid') {
        r.paymentStatus = 'paid';
        r.status        = 'completed';
        r.unpaidExit    = false;
        await r.save();

        if (r.appliedCouponId) {
          await Coupon.findByIdAndUpdate(r.appliedCouponId, {
            status: 'used', usedAt: new Date(), usedForReservationId: r._id
          });
        }
        console.log(`[NewebPay] Payment confirmed for reservation ${r._id}`);
      }
    } else {
      // Payment failed or cancelled — clear paymentRef so user can retry
      if (r.paymentStatus !== 'paid') {
        r.paymentRef = '';
        await r.save();
      }
      console.log(`[NewebPay] Payment failed: Status=${Status}, OrderNo=${MerchantOrderNo}`);
    }

    res.send('SUCCESS');
  } catch (err) {
    console.error('[NewebPay] Notify error:', err.message);
    res.status(500).send('ERROR');
  }
});

// ── GET|POST /newebpay/result ─────────────────────────────────────────────────
// User browser return page after NewebPay payment flow.
// NewebPay may redirect with GET or POST; reservationId is always in the query string.
router.all('/result', async (req, res) => {
  const { reservationId, liffId } = req.query;
  let paid = false;
  let venueName = '';

  if (reservationId) {
    try {
      const r = await Reservation.findById(reservationId).lean();
      if (r) {
        paid      = r.paymentStatus === 'paid';
        venueName = r.venueName || '';
      }
    } catch (_) {}
  }

  const title   = paid ? '付款成功！' : '付款結果';
  const icon    = paid ? '✅' : '⏳';
  const mainMsg = paid
    ? `您在「${venueName || '場地'}」的預約已完成結帳，感謝使用！`
    : '付款仍在處理中，請稍後至「個人資料 → 預約紀錄」確認狀態。';

  const closeScript = liffId ? `
    <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <script>
      liff.init({ liffId: '${liffId}' })
        .then(() => liff.closeWindow())
        .catch(() => {});
    </script>` : '';

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
          font-size:13px;color:#555;line-height:1.7;margin-bottom:0}
    .arrow{font-size:18px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${mainMsg}</p>
    <div class="hint">
      <div class="arrow">↗</div>
      請點右上角 <strong>✕</strong> 關閉此頁面，<br>回到 LINE 查看預約紀錄
    </div>
  </div>
  ${closeScript}
</body>
</html>`);
});

module.exports = router;
