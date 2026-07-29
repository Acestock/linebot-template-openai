const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  lineUserId:       { type: String, required: true },
  displayName:      { type: String, default: '' },
  pictureUrl:       { type: String, default: '' },
  venueId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  venueName:        { type: String, default: '' },
  date:             { type: Date, required: true },
  planId:           { type: mongoose.Schema.Types.ObjectId, ref: 'VenuePlan' },
  planName:         { type: String, default: '' },
  slots:            [{ type: String }],
  totalPrice:       { type: Number, default: 0 },
  expectedCheckIn:  { type: Date },
  expectedCheckOut: { type: Date },
  status:           { type: String, enum: ['confirmed', 'checked_in', 'completed', 'cancelled'], default: 'confirmed' },
  paymentRef:       { type: String, default: '' },
  qrToken:          { type: String, default: '' },
  note:             { type: String, default: '' },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
