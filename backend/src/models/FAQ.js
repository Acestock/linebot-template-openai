const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer:   { type: String, required: true },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('FAQ', FAQSchema);
