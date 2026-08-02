const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const guideSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  image: { type: String },
  governmentIdDocument: { type: String, select: false },
  location: {
    type: String,
  },

  experience: {
    type: String,
  },

  specialties: {
    type: [String],
  },
  languages: { type: [String], default: [] },
  vehicleType: { type: [String], enum: ['scooter', 'cab'], default: [] },

  bio: {
    type: String,
  },

  // Kept temporarily for backwards compatibility with older clients.
  rating: { type: Number, default: 0 },
  ratingSummary: {
    average: { type: Number, min: 1, max: 5, default: null },
    rawAverage: { type: Number, min: 1, max: 5, default: null, select: false },
    count: { type: Number, min: 0, default: 0 },
    ratingSum: { type: Number, min: 0, default: 0, select: false },
    distribution: {
      1: { type: Number, min: 0, default: 0, select: false },
      2: { type: Number, min: 0, default: 0, select: false },
      3: { type: Number, min: 0, default: 0, select: false },
      4: { type: Number, min: 0, default: 0, select: false },
      5: { type: Number, min: 0, default: 0, select: false },
    },
    policyVersion: { type: Number, default: 1 },
    updatedAt: { type: Date, default: null },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Phase 4 — guide availability tracking
  // Guides must explicitly toggle online; backend records the state
  // so admin can see active guides and future booking routing can target online-only guides
  isOnline: { type: Boolean, default: false },
  lastOnlineAt: { type: Date },  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number },
    updatedAt: { type: Date },
  },
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
