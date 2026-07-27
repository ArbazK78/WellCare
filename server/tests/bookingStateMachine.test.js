const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canAssignedGuideTransition,
  getCustomerCancellationResult,
  isAssignedGuide,
} = require('../src/services/bookingStateMachine');

test('assigned ride transitions follow the enforced state machine', () => {
  assert.equal(canAssignedGuideTransition('accepted', 'arrived'), true);
  assert.equal(canAssignedGuideTransition('in_progress', 'completed'), true);
  assert.equal(canAssignedGuideTransition('accepted', 'completed'), false);
  assert.equal(canAssignedGuideTransition('arrived', 'completed'), false);
});

test('only the assigned guide matches a booking', () => {
  const booking = { guide: { toString: () => 'guide-a' } };
  assert.equal(isAssignedGuide(booking, 'guide-a'), true);
  assert.equal(isAssignedGuide(booking, 'guide-b'), false);
  assert.equal(isAssignedGuide({ guide: null }, 'guide-a'), false);
});

test('customer cancellation is idempotent after a system timeout', () => {
  assert.equal(getCustomerCancellationResult('pending'), 'allowed');
  assert.equal(getCustomerCancellationResult('accepted'), 'allowed');
  assert.equal(getCustomerCancellationResult('cancelled'), 'already_cancelled');
  assert.equal(getCustomerCancellationResult('in_progress'), 'blocked');
  assert.equal(getCustomerCancellationResult('completed'), 'blocked');
});
