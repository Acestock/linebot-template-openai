const mongoose = require('mongoose');

const CustomerSettingSchema = new mongoose.Schema({
  lineUserId:          { type: String, required: true, unique: true },
  autoReplyEnabled:    { type: Boolean, default: true },
  email:               { type: String, default: '' }, // 付款信箱，記住後自動帶入藍新金流的 Email 欄位
  conversationSummary: { type: String, default: '' },
  summaryUpdatedAt:    { type: Date }
});

module.exports = mongoose.model('CustomerSetting', CustomerSettingSchema);
