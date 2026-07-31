const AdminAuditLog = require('../models/AdminAuditLog');

const getRequestIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;

const recordAdminAudit = async (req, { action, targetAdmin = null, targetEmail = null, metadata = {} }) => {
  try {
    await AdminAuditLog.create({
      actor: req.admin?._id || null,
      actorEmail: req.admin?.email || null,
      action,
      targetAdmin,
      targetEmail,
      ipAddress: getRequestIp(req),
      userAgent: req.get?.('user-agent') || null,
      metadata,
    });
  } catch (error) {
    console.error(`Admin audit write failed (${action}):`, error.message);
  }
};

module.exports = { getRequestIp, recordAdminAudit };
