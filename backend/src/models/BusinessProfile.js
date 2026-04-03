const mongoose = require('mongoose');

const BusinessProfileSchema = new mongoose.Schema({
  shopName: { type: String, default: '' },
  industry: { type: String, default: '' },
  products: { type: String, default: '' },
  businessHours: { type: String, default: '' },
  address: { type: String, default: '' },
  faq: { type: String, default: '' },
  toneNote: { type: String, default: '' },
  autoReply:      { type: Boolean, default: false },
  autoReplyDelay: { type: Number, default: 60 },
  adminLineUserId:{ type: String, default: '' }, // LINE user ID to receive order notifications
  updatedAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusinessProfile', BusinessProfileSchema);
