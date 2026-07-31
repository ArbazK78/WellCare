const test = require('node:test');
const assert = require('node:assert/strict');
const AdminSession = require('../src/models/AdminSession');
const { hashOpaqueToken } = require('../src/services/adminSecurityService');
const {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  createAdminSession,
  readCookie,
} = require('../src/services/adminSessionService');

test('reads an exact admin cookie without confusing other cookies', () => {
  const req = { headers: { cookie: `theme=dark; ${ADMIN_SESSION_COOKIE}=secure-token; guide_token=other` } };
  assert.equal(readCookie(req, ADMIN_SESSION_COOKIE), 'secure-token');
  assert.equal(readCookie(req, 'missing'), null);
});

test('creates a hashed HttpOnly administrator session cookie', async () => {
  const originalCreate = AdminSession.create;
  const originalNodeEnv = process.env.NODE_ENV;
  let savedSession;
  let deliveredCookie;
  AdminSession.create = async (payload) => { savedSession = payload; return payload; };
  process.env.NODE_ENV = 'test';

  try {
    const req = {
      headers: {},
      ip: '127.0.0.1',
      get: (header) => header === 'user-agent' ? 'WellCare test agent' : null,
    };
    const res = { cookie: (name, value, options) => { deliveredCookie = { name, value, options }; } };
    await createAdminSession({ admin: { _id: 'admin-1', sessionVersion: 3 }, req, res });

    assert.equal(deliveredCookie.name, ADMIN_SESSION_COOKIE);
    assert.equal(deliveredCookie.options.httpOnly, true);
    assert.equal(deliveredCookie.options.sameSite, 'strict');
    assert.equal(deliveredCookie.options.path, '/api/admin');
    assert.notEqual(savedSession.tokenHash, deliveredCookie.value);
    assert.equal(savedSession.tokenHash, hashOpaqueToken(deliveredCookie.value));
    assert.equal(savedSession.sessionVersion, 3);
  } finally {
    AdminSession.create = originalCreate;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('clears the admin cookie with the same security scope', () => {
  let cleared;
  clearAdminSessionCookie({ clearCookie: (name, options) => { cleared = { name, options }; } });
  assert.equal(cleared.name, ADMIN_SESSION_COOKIE);
  assert.equal(cleared.options.httpOnly, true);
  assert.equal(cleared.options.path, '/api/admin');
});
