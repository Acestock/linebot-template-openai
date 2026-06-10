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
  adminLineUserId:         { type: String, default: '' },
  appointmentReplyEnabled: { type: Boolean, default: false },
  workingHours: {
    mon: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    tue: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    wed: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    thu: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    fri: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    sat: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
    sun: { enabled: { type: Boolean, default: false }, start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } }
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusinessProfile', BusinessProfileSchema);
