const mongoose = require('mongoose');

const CustomerSettingSchema = new mongoose.Schema({
  lineUserId:          { type: String, required: true, unique: true },
  autoReplyEnabled:    { type: Boolean, default: true },
  email:               { type: String, default: '' }, // 付款信箱，記住後自動帶入藍新金流的 Email 欄位
  conversationSummary: { type: String, default: '' },
  summaryUpdatedAt:    { type: Date },
  // ── 預約「未到」累計鎖定 ─────────────────────────────────────────────────────
  displayName:         { type: String, default: '' }, // 未到時從預約紀錄順便存一份，方便後台列表顯示
  pictureUrl:          { type: String, default: '' },
  noShowCount:         { type: Number, default: 0 },
  bookingLocked:       { type: Boolean, default: false },
  lockedAt:            { type: Date, default: null }
});

module.exports = mongoose.model('CustomerSetting', CustomerSettingSchema);
