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
  paymentStatus:    { type: String, enum: ['free', 'unpaid', 'paid'], default: 'unpaid' },
  unpaidExit:       { type: Boolean, default: false },
  paymentRef:       { type: String, default: '' },
  qrToken:          { type: String, default: '' },
  note:             { type: String, default: '' },
  reminderSentAt:   { type: Date, default: null },
  mode:             { type: String, enum: ['normal', 'walkin_short'], default: 'normal' },
  appliedCouponId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  discountAmount:   { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
