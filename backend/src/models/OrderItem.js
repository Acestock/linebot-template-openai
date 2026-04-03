const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  price:       { type: String, required: true }, // String 保留彈性（"$60"、"報價"、"面議"）
  unit:        { type: String, default: '' },    // 杯、份、個、盒
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('OrderItem', OrderItemSchema);
