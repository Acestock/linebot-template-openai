const Reservation = require('../models/Reservation');

/**
 * 產生策略二的可選起始時間列表
 * @param {string} dateStr  'YYYY-MM-DD' (台北時間)
 * @param {number} openHour  開館整點（e.g. 7 = 07:00）
 * @param {number} closeHour 閉館整點（e.g. 22 = 22:00, 26 = 次日 02:00）
 * @param {number} durationMinutes  方案時長（0 = 整天，自選起始到閉館）
 * @returns {{ startTime: Date, endTime: Date }[]}
 */
function generateStartSlots(dateStr, openHour, closeHour, durationMinutes) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Build TZ-aware timestamps using local Asia/Taipei logic
  // We rely on the server running in UTC; compute explicit offsets
  const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

  // Midnight UTC+8 expressed in UTC
  const midnightUTC = Date.UTC(y, m - 1, d) - TZ_OFFSET_MS;

  const openMs  = openHour  * 60 * 60 * 1000;
  const closeMs = closeHour * 60 * 60 * 1000; // may exceed 24h for late-night closing
  const closeUTC = midnightUTC + closeMs;

  // 臨時入場寬限：超過「完整時長」但入場時間仍在閉館前「時長的一半」內，
  // 允許預約，離場時間截斷為閉館時間，費用仍照方案全額計算（由呼叫端處理）。
  const graceMs = durationMinutes > 0 ? (durationMinutes / 2) * 60 * 1000 : 0;

  const slots = [];
  let curUTC = midnightUTC + openMs;

  while (curUTC < closeUTC) {
    let endUTC;
    let truncated = false;
    if (durationMinutes === 0) {
      // 整天方案：任何時間點入場，結束固定為閉館
      endUTC = closeUTC;
    } else {
      const fullEndUTC = curUTC + durationMinutes * 60 * 1000;
      if (fullEndUTC <= closeUTC) {
        endUTC = fullEndUTC;
      } else if (curUTC + graceMs <= closeUTC) {
        // 寬限區間：實際可用時間不足完整時長，離場時間截斷為閉館
        endUTC = closeUTC;
        truncated = true;
      } else {
        break; // 超出寬限範圍：不顯示
      }
    }

    slots.push({ startTime: new Date(curUTC), endTime: new Date(endUTC), truncated });
    curUTC += 30 * 60 * 1000; // next 30-min slot
  }

  return slots;
}

/**
 * 檢查某段時間內每 30 分鐘區塊的剩餘容量
 * @returns {{ available: boolean, remaining: number }}
 *   remaining = 期間內最小剩餘數
 */
async function checkSlotAvailability(venueId, startTime, endTime, maxCapacity) {
  let minRemaining = maxCapacity;
  let t = new Date(startTime);

  while (t < endTime) {
    const blockEnd = new Date(t.getTime() + 30 * 60 * 1000);
    const count = await Reservation.countDocuments({
      venueId,
      strategy: 2,
      status: { $in: ['confirmed', 'checked_in'] },
      startTime: { $lt: blockEnd },
      endTime:   { $gt: t }
    });
    const rem = maxCapacity - count;
    if (rem < minRemaining) minRemaining = rem;
    if (minRemaining <= 0) return { available: false, remaining: 0 };
    t = blockEnd;
  }

  return { available: true, remaining: minRemaining };
}

/**
 * 取得某天、某方案的所有時段及其可用狀態
 */
async function getAvailableSlots(venueId, dateStr, openHour, closeHour, durationMinutes, maxCapacity) {
  const rawSlots = generateStartSlots(dateStr, openHour, closeHour, durationMinutes);
  const now = new Date();

  const result = await Promise.all(rawSlots.map(async s => {
    const avail = await checkSlotAvailability(venueId, s.startTime, s.endTime, maxCapacity);
    const past  = s.startTime <= now; // 已過時間不可選
    return {
      startTime: s.startTime.toISOString(),
      endTime:   s.endTime.toISOString(),
      startLabel: toHHMM(s.startTime),
      endLabel:   toHHMM(s.endTime),
      available: !past && avail.available,
      remaining: past ? 0 : avail.remaining,
      truncated: !!s.truncated
    };
  }));

  return result;
}

function toHHMM(date) {
  // Display in UTC+8
  const ms  = date.getTime() + 8 * 60 * 60 * 1000;
  const tmp = new Date(ms);
  const h   = tmp.getUTCHours();
  const m   = tmp.getUTCMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = { generateStartSlots, checkSlotAvailability, getAvailableSlots, toHHMM };
