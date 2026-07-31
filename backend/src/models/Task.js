const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  rewardAmount: { type: Number, required: true },
  venueId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  venueName:    { type: String, default: '' },
  status:       { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
  expiresAt:    { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
