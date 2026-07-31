const express = require('express');
const rateLimit = require('express-rate-limit');
const Guide = require('../models/Guide');
const verifyAdminToken = require('../middlewares/verifyAdminToken');
const { requireOwner, requireAdminRequestHeader } = require('../middlewares/verifyAdminToken');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait before trying again.' },
});

const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many recovery attempts. Please wait before requesting another code.' },
});

// Public administrator authentication endpoints.
router.post('/auth/login', loginLimiter, adminAuthController.login);
router.post('/auth/forgot-password', recoveryLimiter, adminAuthController.requestPasswordReset);
router.post('/auth/reset-password', recoveryLimiter, adminAuthController.resetPassword);
router.get('/auth/invitations/:token', adminAuthController.getInvitation);
router.post('/auth/accept-invitation', recoveryLimiter, adminAuthController.acceptInvitation);

// Cookie-backed session endpoints.
router.get('/auth/session', verifyAdminToken, adminAuthController.session);
router.post('/auth/logout', verifyAdminToken, requireAdminRequestHeader, adminAuthController.logout);
router.get('/verify', verifyAdminToken, (req, res) => res.json({ valid: true, admin: { email: req.admin.email, role: req.admin.role } }));

// Owner-only administrator governance.
router.get('/accounts', verifyAdminToken, requireOwner, adminAuthController.listAdmins);
router.post('/accounts/invitations', verifyAdminToken, requireOwner, requireAdminRequestHeader, adminAuthController.inviteAdmin);
router.post('/accounts/:id/resend-invitation', verifyAdminToken, requireOwner, requireAdminRequestHeader, adminAuthController.resendInvitation);
router.patch('/accounts/:id/status', verifyAdminToken, requireOwner, requireAdminRequestHeader, adminAuthController.updateAdminStatus);
router.get('/audit-log', verifyAdminToken, requireOwner, adminAuthController.listAuditLog);

// Existing guide administration operations.
router.get('/guides', verifyAdminToken, async (_req, res) => {
  try {
    const guides = await Guide.find().select('-password');
    res.json(guides);
  } catch (error) {
    console.error('Failed to fetch guides for admin:', error);
    res.status(500).json({ message: 'Failed to fetch guides.' });
  }
});

router.put('/guides/:id/status', verifyAdminToken, requireAdminRequestHeader, async (req, res) => {
  const validStatuses = ['approved', 'rejected', 'pending'];
  if (!validStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status value.' });

  try {
    const updatedGuide = await Guide.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    ).select('-password');
    if (!updatedGuide) return res.status(404).json({ message: 'Guide not found.' });
    return res.json({ message: `Guide ${req.body.status} successfully.`, guide: updatedGuide });
  } catch (error) {
    console.error('Failed to update guide status:', error);
    return res.status(500).json({ message: 'Failed to update guide status.' });
  }
});

module.exports = router;
