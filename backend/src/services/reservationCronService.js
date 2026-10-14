const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const { pushMessage } = require('./lineService');

function startReservationReminderJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // ① 自動取消未進場的 confirmed 預約
    try {
      // 策略一：超過 expectedCheckOut + 30min 仍未入場
      const overdueWindow = new Date(now.getTime() - 30 * 60 * 1000);
      await Reservation.updateMany(
        { strategy: { $ne: 2 }, status: 'confirmed', expectedCheckOut: { $lt: overdueWindow } },
        { $set: { status: 'cancelled' } }
      );
      // 策略二：超過 startTime + 30min 仍未入場（最晚 30 分鐘內報到）
      const s2Overdue = new Date(now.getTime() - 30 * 60 * 1000);
      await Reservation.updateMany(
        { strategy: 2, status: 'confirmed', startTime: { $lt: s2Overdue } },
        { $set: { status: 'cancelled' } }
      );
    } catch (err) {
      console.error('[ReservationCron] Auto-cancel failed:', err.message);
    }

    // ② 對 checked_in 預約在 expectedCheckOut 前 15min 發送 LINE 提醒
    try {
      const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + 16 * 60 * 1000);
      const reservations = await Reservation.find({
        status: 'checked_in',
        expectedCheckOut: { $gte: windowStart, $lte: windowEnd },
        reminderSentAt: null
      });
      for (const r of reservations) {
        await pushMessage(r.lineUserId, `⏰ 提醒您：您在「${r.venueName}」的使用時間快結束了，請準備離場。`);
        r.reminderSentAt = now;
        await r.save();
      }
    } catch (err) {
      console.error('[ReservationCron] Reminder failed:', err.message);
    }

    // ④ 結帳後 10 分鐘寬限：paid + checked_in 超過 10min → 歸檔為 completed
    try {
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      await Reservation.updateMany(
        { status: 'checked_in', paymentStatus: 'paid', paidAt: { $lte: tenMinAgo } },
        { $set: { status: 'completed' } }
      );
    } catch (err) {
      console.error('[ReservationCron] Post-payment archive failed:', err.message);
    }

    // ③ 超過 expectedCheckOut 60min 仍在 checked_in 且未付款 → 標記 unpaidExit 並完成
    try {
      const overdueCheckout = new Date(now.getTime() - 60 * 60 * 1000);
      const overdue = await Reservation.find({
        status: 'checked_in',
        totalPrice: { $gt: 0 },
        paymentStatus: { $ne: 'paid' },
        paymentRef: { $in: ['', null] },   // skip if payment is in-progress
        expectedCheckOut: { $lt: overdueCheckout }
      });
      for (const r of overdue) {
        r.unpaidExit = true;
        r.status = 'completed';
        await r.save();
        console.log(`[ReservationCron] Marked unpaidExit for reservation ${r._id} (${r.displayName})`);
      }
    } catch (err) {
      console.error('[ReservationCron] UnpaidExit detection failed:', err.message);
    }
  }, { timezone: 'Asia/Taipei' });

  // ⑤ 00:15 — 名下有未結帳紀錄（unpaidExit）的用戶，若「今天」還有尚未入場的預約，先發訊提醒
  cron.schedule('15 0 * * *', async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const unpaidUsers = await Reservation.distinct('lineUserId', { unpaidExit: true });
      if (!unpaidUsers.length) return;

      const upcoming = await Reservation.find({
        lineUserId: { $in: unpaidUsers },
        status: 'confirmed',
        $or: [
          { date:      { $gte: todayStart, $lt: todayEnd } },
          { startTime: { $gte: todayStart, $lt: todayEnd } }
        ]
      });

      for (const r of upcoming) {
        await pushMessage(r.lineUserId,
          `⚠️ 提醒您：您有前次使用未完成付款的紀錄，今日（${r.venueName}）的預約將受影響。\n請儘速完成付款，或主動取消今日預約；若於 01:00 前仍未處理，系統將自動取消此筆預約。`
        ).catch(() => {});
      }
    } catch (err) {
      console.error('[ReservationCron] Unpaid-exit reminder failed:', err.message);
    }
  }, { timezone: 'Asia/Taipei' });

  // ⑥ 01:00 — 若仍未處理（未付款 + 今日預約仍是 confirmed），自動取消並通知
  cron.schedule('0 1 * * *', async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const unpaidUsers = await Reservation.distinct('lineUserId', { unpaidExit: true });
      if (!unpaidUsers.length) return;

      const upcoming = await Reservation.find({
        lineUserId: { $in: unpaidUsers },
        status: 'confirmed',
        $or: [
          { date:      { $gte: todayStart, $lt: todayEnd } },
          { startTime: { $gte: todayStart, $lt: todayEnd } }
        ]
      });

      for (const r of upcoming) {
        r.status = 'cancelled';
        await r.save();
        console.log(`[ReservationCron] Auto-cancelled ${r._id} (${r.displayName}) due to prior unpaid exit`);
        await pushMessage(r.lineUserId,
          `❌ 您今日（${r.venueName}）的預約已因前次未完成付款自動取消。請先完成付款後再重新預約。`
        ).catch(() => {});
      }
    } catch (err) {
      console.error('[ReservationCron] Unpaid-exit auto-cancel failed:', err.message);
    }
  }, { timezone: 'Asia/Taipei' });

  console.log('[ReservationCron] Reservation reminder job started.');
}

module.exports = { startReservationReminderJob };
