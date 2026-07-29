const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  lineUserId:   { type: String, required: true },
  displayName:  { type: String, default: '' },
  // Snapshot of items at time of order (admin can edit note)
  items: [{
    name:     String,
    price:    String,
    unit:     String,
    quantity: { type: Number, default: 1 }
  }],
  note:         { type: String, default: '' },
  status:       { type: String, enum: ['new', 'processing', 'completed', 'cancelled'], default: 'new' },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
