const mongoose = require('mongoose');

const DiscountCodeSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType:    { type: String, enum: ['amount', 'percent'], default: 'amount' },
  discountAmount:  { type: Number, default: 0 },  // discountType='amount' 時使用：折抵金額
  discountPercent: { type: Number, default: 0 },  // discountType='percent' 時使用：折扣百分比（例：10 = 打 9 折）
  maxUses:         { type: Number, default: 0 },  // 使用次數上限，0 = 不限
  usedCount:       { type: Number, default: 0 },
  startAt:         { type: Date, default: null }, // 時間限制：生效起點，null = 不限
  endAt:           { type: Date, default: null }, // 時間限制：截止時間，null = 不限
  isActive:        { type: Boolean, default: true },
  note:            { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
