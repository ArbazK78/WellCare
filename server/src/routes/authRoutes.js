const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/refresh-token', (req, res) => {
  const oldToken = req.headers.authorization?.split(' ')[1];
  if (!oldToken) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    if (decoded.role !== 'customer' || !decoded.userId) {
      return res.status(403).json({ error: 'Customer token required' });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;