const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // BC-9 fix: was missing, caused runtime crash on /refresh-token
const User = require('../models/User');
const authController = require('../controllers/authController');

// POST /auth/verify – user registration or lookup (used with OTP flow on frontend)
router.post('/auth/verify', async (req, res) => {
  const { phone, name, email } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ error: "Phone and name are required." });
  }

  try {
    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({ phone, name, email });
      await user.save();
    }

    // Return a safe subset — never expose safetyPin here
    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    });
  } catch (err) {
    console.error("Auth verification error:", err);
    res.status(500).json({ error: "User verification failed." });
  }
});

// POST /refresh-token – BC-9 fix: jwt is now imported above
// Verifies the existing token without ignoring expiration (the previous
// ignoreExpiration: true was a critical security bug — any leaked token
// could generate fresh tokens indefinitely).
router.post('/refresh-token', (req, res) => {
  const oldToken = req.headers.authorization?.split(' ')[1];

  if (!oldToken) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);

    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role || 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// POST /google – Google OAuth sign-in
router.post('/google', authController.googleSignIn);

module.exports = router;
