// server/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Guide = require('../models/Guide');
const verifyAdminToken = require('../middlewares/verifyAdminToken');

// ---------------------------------------------------------------------------
// POST /api/admin/login
// Validates username + password from env vars, returns a signed admin JWT
// ---------------------------------------------------------------------------
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (username !== validUsername || password !== validPassword) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { role: 'admin', username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, message: 'Admin login successful' });
});

// ---------------------------------------------------------------------------
// GET /api/admin/verify
// Lightweight route to verify admin token is still valid (used on page load)
// ---------------------------------------------------------------------------
router.get('/verify', verifyAdminToken, (req, res) => {
  res.json({ valid: true, admin: req.admin.username });
});

// ---------------------------------------------------------------------------
// GET /api/admin/guides — Get all guides (protected, was previously open)
// ---------------------------------------------------------------------------
router.get('/guides', verifyAdminToken, async (req, res) => {
  try {
    const guides = await Guide.find().select('-password');
    res.json(guides);
  } catch (err) {
    console.error('❌ Error fetching guides for admin:', err);
    res.status(500).json({ message: 'Failed to fetch guides' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/guides/:id/status — Approve or reject a guide (protected)
// ---------------------------------------------------------------------------
router.put('/guides/:id/status', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['approved', 'rejected', 'pending'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const updatedGuide = await Guide.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password');

    if (!updatedGuide) {
      return res.status(404).json({ message: 'Guide not found' });
    }

    res.json({ message: `Guide ${status} successfully`, guide: updatedGuide });
  } catch (err) {
    console.error('❌ Error updating guide status:', err);
    res.status(500).json({ message: 'Failed to update guide status' });
  }
});

module.exports = router;
