const mongoose = require('mongoose');

const hourPurchaseSchema = new mongoose.Schema({
  lineUserId:    { type: String, required: true, index: true },
  packageId:     { type: mongoose.Schema.Types.ObjectId, ref: 'HourPackage' },
  packageName:   { type: String, default: '' },
  totalMinutes:  { type: Number, required: true },
  usedMinutes:   { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paymentRef:    { type: String, default: '' },
  purchasedAt:   { type: Date },
  expiresAt:     { type: Date },
}, { timestamps: true });

hourPurchaseSchema.virtual('remainingMinutes').get(function () {
  return Math.max(0, this.totalMinutes - this.usedMinutes);
});

hourPurchaseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('HourPurchase', hourPurchaseSchema);
