const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  address:            { type: String, default: '' },
  transportInfo:      { type: String, default: '' },
  imageUrl:           { type: String, default: '' },
  imageUrls:          [{ type: String }],
  businessHours:      { type: String, default: '' },
  facilities:         { type: String, default: '' },
  rules:              { type: String, default: '' },
  howToUse:           { type: String, default: '' },
  color:              { type: String, default: '#2196F3' },
  maxCapacityPerSlot: { type: Number, default: 10 },
  isActive:           { type: Boolean, default: true },
  order:              { type: Number, default: 0 },
  createdAt:          { type: Date, default: Date.now },
  // ── 策略設定 ─────────────────────────────────────────────────────────────────
  strategy:    { type: Number, enum: [1, 2], default: 1 }, // 1=時段制 2=自由時段制
  s2OpenHour:  { type: Number, default: 7  }, // strategy 2: 開始時間（整點）7=07:00
  s2CloseHour: { type: Number, default: 22 }, // strategy 2: 結束時間 22=22:00, 26=02:00(次日)
  shortSession: {
    enabled:          { type: Boolean, default: false },
    minHourPrice:     { type: Number, default: 40 },
    ratio1h:          { type: Number, default: 0.25 },
    ratio2h:          { type: Number, default: 0.60 },
    ratio3h:          { type: Number, default: 0.80 },
    maxCapacityBlock: { type: Number, default: 2 }
  }
});

module.exports = mongoose.model('Venue', VenueSchema);
