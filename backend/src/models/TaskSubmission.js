const mongoose = require('mongoose');

const TaskSubmissionSchema = new mongoose.Schema({
  taskId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  lineUserId:    { type: String, required: true },
  displayName:   { type: String, default: '' },
  pictureUrl:    { type: String, default: '' },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  photoBase64:   { type: String, default: '' },
  note:          { type: String, default: '' },
  adminNote:     { type: String, default: '' },
  reviewedAt:    { type: Date, default: null },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaskSubmission', TaskSubmissionSchema);
