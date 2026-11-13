const ClosureDay = require('../models/ClosureDay');

// dateStr: 'YYYY-MM-DD'（或可被 new Date() 解析的字串）
// 回傳 { reason } 或 null（該日非全站公休）
async function getActiveClosure(dateStr) {
  const date = new Date(dateStr);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateEnd   = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);
  const closure = await ClosureDay.findOne({
    isActive: true,
    date: { $gte: dateStart, $lt: dateEnd }
  }).lean();
  return closure ? { reason: closure.reason } : null;
}

module.exports = { getActiveClosure };
