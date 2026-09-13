const express = require('express');
const Reservation  = require('../models/Reservation');
const Coupon       = require('../models/Coupon');
const HourPurchase = require('../models/HourPurchase');
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

    // NewebPay v2.0 may wrap fields inside Result object
    const result = tradeData.Result || tradeData;
    const Status          = tradeData.Status || result.Status;
    const MerchantOrderNo = result.MerchantOrderNo;

    console.log(`[NewebPay] notify: Status=${Status}, OrderNo=${MerchantOrderNo}, raw keys=${Object.keys(tradeData).join(',')}`);

    if (!MerchantOrderNo) {
      console.warn('[NewebPay] Missing MerchantOrderNo in tradeData:', JSON.stringify(tradeData));
      return res.send('SUCCESS');
    }

    // Check HourPurchase first (order nos start with 'H'), then Reservation
    const hp = await HourPurchase.findOne({ paymentRef: MerchantOrderNo });
    if (hp) {
      if (Status === 'SUCCESS') {
        if (hp.paymentStatus !== 'paid') {
          hp.paymentStatus = 'paid';
          hp.purchasedAt   = new Date();
          await hp.save();
          console.log(`[NewebPay] HourPurchase confirmed for ${hp._id}`);
        }
      } else {
        if (hp.paymentStatus !== 'paid') {
          hp.paymentRef = '';
          await hp.save();
        }
        console.log(`[NewebPay] HourPurchase payment failed: Status=${Status}, OrderNo=${MerchantOrderNo}`);
      }
      return res.send('SUCCESS');
    }

    const r = await Reservation.findOne({ paymentRef: MerchantOrderNo });
    if (!r) {
      console.warn(`[NewebPay] Reservation not found for paymentRef=${MerchantOrderNo}`);
      return res.send('SUCCESS'); // still 200 so NewebPay doesn't retry forever
    }

    if (Status === 'SUCCESS') {
      if (r.paymentStatus !== 'paid') {
        r.paymentStatus = 'paid';
        r.paidAt        = new Date();
        r.unpaidExit    = false;
        // Keep status as checked_in — cron will archive to completed after 10-min grace.
        // Already-completed (unpaid-exit) records stay completed; no status change needed.
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
// NewebPay may redirect with GET or POST; reservationId/hourPurchaseId is in the query string.
router.all('/result', async (req, res) => {
  const { reservationId, hourPurchaseId, liffId } = req.query;
  let paid = false;
  let mainMsg = '';

  // Give NotifyURL up to 2 seconds to finish processing before checking status
  await new Promise(r => setTimeout(r, 1500));

  if (hourPurchaseId) {
    try {
      const hp = await HourPurchase.findById(hourPurchaseId).lean();
      if (hp) {
        paid    = hp.paymentStatus === 'paid';
        mainMsg = paid
          ? `「${hp.packageName || '時數方案'}」購買成功！時數已加入您的帳戶，感謝使用！`
          : '付款仍在處理中，請稍後至「預約紀錄 → 時數」確認狀態。';
      }
    } catch (_) {}
  } else if (reservationId) {
    try {
      const r = await Reservation.findById(reservationId).lean();
      if (r) {
        paid    = r.paymentStatus === 'paid';
        mainMsg = paid
          ? `您在「${r.venueName || '場地'}」的預約已完成結帳，感謝使用！`
          : '付款仍在處理中，請稍後至「預約紀錄」確認狀態。';
      }
    } catch (_) {}
  }

  if (!mainMsg) {
    mainMsg = paid ? '付款已完成，感謝使用！' : '付款仍在處理中，請稍後確認狀態。';
  }

  const title = paid ? '付款成功！' : '付款結果';
  const icon  = paid ? '✅' : '⏳';

  // Redirect back to LIFF app (reservation system) instead of closing the window
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
