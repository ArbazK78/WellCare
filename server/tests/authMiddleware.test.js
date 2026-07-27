const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const verifyUserToken = require('../src/middlewares/verifyUserToken');
const verifyGuideToken = require('../src/middlewares/verifyGuideToken');

process.env.JWT_SECRET = 'phase-3a-test-secret';

const runMiddleware = (middleware, token) => {
  const req = { headers: { authorization: `Bearer ${token}` } };
  const result = { req, status: null, body: null, nextCalled: false };
  const res = {
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  middleware(req, res, () => { result.nextCalled = true; });
  return result;
};

test('customer middleware requires an exact customer role', () => {
  const valid = jwt.sign({ userId: 'user-1', role: 'customer' }, process.env.JWT_SECRET);
  const missingRole = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET);

  assert.equal(runMiddleware(verifyUserToken, valid).nextCalled, true);
  assert.equal(runMiddleware(verifyUserToken, missingRole).status, 403);
});

test('guide middleware rejects customer and role-less tokens', () => {
  const customer = jwt.sign({ userId: 'user-1', role: 'customer' }, process.env.JWT_SECRET);
  const missingRole = jwt.sign({ id: 'guide-1' }, process.env.JWT_SECRET);

  assert.equal(runMiddleware(verifyGuideToken, customer).status, 403);
  assert.equal(runMiddleware(verifyGuideToken, missingRole).status, 403);
});
