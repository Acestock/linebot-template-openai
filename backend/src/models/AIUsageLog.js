const mongoose = require('mongoose');

const AIUsageLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['analyze', 'generate', 'summarize'], required: true },
  model: { type: String, required: true },
  promptTokens:     { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens:      { type: Number, default: 0 },
  estimatedCostUSD: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIUsageLog', AIUsageLogSchema);
