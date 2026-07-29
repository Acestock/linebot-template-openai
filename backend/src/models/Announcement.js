const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
