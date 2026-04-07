const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinTime: { type: Date, default: Date.now },
  leaveTime: { type: Date },
  isActive: { type: Boolean, default: true },
  activityStatus: { type: String, enum: ['joined', 'active', 'inactive'], default: 'joined' }
});

module.exports = mongoose.model('Participant', participantSchema);