const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  isOrderBoundToBooking,
  isValidPaymentSignature,
} = require('../src/services/paymentVerification');

test('payment order must match the order stored on the booking', () => {
  assert.equal(isOrderBoundToBooking({ razorpayOrderId: 'order_1' }, 'order_1'), true);
  assert.equal(isOrderBoundToBooking({ razorpayOrderId: 'order_1' }, 'order_2'), false);
});

test('Razorpay signature is verified with the configured secret', () => {
  const input = { orderId: 'order_1', paymentId: 'pay_1', secret: 'test-secret' };
  const signature = crypto
    .createHmac('sha256', input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  assert.equal(isValidPaymentSignature({ ...input, signature }), true);
  assert.equal(isValidPaymentSignature({ ...input, signature: '00' }), false);
});
