const mongoose = require('mongoose');

const VenuePlanSchema = new mongoose.Schema({
  venueId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  type:       { type: String, enum: ['single', 'multi'], default: 'single' },
  name:       { type: String, required: true },
  icon:       { type: String, default: '' },
  // slot keys: 'morning' | 'afternoon' | 'evening'
  slots:      [{ type: String }],
  startHour:  { type: Number, default: 0 },
  endHour:    { type: Number, default: 24 },
  price:      { type: Number, required: true },
  onSale:     { type: Boolean, default: false },
  salePrice:  { type: Number, default: 0 },
  isActive:   { type: Boolean, default: true },
  order:      { type: Number, default: 0 }
});

module.exports = mongoose.model('VenuePlan', VenuePlanSchema);
