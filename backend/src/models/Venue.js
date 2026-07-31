const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  address:            { type: String, default: '' },
  transportInfo:      { type: String, default: '' },
  imageUrl:           { type: String, default: '' },
  businessHours:      { type: String, default: '' },
  facilities:         { type: String, default: '' },
  rules:              { type: String, default: '' },
  howToUse:           { type: String, default: '' },
  color:              { type: String, default: '#2196F3' },
  maxCapacityPerSlot: { type: Number, default: 10 },
  isActive:           { type: Boolean, default: true },
  order:              { type: Number, default: 0 },
  createdAt:          { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venue', VenueSchema);
