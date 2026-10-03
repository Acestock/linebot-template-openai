const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  lineUserId:             { type: String, required: true },
  displayName:            { type: String, default: '' },
  taskId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  taskTitle:              { type: String, default: '' },
  discountType:           { type: String, enum: ['amount', 'percent'], default: 'amount' },
  discountAmount:         { type: Number, required: true }, // discountType='amount' 時使用：折抵金額
  discountPercent:        { type: Number, default: 0 },     // discountType='percent' 時使用：折扣百分比（例：10 = 打 9 折）
  note:                   { type: String, default: '' },    // 後台手動發送時的備註，會附加在通知訊息裡
  status:                 { type: String, enum: ['valid', 'used', 'expired'], default: 'valid' },
  usedForReservationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  usedAt:                 { type: Date, default: null },
  expiresAt:              { type: Date, default: null },
  createdAt:              { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', CouponSchema);
