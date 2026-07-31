const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const AdminAuthToken = require('../models/AdminAuthToken');
const AdminSession = require('../models/AdminSession');
const AdminAuditLog = require('../models/AdminAuditLog');
const {
  generateInvitationToken,
  generateResetCode,
  hashOpaqueToken,
  hashShortCode,
  isValidEmail,
  normalizeEmail,
  safeEqual,
  validatePassword,
} = require('../services/adminSecurityService');
const {
  clearAdminSessionCookie,
  createAdminSession,
  revokeAllAdminSessions,
} = require('../services/adminSessionService');
const {
  sendAccessChangedNotice,
  sendAdminInvitation,
  sendPasswordChangedNotice,
  sendPasswordResetCode,
} = require('../services/adminEmailService');
const { recordAdminAudit } = require('../services/adminAuditService');

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const RESET_EXPIRY_MS = 10 * 60 * 1000;
const INVITATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = '$2b$12$KIXx5iwhPE3c2V/qlv6X8uP8WwEd5wVJcB9TIXxqB6XzZzPGz2U6S';

const serializeAdmin = (admin) => ({
  id: admin._id,
  email: admin.email,
  role: admin.role,
  status: admin.status,
  emailVerifiedAt: admin.emailVerifiedAt,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
});

const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const admin = await Admin.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockedUntil +sessionVersion');
  const isLocked = admin?.lockedUntil && admin.lockedUntil > new Date();
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash || DUMMY_PASSWORD_HASH);
  const canLogin = admin && admin.status === 'active' && !isLocked && passwordMatches;

  if (!canLogin) {
    if (admin && !isLocked) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= LOGIN_FAILURE_LIMIT) {
        admin.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MS);
        admin.failedLoginAttempts = 0;
      }
      await admin.save();
    }
    await recordAdminAudit(req, { action: 'admin.login_failed', targetAdmin: admin?._id, targetEmail: email });
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  admin.failedLoginAttempts = 0;
  admin.lockedUntil = null;
  admin.lastLoginAt = new Date();
  await admin.save();
  await createAdminSession({ admin, req, res });
  req.admin = admin;
  await recordAdminAudit(req, { action: 'admin.login_succeeded', targetAdmin: admin._id, targetEmail: admin.email });
  return res.json({ admin: serializeAdmin(admin), message: 'Admin login successful.' });
};

const logout = async (req, res) => {
  if (req.adminSession) {
    req.adminSession.revokedAt = new Date();
    await req.adminSession.save();
  }
  clearAdminSessionCookie(res);
  await recordAdminAudit(req, { action: 'admin.logout', targetAdmin: req.admin._id, targetEmail: req.admin.email });
  return res.json({ message: 'Signed out successfully.' });
};

const session = (req, res) => res.json({ admin: serializeAdmin(req.admin) });

