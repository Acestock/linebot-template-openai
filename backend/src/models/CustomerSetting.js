const mongoose = require('mongoose');

const CustomerSettingSchema = new mongoose.Schema({
  lineUserId: { type: String, required: true, unique: true },
  autoReplyEnabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('CustomerSetting', CustomerSettingSchema);
