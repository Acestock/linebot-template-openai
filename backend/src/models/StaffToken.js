const mongoose = require('mongoose');

const StaffTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  venueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  venueName: { type: String, default: '' },
  label:     { type: String, default: '工作人員' }, // display name for gate response
  expiresAt: { type: Date, required: true },
  isPermanent: { type: Boolean, default: false }, // true：後台手動產生的永久碼（expiresAt 設在遠未來，手動「重新產生」才會失效）
  createdAt: { type: Date, default: Date.now }
});

// Auto-delete expired tokens after 1 hour
StaffTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('StaffToken', StaffTokenSchema);