const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const genericResponse = { message: 'If an active administrator exists for this email, a recovery code has been sent.' };
  if (!isValidEmail(email)) return res.status(202).json(genericResponse);

  const admin = await Admin.findOne({ email, status: 'active' });
  if (!admin) {
    await recordAdminAudit(req, { action: 'admin.password_reset_requested_unknown', targetEmail: email });
    return res.status(202).json(genericResponse);
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);
  await AdminAuthToken.updateMany(
    { admin: admin._id, type: 'password_reset', usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await AdminAuthToken.create({
    admin: admin._id,
    type: 'password_reset',
    tokenHash: hashShortCode(code, admin._id),
    expiresAt,
    maxAttempts: 5,
  });

  try {
    await sendPasswordResetCode({ to: admin.email, code, expiresAt });
  } catch (error) {
    console.error('Admin recovery email failed:', error.message);
  }
  await recordAdminAudit(req, { action: 'admin.password_reset_requested', targetAdmin: admin._id, targetEmail: admin.email });
  return res.status(202).json(genericResponse);
};

const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const passwordError = validatePassword(req.body.password);
  if (!isValidEmail(email) || !/^\d{8}$/.test(code) || passwordError) {
    return res.status(400).json({ message: passwordError || 'A valid email and eight-digit code are required.' });
  }

  const admin = await Admin.findOne({ email, status: 'active' }).select('+sessionVersion');
  if (!admin) return res.status(400).json({ message: 'The recovery code is invalid or expired.' });

  const resetToken = await AdminAuthToken.findOne({
    admin: admin._id,
    type: 'password_reset',
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!resetToken || resetToken.attempts >= resetToken.maxAttempts) {
    return res.status(400).json({ message: 'The recovery code is invalid or expired.' });
  }

  const suppliedHash = hashShortCode(code, admin._id);
  if (!safeEqual(suppliedHash, resetToken.tokenHash)) {
    resetToken.attempts += 1;
    if (resetToken.attempts >= resetToken.maxAttempts) resetToken.usedAt = new Date();
    await resetToken.save();
    return res.status(400).json({ message: 'The recovery code is invalid or expired.' });
  }

  admin.passwordHash = await bcrypt.hash(req.body.password, 12);
  admin.passwordChangedAt = new Date();
  admin.sessionVersion += 1;
  admin.failedLoginAttempts = 0;
  admin.lockedUntil = null;
  resetToken.usedAt = new Date();
  await Promise.all([admin.save(), resetToken.save(), revokeAllAdminSessions(admin._id)]);
  await recordAdminAudit(req, { action: 'admin.password_reset_completed', targetAdmin: admin._id, targetEmail: admin.email });
  sendPasswordChangedNotice({ to: admin.email }).catch((error) => console.error('Password notice email failed:', error.message));
  return res.json({ message: 'Password updated. Sign in with your new password.' });
};

const getInvitation = async (req, res) => {
  const tokenHash = hashOpaqueToken(req.params.token || '');
  const invitation = await AdminAuthToken.findOne({
    type: 'invitation',
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('admin', 'email status');
  if (!invitation || !invitation.admin || invitation.admin.status !== 'invited') {
    return res.status(404).json({ message: 'This invitation is invalid or expired.' });
  }
  return res.json({ email: invitation.admin.email, expiresAt: invitation.expiresAt });
};

const acceptInvitation = async (req, res) => {
  const tokenHash = hashOpaqueToken(req.body.token || '');
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const invitation = await AdminAuthToken.findOne({
    type: 'invitation',
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invitation) return res.status(400).json({ message: 'This invitation is invalid or expired.' });

  const admin = await Admin.findById(invitation.admin).select('+sessionVersion');
  if (!admin || admin.status !== 'invited') return res.status(400).json({ message: 'This invitation is no longer active.' });

  admin.passwordHash = await bcrypt.hash(req.body.password, 12);
  admin.status = 'active';
  admin.emailVerifiedAt = new Date();
  admin.passwordChangedAt = new Date();
  invitation.usedAt = new Date();
  await Promise.all([admin.save(), invitation.save()]);
  await createAdminSession({ admin, req, res });
  req.admin = admin;
  await recordAdminAudit(req, { action: 'admin.invitation_accepted', targetAdmin: admin._id, targetEmail: admin.email });
  return res.json({ admin: serializeAdmin(admin), message: 'Your administrator account is ready.' });
};

const createInvitation = async ({ admin, inviter, req }) => {
  const rawToken = generateInvitationToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
  await AdminAuthToken.updateMany(
    { admin: admin._id, type: 'invitation', usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await AdminAuthToken.create({
    admin: admin._id,
    type: 'invitation',
    tokenHash: hashOpaqueToken(rawToken),
    expiresAt,
    maxAttempts: 1,
  });
  const invitationUrl = `${String(process.env.CLIENT_URL || 'http://localhost:8080').replace(/\/$/, '')}/admin/invite?token=${encodeURIComponent(rawToken)}`;
  const delivery = await sendAdminInvitation({
    to: admin.email,
    invitationUrl,
    inviterEmail: inviter.email,
    expiresAt,
  });
  await recordAdminAudit(req, {
    action: 'admin.invitation_sent',
    targetAdmin: admin._id,
    targetEmail: admin.email,
    metadata: { provider: delivery.provider },
  });
  return { expiresAt, delivery };
};

const inviteAdmin = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid administrator email.' });
  let admin = await Admin.findOne({ email });
  if (admin && !(admin.status === 'revoked' && !admin.emailVerifiedAt && admin.role === 'admin')) {
    return res.status(409).json({ message: 'An administrator account or invitation already uses this email.' });
  }
  if (admin) {
    admin.status = 'invited';
    admin.invitedBy = req.admin._id;
    admin.revokedAt = null;
    admin.revokedBy = null;
    await admin.save();
  } else {
    admin = await Admin.create({ email, role: 'admin', status: 'invited', invitedBy: req.admin._id });
  }
  try {
    const { expiresAt, delivery } = await createInvitation({ admin, inviter: req.admin, req });
    return res.status(201).json({ admin: serializeAdmin(admin), expiresAt, emailProvider: delivery.provider });
  } catch (error) {
    console.error('Admin invitation email failed:', error.message);
    return res.status(502).json({ message: 'The invitation was created, but its email could not be delivered. Use Resend invitation after checking email configuration.' });
  }
};

const resendInvitation = async (req, res) => {
  const admin = await Admin.findOne({ _id: req.params.id, role: 'admin', status: 'invited' });
  if (!admin) return res.status(404).json({ message: 'Pending administrator invitation not found.' });
  try {
    const { expiresAt, delivery } = await createInvitation({ admin, inviter: req.admin, req });
    return res.json({ message: 'Invitation sent.', expiresAt, emailProvider: delivery.provider });
  } catch (error) {
    console.error('Admin invitation resend failed:', error.message);
    return res.status(502).json({ message: 'Invitation email could not be delivered.' });
  }
};

const listAdmins = async (_req, res) => {
  const admins = await Admin.find().select('email role status emailVerifiedAt lastLoginAt invitedBy revokedAt createdAt').sort({ role: -1, createdAt: 1 });
  return res.json(admins.map(serializeAdmin));
};

const updateAdminStatus = async (req, res) => {
  const nextStatus = req.body.status;
  if (!['active', 'suspended', 'revoked'].includes(nextStatus)) return res.status(400).json({ message: 'Unsupported account status.' });
  const target = await Admin.findById(req.params.id).select('+sessionVersion +passwordHash');
  if (!target) return res.status(404).json({ message: 'Administrator not found.' });
  if (target.role === 'owner' || String(target._id) === String(req.admin._id)) {
    return res.status(403).json({ message: 'The owner account cannot be changed from this action.' });
  }
  if (nextStatus === 'active' && (!target.emailVerifiedAt || !target.passwordHash)) {
    return res.status(400).json({ message: 'The administrator must verify their invitation and set a password first.' });
  }

  target.status = nextStatus;
  if (nextStatus === 'revoked') {
    target.revokedAt = new Date();
    target.revokedBy = req.admin._id;
  } else {
    target.revokedAt = null;
    target.revokedBy = null;
  }
  target.sessionVersion += 1;
  await target.save();
  await revokeAllAdminSessions(target._id);
  await recordAdminAudit(req, {
    action: `admin.access_${nextStatus}`,
    targetAdmin: target._id,
    targetEmail: target.email,
  });
  sendAccessChangedNotice({ to: target.email, status: nextStatus }).catch((error) => console.error('Access notice email failed:', error.message));
  return res.json({ admin: serializeAdmin(target), message: `Administrator access is now ${nextStatus}.` });
};

const listAuditLog = async (_req, res) => {
  const events = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  return res.json(events);
};

module.exports = {
  acceptInvitation,
  getInvitation,
  inviteAdmin,
  listAdmins,
  listAuditLog,
  login,
  logout,
  requestPasswordReset,
  resendInvitation,
  resetPassword,
  session,
  updateAdminStatus,
};
