const crypto = require('crypto');

const isOrderBoundToBooking = (booking, orderId) => (
  Boolean(booking?.razorpayOrderId) && booking.razorpayOrderId === orderId
);

const isValidPaymentSignature = ({ orderId, paymentId, signature, secret }) => {
  if (!orderId || !paymentId || !signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(signature, 'hex');

  return expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
};

module.exports = { isOrderBoundToBooking, isValidPaymentSignature };
