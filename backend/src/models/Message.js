const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  lineUserId: { type: String, required: true },
  displayName: { type: String, default: '' },
  userMessage: { type: String, required: true },
  replyToken: { type: String, required: true },
  aiReplies: { type: [String], default: [] },
  selectedReply: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'replied', 'failed'],
    default: 'pending'
  },
  errorMessage: { type: String, default: '' },
  syncedToSheet: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  repliedAt: { type: Date }
});

module.exports = mongoose.model('Message', MessageSchema);
