const mongoose = require('mongoose');

const KeywordSchema = new mongoose.Schema({
  trigger: { type: String, required: true },   // e.g., "營業時間"
  reply:   { type: String, required: true },   // auto-reply text
  isActive: { type: Boolean, default: true },
  order:   { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Keyword', KeywordSchema);
