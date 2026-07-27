// server/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const verifyUserToken = require("../middlewares/verifyUserToken"); // Assuming this exists
const verifyGuideToken = require("../middlewares/verifyGuideToken"); // Guide token verification
const {
  getBookingById,
  getGuidePendingBookings,
  getGuideAcceptedBookings,
  getGuideCompletedBookings,
  getGuideRecentCancellations,
  updateBookingStatus
} = bookingController;

const rateLimit = require("express-rate-limit");

// BH-1 fix: Rate limit PIN attempts to prevent brute-forcing the 4-digit PIN.
// Max 5 attempts per 15 minutes.
const pinAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: "Too many failed PIN attempts. Please try again after 15 minutes." }
});
// POST /api/bookings - Create a booking
router.post("/", verifyUserToken, bookingController.createBooking);
// router.post("/", bookingController.createBooking);

// GET /api/bookings - Get bookings for logged-in user
router.get("/my-bookings", verifyUserToken, bookingController.getUserBookings);
// GET /api/bookings/active - Check if the user has an active booking
router.get("/active", verifyUserToken, bookingController.checkActiveBooking); // 👈 ADD THIS LINE

// ✅ Guide-specific booking endpoints
router.get('/guide/pending', verifyGuideToken, getGuidePendingBookings); // Get guide's pending bookings
router.get('/guide/accepted', verifyGuideToken, getGuideAcceptedBookings); // Get guide's accepted bookings
router.get('/guide/completed', verifyGuideToken, getGuideCompletedBookings); // Get guide's completed bookings
router.get('/guide/recent-cancellations', verifyGuideToken, getGuideRecentCancellations); // Poll for recent cancellations

// PUT /api/bookings/:bookingId/cancel - Cancel a specific booking
router.put("/:bookingId/cancel", verifyUserToken, bookingController.cancelBooking); // 👈 Soft delete



// PUT /api/bookings/:bookingId/status - Update booking status (accept/reject/complete)
router.put('/:bookingId/status', verifyGuideToken, updateBookingStatus);

// POST /api/bookings/:bookingId/start-trip - Start trip with OTP
router.post("/:bookingId/start-trip", verifyGuideToken, pinAttemptLimiter, bookingController.startTrip); // ✅ Status update endpoint

router.get('/:bookingId', verifyUserToken, getBookingById); // Full booking fetch for confirmation page

module.exports = router;
