const crypto = require('crypto');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return 'Password must be between 12 and 128 characters.';
  }
  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (groups < 3) return 'Use at least three of: uppercase, lowercase, number, and symbol.';
  return null;
};

const hashOpaqueToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const hashShortCode = (code, adminId) => crypto
  .createHmac('sha256', process.env.ADMIN_TOKEN_SECRET || process.env.JWT_SECRET)
  .update(`${adminId}:${code}`)
  .digest('hex');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const generateInvitationToken = () => crypto.randomBytes(32).toString('base64url');
const generateResetCode = () => crypto.randomInt(0, 100000000).toString().padStart(8, '0');

module.exports = {
  generateInvitationToken,
  generateResetCode,
  hashOpaqueToken,
  hashShortCode,
  isValidEmail,
  normalizeEmail,
  safeEqual,
  validatePassword,
};
