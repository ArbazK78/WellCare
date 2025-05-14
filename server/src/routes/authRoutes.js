const express = require('express');
const router = express.Router();
const User = require('../models/User');
// const authController = require('../controllers/authController');


// POST /auth/verify – user registration or lookup
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

    res.json(user);
  } catch (err) {
    console.error("Auth verification error:", err);
    res.status(500).json({ error: "User verification failed." });
  }
});

// Backend: authRoutes.js
// routes/auth.js
router.post('/refresh-token', (req, res) => {
  const oldToken = req.headers.authorization?.split(' ')[1];
  
  if (!oldToken) return res.status(401).json({ error: 'No token provided' });

  try {
    // Verify token while ignoring expiration
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Generate new token
    const newToken = jwt.sign(
      { userId: decoded.userId }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // New token lifespan
    );

    res.json({ newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token signature' });
  }
});

router.get('/test-auth', (req, res) => {
  console.log("✅ /api/test-auth hit!");
  res.send('Auth routes are working!');
});
router.post('/test-post', (req, res) => {
  console.log("✅ /api/test-post hit!");
  res.send('Post route is working!');
});
const authController = require('../controllers/authController'); // Require it here
router.post('/google', authController.googleSignIn);


module.exports = router;
