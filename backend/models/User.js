const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['host', 'instructor'], default: 'host' },
  hostId: { type: String, unique: true, sparse: true }, // Unique for instructors
  faceData: { type: String }, // Base64 encoded face image or embedding
  faceEnrolled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Auto-generate hostId for instructors
userSchema.pre('save', function(next) {
  if (this.role === 'instructor' && !this.hostId) {
    this.hostId = 'HOST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);