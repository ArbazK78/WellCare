const jwt = require('jsonwebtoken');

const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'guide' && decoded.id) {
      socket.data.actor = { role: 'guide', id: String(decoded.id) };
      return next();
    }
    if (decoded.role === 'customer' && decoded.userId) {
      socket.data.actor = { role: 'customer', id: String(decoded.userId) };
      return next();
    }
    return next(new Error('Invalid realtime token role'));
  } catch (error) {
    return next(new Error('Invalid or expired realtime token'));
  }
};

module.exports = { authenticateSocket };