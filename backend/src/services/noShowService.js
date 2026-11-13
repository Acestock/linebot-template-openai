const CustomerSetting = require('../models/CustomerSetting');
const { pushMessage } = require('./lineService');

// 連續（累計）未到達門檻就鎖住預約功能，須私訊客服人工後台解鎖
const LOCK_THRESHOLD = 2;

/**
 * 對一批「超過入場時間 30 分鐘、被系統自動取消」的預約紀錄，
 * 累計每個用戶的未到次數；達到門檻就鎖住預約功能並推播通知。
 * 只有這種「自動取消」才算未到，用戶自己取消或後台手動取消都不算。
 * @param {{lineUserId: string, displayName?: string, pictureUrl?: string, venueName?: string}[]} reservations
 */
async function recordNoShowsAndMaybeLock(reservations) {
  const byUser = new Map();
  for (const r of reservations) {
    if (!byUser.has(r.lineUserId)) byUser.set(r.lineUserId, r);
  }

  for (const [lineUserId, r] of byUser) {
    try {
      const cs = await CustomerSetting.findOneAndUpdate(
        { lineUserId },
        {
          $inc: { noShowCount: 1 },
          $set: { displayName: r.displayName || '', pictureUrl: r.pictureUrl || '' },
          $setOnInsert: { lineUserId }
        },
        { new: true, upsert: true }
      );

      if (cs.noShowCount >= LOCK_THRESHOLD && !cs.bookingLocked) {
        cs.bookingLocked = true;
        cs.lockedAt = new Date();
        await cs.save();
        await pushMessage(lineUserId,
          `⚠️ 您的預約功能已暫時鎖定\n因累計 ${cs.noShowCount} 次預約超過入場時間 30 分鐘未報到、遭系統自動取消，帳號已暫時無法預約。\n請私訊我們的 LINE 官方帳號聯繫工作人員協助解鎖。`
        ).catch(() => {});
      } else {
        await pushMessage(lineUserId,
          `提醒您：您有一筆${r.venueName ? `「${r.venueName}」` : ''}預約已因超過入場時間 30 分鐘未報到，系統自動取消。\n目前累計未到 ${cs.noShowCount} 次，達 ${LOCK_THRESHOLD} 次將暫時無法使用預約功能，請留意報到時間。`
        ).catch(() => {});
      }
    } catch (err) {
      console.error('[NoShowService] Failed for', lineUserId, err.message);
    }
  }
}

module.exports = { recordNoShowsAndMaybeLock, LOCK_THRESHOLD };
