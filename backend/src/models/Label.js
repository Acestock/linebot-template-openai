const mongoose = require('mongoose');

const LabelSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  color: { type: String, default: '#2196F3' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Label', LabelSchema);
