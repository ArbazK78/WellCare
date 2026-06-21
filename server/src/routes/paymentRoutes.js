const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const verifyUserToken = require('../middlewares/verifyUserToken');

// Create a new Razorpay order
router.post('/create-order', verifyUserToken, paymentController.createOrder);

// Verify a Razorpay payment
router.post('/verify', verifyUserToken, paymentController.verifyPayment);

module.exports = router;
