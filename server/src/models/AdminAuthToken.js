const mongoose = require('mongoose');

const AdminAuthTokenSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  type: { type: String, enum: ['invitation', 'password_reset'], required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

AdminAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminAuthToken', AdminAuthTokenSchema);
