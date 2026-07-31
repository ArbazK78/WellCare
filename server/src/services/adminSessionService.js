const crypto = require('crypto');
const AdminSession = require('../models/AdminSession');
const { getRequestIp } = require('./adminAuditService');
const { hashOpaqueToken } = require('./adminSecurityService');

const ADMIN_SESSION_COOKIE = 'wellcare_admin_session';
const SESSION_DURATION_MS = Number(process.env.ADMIN_SESSION_DURATION_MS || 12 * 60 * 60 * 1000);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/admin',
  maxAge: SESSION_DURATION_MS,
});

const readCookie = (req, name) => {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
};

const createAdminSession = async ({ admin, req, res }) => {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await AdminSession.create({
    admin: admin._id,
    tokenHash: hashOpaqueToken(rawToken),
    sessionVersion: admin.sessionVersion || 0,
    ipAddress: getRequestIp(req),
    userAgent: req.get('user-agent') || null,
    expiresAt,
  });
  res.cookie(ADMIN_SESSION_COOKIE, rawToken, cookieOptions());
  return expiresAt;
};

const clearAdminSessionCookie = (res) => {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(ADMIN_SESSION_COOKIE, options);
};

const revokeAllAdminSessions = (adminId) => AdminSession.updateMany(
  { admin: adminId, revokedAt: null },
  { $set: { revokedAt: new Date() } },
);

module.exports = {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  createAdminSession,
  readCookie,
  revokeAllAdminSessions,
};
