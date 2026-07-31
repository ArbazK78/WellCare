const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const { ADMIN_SESSION_COOKIE, clearAdminSessionCookie, readCookie } = require('../services/adminSessionService');
const { hashOpaqueToken } = require('../services/adminSecurityService');

const verifyAdminToken = async (req, res, next) => {
  const rawToken = readCookie(req, ADMIN_SESSION_COOKIE);
  if (!rawToken) return res.status(401).json({ message: 'Admin authentication required.' });

  try {
    const session = await AdminSession.findOne({
      tokenHash: hashOpaqueToken(rawToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      clearAdminSessionCookie(res);
      return res.status(401).json({ message: 'Admin session is invalid or expired.' });
    }

    const admin = await Admin.findById(session.admin).select('+sessionVersion');
    if (!admin || admin.status !== 'active' || admin.sessionVersion !== session.sessionVersion) {
      session.revokedAt = new Date();
      await session.save();
      clearAdminSessionCookie(res);
      return res.status(401).json({ message: 'Admin access is no longer active.' });
    }

    if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      session.lastSeenAt = new Date();
      session.save().catch(() => {});
    }

    req.admin = admin;
    req.adminSession = session;
    next();
  } catch (error) {
    console.error('Admin session verification failed:', error.message);
    return res.status(401).json({ message: 'Admin authentication failed.' });
  }
};

const requireOwner = (req, res, next) => {
  if (req.admin?.role !== 'owner') return res.status(403).json({ message: 'Owner access is required.' });
  next();
};

const requireAdminRequestHeader = (req, res, next) => {
  if (req.get('x-wellcare-admin') !== '1') {
    return res.status(403).json({ message: 'Administrative request could not be verified.' });
  }
  next();
};

module.exports = verifyAdminToken;
module.exports.requireOwner = requireOwner;
module.exports.requireAdminRequestHeader = requireAdminRequestHeader;
