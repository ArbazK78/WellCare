const mongoose = require('mongoose');

const AdminSessionSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  sessionVersion: { type: Number, required: true },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminSession', AdminSessionSchema);
