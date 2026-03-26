const mongoose = require('mongoose');

const CustomerLabelSchema = new mongoose.Schema({
  lineUserId: { type: String, required: true, unique: true },
  labelIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }]
});

module.exports = mongoose.model('CustomerLabel', CustomerLabelSchema);
