const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  lineUserId:             { type: String, required: true },
  displayName:            { type: String, default: '' },
  taskId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  taskTitle:              { type: String, default: '' },
  discountAmount:         { type: Number, required: true },
  status:                 { type: String, enum: ['valid', 'used', 'expired'], default: 'valid' },
  usedForReservationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  usedAt:                 { type: Date, default: null },
  expiresAt:              { type: Date, default: null },
  createdAt:              { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', CouponSchema);
