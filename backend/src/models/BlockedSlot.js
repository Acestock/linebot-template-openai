const mongoose = require('mongoose');

const BlockedSlotSchema = new mongoose.Schema({
  venueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  date:      { type: Date, required: true },
  slots:     [{ type: String, enum: ['morning', 'afternoon', 'evening'] }],
  eventName: { type: String, default: '' },
  capacity:  { type: Number, default: 0 }, // 0 = 全時段包場；>0 = 佔用 N 個座位
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockedSlot', BlockedSlotSchema);
