const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  title:               { type: String, required: true },
  description:         { type: String, default: '' },
  startDateTime:       { type: Date, required: true },
  endDateTime:         { type: Date, required: true },
  isAllDay:            { type: Boolean, default: false },
  type:                { type: String, enum: ['event', 'blocked'], default: 'event' },
  color:               { type: String, default: '#2196F3' },
  notifyLineUserId:    { type: String, default: '' },
  notifyMinutesBefore: { type: Number, default: 0 }, // 0 = no notification
  notified:            { type: Boolean, default: false },
  createdAt:           { type: Date, default: Date.now }
});

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);
