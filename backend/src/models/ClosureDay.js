const mongoose = require('mongoose');

const ClosureDaySchema = new mongoose.Schema({
  date:      { type: Date, required: true }, // 全站公休日（不綁特定場地）
  reason:    { type: String, required: true },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClosureDay', ClosureDaySchema);
