const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const guideSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  image: { type: String },
  location: {
    type: String,
  },

  experience: {
    type: String,
  },

  specialties: {
    type: [String],
  },

  bio: {
    type: String,
  },

  rating: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Phase 4 — guide availability tracking
  // Guides must explicitly toggle online; backend records the state
  // so admin can see active guides and future booking routing can target online-only guides
  isOnline: { type: Boolean, default: false },
  lastOnlineAt: { type: Date },
  registeredAt: { type: Date, default: Date.now }

});

// Hash password before saving
guideSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('Guide', guideSchema);
