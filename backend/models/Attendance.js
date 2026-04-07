const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // Student ID as string
  sessionId: { type: String, required: true }, // Session ID as string
  presentTime: { type: Number, default: 0 }, // in seconds
  status: { type: String, enum: ['Pending', 'Present', 'Absent'], default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});

// Unique constraint on studentId + sessionId
attendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);