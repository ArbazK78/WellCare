// server/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  savedAddresses: {
    home: { type: String },
    work: { type: String }
  },
  safetyPin: { type: String }, // 4-digit PIN for trip verification
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
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving (only if password is being set/modified)
userSchema.pre('save', async function (next) {
  if (!this.safetyPin) {
    const crypto = require('crypto');
    this.safetyPin = crypto.randomInt(1000, 10000).toString();
  }

  if (!this.isModified('password') || !this.password) return next(); // ✅ skip if no password
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);