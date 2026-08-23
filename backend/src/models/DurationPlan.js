const mongoose = require('mongoose');

const DurationPlanSchema = new mongoose.Schema({
  venueId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  name:            { type: String, required: true },    // '90 分鐘', '3 小時', '6 小時', '整天'
  durationMinutes: { type: Number, required: true },    // 90, 180, 360, 0=allDay
  price:           { type: Number, required: true, default: 0 },
  isActive:        { type: Boolean, default: true },
  order:           { type: Number, default: 0 },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('DurationPlan', DurationPlanSchema);
