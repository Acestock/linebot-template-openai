const mongoose = require('mongoose');

const StaffTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  venueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  venueName: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-delete expired tokens after 1 hour
StaffTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('StaffToken', StaffTokenSchema);
