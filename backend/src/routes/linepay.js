const express = require('express');
const Reservation  = require('../models/Reservation');
const Coupon       = require('../models/Coupon');
const DiscountCode = require('../models/DiscountCode');
const { confirmPayment } = require('../services/linepayService');

const router = express.Router();

function resultPage(paid, mainMsg, liffId) {
  const title = paid ? '付款成功！' : '付款結果';
  const icon  = paid ? '✅' : '⏳';

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

  return `<!DOCTYPE html>
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
</html>`;
}

// ── GET|POST /linepay/confirm ──────────────────────────────────────────────────
// LINE Pay 付款完成後，使用者瀏覽器導回此頁；帶 transactionId，由我們自己呼叫
// Confirm API 跟 LINE Pay 確認金額才算真正完成（跟藍新的單次加密 callback 不同，
// LINE Pay 是「Request → 使用者確認 → 導回 → 我們主動 Confirm」兩段式流程）。
router.all('/confirm', async (req, res) => {
  const { transactionId, reservationId, liffId } = { ...req.query, ...req.body };
  let paid = false;
  let mainMsg = '付款處理發生錯誤，請稍後至「預約紀錄」確認狀態。';

  try {
    const r = reservationId ? await Reservation.findById(reservationId) : null;
    if (!r) {
      mainMsg = '找不到此預約紀錄，請至「預約紀錄」確認狀態。';
    } else if (r.paymentStatus === 'paid') {
      // 重複導回（使用者按返回再前進等）：已經付過款，直接顯示成功
      paid = true;
      mainMsg = `您在「${r.venueName || '場地'}」的預約已完成結帳，感謝使用！`;
    } else if (!transactionId) {
      mainMsg = '缺少交易編號，請至「預約紀錄」確認狀態或聯繫客服。';
    } else {
      // 沿用 Request 當下實際送出的金額，不要重新用 totalPrice - discountAmount 算一次——
      // discountAmount 不保證歸零（沒套折扣的付款嘗試不會重設它），重算可能跟 LINE Pay
      // 當初收到的金額對不上，導致 Confirm 回傳 1124 Error in Amount info。
      const effectiveAmount = r.linepayPendingAmount > 0
        ? r.linepayPendingAmount
        : Math.max(1, Math.round(r.totalPrice - (r.discountAmount || 0)));
      const { valid, result } = await confirmPayment(transactionId, effectiveAmount);

      if (valid) {
        r.paymentStatus = 'paid';
        r.paidAt = new Date();
        r.unpaidExit = false;
        r.paymentMethod = 'linepay';
        r.paymentRef = transactionId;
        await r.save();

        if (r.appliedCouponId) {
          await Coupon.findByIdAndUpdate(r.appliedCouponId, {
            status: 'used', usedAt: new Date(), usedForReservationId: r._id
          });
        }
        if (r.appliedDiscountCode) {
          await DiscountCode.updateOne({ code: r.appliedDiscountCode }, { $inc: { usedCount: 1 } });
        }

        paid = true;
        mainMsg = `您在「${r.venueName || '場地'}」的預約已完成結帳，感謝使用！`;
        console.log(`[LINE Pay] Payment confirmed for reservation ${r._id}`);
      } else {
        mainMsg = '付款確認失敗，請稍後再試或聯繫客服。';
        console.warn(`[LINE Pay] Confirm failed for reservation ${reservationId}:`, JSON.stringify(result));
      }
    }
  } catch (err) {
    console.error('[LINE Pay] Confirm error:', err.message);
  }

  res.send(resultPage(paid, mainMsg, liffId));
});

// ── GET|POST /linepay/cancel ───────────────────────────────────────────────────
// 使用者在 LINE Pay 頁面取消付款，導回這裡。預約維持未付款狀態，清掉 paymentRef
// 讓使用者可以重新發起付款。
router.all('/cancel', async (req, res) => {
  const { reservationId, liffId } = { ...req.query, ...req.body };
  try {
    if (reservationId) {
      const r = await Reservation.findById(reservationId);
      if (r && r.paymentStatus !== 'paid') {
        r.paymentRef = '';
        await r.save();
      }
    }
  } catch (err) {
    console.error('[LINE Pay] Cancel error:', err.message);
  }
  res.send(resultPage(false, '付款已取消，您可以重新選擇付款方式。', liffId));
});

module.exports = router;
