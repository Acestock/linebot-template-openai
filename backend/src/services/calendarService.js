const cron = require('node-cron');
const CalendarEvent = require('../models/CalendarEvent');
const { pushMessage } = require('./lineService');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES_CN = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

// Format working hours + upcoming events into a natural language context string for AI
function buildScheduleContext(workingHours, upcomingEvents = []) {
  const lines = ['【可預約時間資訊】'];

  if (workingHours) {
    lines.push('每週固定上班時間：');
    DAY_KEYS.forEach((key, i) => {
      const wh = workingHours[key];
      if (wh?.enabled) {
        lines.push(`  ${DAY_NAMES_CN[i]}：${wh.start}–${wh.end}`);
      } else if (wh) {
        lines.push(`  ${DAY_NAMES_CN[i]}：休息`);
      }
    });
  }

  if (upcomingEvents.length > 0) {
    lines.push('近兩週已排定／封鎖時段：');
    upcomingEvents.forEach(e => {
      const start = new Date(e.startDateTime).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const label = e.type === 'blocked' ? '不可預約' : '已排定';
      lines.push(`  ${start}：${e.title}（${e.isAllDay ? '全天' : label}）`);
    });
  }

  lines.push('請根據以上資訊回答客戶的預約時間詢問，若有空檔請告知，若已滿或非上班時間請說明並提供替代方案。');
  return lines.join('\n');
}

// Fetch upcoming events within next 14 days
async function getUpcomingEvents() {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return CalendarEvent.find({
    startDateTime: { $gte: now, $lte: twoWeeks }
  }).sort({ startDateTime: 1 }).lean();
}

// Start cron job: every minute, check for events needing LINE notification
function startNotifyJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const events = await CalendarEvent.find({
        notifyMinutesBefore: { $gt: 0 },
        notified: false,
        notifyLineUserId: { $ne: '' }
      }).lean();

      for (const event of events) {
        const notifyAt = new Date(event.startDateTime.getTime() - event.notifyMinutesBefore * 60 * 1000);
        if (now >= notifyAt && now < new Date(event.startDateTime)) {
          const startStr = new Date(event.startDateTime).toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          const msg = `📅 行程提醒：${event.title}\n🕐 時間：${startStr}${event.description ? `\n📝 備注：${event.description}` : ''}`;
          try {
            await pushMessage(event.notifyLineUserId, msg);
            await CalendarEvent.findByIdAndUpdate(event._id, { notified: true });
            console.log(`[Calendar] Notified LINE user ${event.notifyLineUserId} for event "${event.title}"`);
          } catch (err) {
            console.error('[Calendar] Notify failed:', err.message);
          }
        }
      }
    } catch (err) {
      console.error('[Calendar] Cron error:', err.message);
    }
  }, { timezone: 'Asia/Taipei' });

  console.log('[Calendar] Notification cron job started');
}

module.exports = { buildScheduleContext, getUpcomingEvents, startNotifyJob };
