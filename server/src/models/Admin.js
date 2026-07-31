const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null, select: false },
  role: { type: String, enum: ['owner', 'admin'], required: true, default: 'admin' },
  status: { type: String, enum: ['invited', 'active', 'suspended', 'revoked'], required: true, default: 'invited', index: true },
  emailVerifiedAt: { type: Date, default: null },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, default: null, select: false },
  sessionVersion: { type: Number, default: 0, select: false },
  passwordChangedAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
