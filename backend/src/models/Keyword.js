const mongoose = require('mongoose');

const KeywordSchema = new mongoose.Schema({
  trigger:   { type: String, required: true },
  replyType: { type: String, enum: ['text', 'card'], default: 'text' },
  reply:     { type: String, default: '' },
  cardIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductCard' }],
  isActive:  { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Keyword', KeywordSchema);
