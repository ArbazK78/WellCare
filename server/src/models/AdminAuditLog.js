const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
  actorEmail: { type: String, default: null },
  action: { type: String, required: true, index: true },
  targetAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  targetEmail: { type: String, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

AdminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);
