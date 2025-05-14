// server/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true }, // For Google Sign-in
  profilePicture: { type: String }, // Optional profile picture from Google
  savedAddresses: {
    home: { type: String },
    work: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving (only if password is being set/modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next(); // ✅ skip if no password
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);