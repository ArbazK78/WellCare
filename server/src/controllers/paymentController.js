const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const { isOrderBoundToBooking, isValidPaymentSignature } = require('../services/paymentVerification');

// Initialize Razorpay instance
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are missing from environment variables');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // BC-5 fix: Only the customer who owns this booking can initiate payment
    if (!booking.customer || booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this booking' });
    }

    if (booking.status !== 'completed') {
      return res.status(409).json({ message: 'Payment is available only after the booking is completed' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    const amountInPaise = Math.round((booking.totalFare || 0) * 100);
    
    if (amountInPaise <= 0) {
      return res.status(400).json({ message: 'Invalid total fare for payment' });
    }

    const razorpay = getRazorpayInstance();

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${booking._id}`,
    };

    const order = await razorpay.orders.create(options);

    // Save order ID to booking
    booking.razorpayOrderId = order.id;
    await booking.save();

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID // Safe to expose public key
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Server error while creating payment order' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // BC-5 fix: Only the customer who owns this booking can verify a payment
    if (!booking.customer || booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this booking' });
    }

    if (booking.status !== 'completed') {
      return res.status(409).json({ message: 'Payment is available only after the booking is completed' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'Booking is already paid' });
    }

    if (!isOrderBoundToBooking(booking, razorpay_order_id)) {
      return res.status(400).json({ message: 'Payment order does not belong to this booking' });
    }

    const isAuthentic = isValidPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      secret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (isAuthentic) {
      // Payment verified!
      booking.paymentStatus = 'paid';
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.razorpaySignature = razorpay_signature;
      await booking.save();

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ message: 'Server error while verifying payment' });
  }
};
