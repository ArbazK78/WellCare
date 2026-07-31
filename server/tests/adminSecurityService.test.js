const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'admin-security-test-secret';

const {
  generateInvitationToken,
  generateResetCode,
  hashOpaqueToken,
  hashShortCode,
  isValidEmail,
  normalizeEmail,
  safeEqual,
  validatePassword,
} = require('../src/services/adminSecurityService');

test('normalizes and validates administrator emails', () => {
  assert.equal(normalizeEmail('  Owner@WellCare.Example '), 'owner@wellcare.example');
  assert.equal(isValidEmail('owner@wellcare.example'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('enforces the administrator password policy', () => {
  assert.match(validatePassword('short') || '', /12/);
  assert.match(validatePassword('alllowercasebutlong') || '', /three/);
  assert.equal(validatePassword('WellCare!Admin2026'), null);
});

test('generates unpredictable invitation tokens and fixed-width reset codes', () => {
  const first = generateInvitationToken();
  const second = generateInvitationToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);
  assert.match(generateResetCode(), /^\d{8}$/);
});

test('hashes tokens and reset codes without storing plaintext credentials', () => {
  assert.equal(hashOpaqueToken('token'), hashOpaqueToken('token'));
  assert.notEqual(hashOpaqueToken('token'), hashOpaqueToken('different-token'));
  assert.equal(hashShortCode('12345678', 'admin-1'), hashShortCode('12345678', 'admin-1'));
  assert.notEqual(hashShortCode('12345678', 'admin-1'), hashShortCode('12345678', 'admin-2'));
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('same', 'different'), false);
});
