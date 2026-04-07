const mongoose = require("mongoose");
const crypto = require("crypto");

function generateRoomId() {
  return crypto.randomBytes(8).toString("hex");
}

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: generateRoomId
  },

  isActive: {
    type: Boolean,
    default: true
  },

  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Participant"
  }],

  startTime: {
    type: Date,
    default: Date.now
  },

  endTime: {
    type: Date
  },

  // New fields for SMART ATTENDANCE
  duration: {
    type: Number, // in minutes
    required: true,
    default: 60
  },

  minAttendanceType: {
    type: String,
    enum: ['minutes', 'percentage'],
    required: true,
    default: 'percentage'
  },

  minAttendanceValue: {
    type: Number, // minutes or percentage (0-100)
    required: true,
    default: 75
  }

});

sessionSchema.index({ roomId: 1 }, { unique: true });

module.exports = mongoose.model("Session", sessionSchema);
