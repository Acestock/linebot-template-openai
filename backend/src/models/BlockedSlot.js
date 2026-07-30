const mongoose = require('mongoose');

const BlockedSlotSchema = new mongoose.Schema({
  venueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  date:      { type: Date, required: true },
  slots:     [{ type: String, enum: ['morning', 'afternoon', 'evening'] }],
  eventName: { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockedSlot', BlockedSlotSchema);
