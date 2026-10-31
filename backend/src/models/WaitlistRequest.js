const mongoose = require('mongoose');

// 策略二「空位提醒」候補紀錄：用戶對某個已滿時段登記候補，
// 一旦該時段（startTime~endTime）重新出現空位，系統發送 LINE 通知後標記 notified。
// 純通知機制，不會幫用戶佔位，實際預約仍需用戶自行至預約系統完成。
const WaitlistRequestSchema = new mongoose.Schema({
  lineUserId:       { type: String, required: true },
  displayName:      { type: String, default: '' },
  pictureUrl:       { type: String, default: '' },
  venueId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  venueName:        { type: String, default: '' },
  date:             { type: Date, required: true }, // = startTime，供後台依日篩選
  startTime:        { type: Date, required: true },
  endTime:          { type: Date, required: true },
  durationPlanId:   { type: mongoose.Schema.Types.ObjectId, ref: 'DurationPlan', default: null },
  durationPlanName: { type: String, default: '' },
  durationMinutes:  { type: Number, default: 0 },
  status:           { type: String, enum: ['pending', 'notified', 'cancelled'], default: 'pending' },
  notifiedAt:       { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('WaitlistRequest', WaitlistRequestSchema);
