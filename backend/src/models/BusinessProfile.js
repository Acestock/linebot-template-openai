const mongoose = require('mongoose');

const BusinessProfileSchema = new mongoose.Schema({
  shopName: { type: String, default: '' },
  industry: { type: String, default: '' },
  products: { type: String, default: '' },
  businessHours: { type: String, default: '' },
  address: { type: String, default: '' },
  faq: { type: String, default: '' },
  toneNote: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusinessProfile', BusinessProfileSchema);
