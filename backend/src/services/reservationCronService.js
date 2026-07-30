const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const { pushMessage } = require('./lineService');

function startReservationReminderJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // ① 自動取消逾時未進場的 confirmed 預約（超過 expectedCheckIn + 30min）
    try {
      const overdueWindow = new Date(now.getTime() - 30 * 60 * 1000);
      await Reservation.updateMany(
        { status: 'confirmed', expectedCheckIn: { $lt: overdueWindow } },
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

    // ③ 超過 expectedCheckOut 30min 仍在 checked_in 且未付款 → 標記 unpaidExit 並完成
    try {
      const overdueCheckout = new Date(now.getTime() - 30 * 60 * 1000);
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

  console.log('[ReservationCron] Reservation reminder job started.');
}

module.exports = { startReservationReminderJob };
