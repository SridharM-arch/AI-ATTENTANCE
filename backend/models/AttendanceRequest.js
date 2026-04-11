const mongoose = require('mongoose');

const attendanceRequestSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  sessionId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Unique constraint on studentId + sessionId to prevent multiple requests
attendanceRequestSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRequest', attendanceRequestSchema);