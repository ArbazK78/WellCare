// server/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const verifyUserToken = require("../middlewares/verifyUserToken"); // Assuming this exists
const verifyGuideToken = require("../middlewares/verifyGuideToken"); // Guide token verification
const authenticateUser = require("../middlewares/auth"); // Or whatever your general auth middleware is named
const {
  getBookingStatus,
  getBookingById,
  acceptBooking,
  getPendingBookings,
  getGuidePendingBookings,
  getGuideAcceptedBookings,
  getGuideCompletedBookings,
  getGuideRecentCancellations,
  updateBookingStatus
} = bookingController;


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
router.put('/:bookingId/status', verifyGuideToken, updateBookingStatus); // ✅ Status update endpoint

router.get('/:bookingId/status', verifyUserToken, getBookingStatus);
router.get('/:bookingId', verifyUserToken, getBookingById); // Full booking fetch for confirmation page
router.post('/:bookingId/accept', verifyUserToken, acceptBooking);
router.get('/pending', verifyUserToken, getPendingBookings);
router.get('/debug-token', verifyUserToken, (req, res) => {
  res.json({ message: 'Token is valid!', userId: req.userId });
});

module.exports = router;
