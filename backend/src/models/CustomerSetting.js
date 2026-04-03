const mongoose = require('mongoose');

const CustomerSettingSchema = new mongoose.Schema({
  lineUserId:          { type: String, required: true, unique: true },
  autoReplyEnabled:    { type: Boolean, default: true },
  conversationSummary: { type: String, default: '' },
  summaryUpdatedAt:    { type: Date }
});

module.exports = mongoose.model('CustomerSetting', CustomerSettingSchema);
