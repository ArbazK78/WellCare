const express = require('express');
const rateLimit = require('express-rate-limit');
const verifyUserToken = require('../middlewares/verifyUserToken');
const verifyGuideToken = require('../middlewares/verifyGuideToken');
const ratingController = require('../controllers/ratingController');

const router = express.Router();
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many feedback attempts. Please wait and try again.' },
});

router.post(
  '/customer/bookings/:bookingId/guide',
  verifyUserToken,
  submissionLimiter,
  ratingController.submitCustomerGuideReview,
);
router.patch(
  '/customer/bookings/:bookingId/prompt-dismissed',
  verifyUserToken,
  ratingController.dismissCustomerPrompt,
);
router.post(
  '/customer/bookings/:bookingId/safety-report',
  verifyUserToken,
  submissionLimiter,
  ratingController.submitSafetyReport,
);

router.post(
  '/guide/bookings/:bookingId/customer',
  verifyGuideToken,
  submissionLimiter,
  ratingController.submitGuideCustomerReview,
);
router.patch(
  '/guide/bookings/:bookingId/prompt-dismissed',
  verifyGuideToken,
  ratingController.dismissGuidePrompt,
);

module.exports = router;
