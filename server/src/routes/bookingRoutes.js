// server/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const verifyUserToken = require("../middlewares/verifyUserToken"); // Assuming this exists
const authenticateUser = require("../middlewares/auth"); // Or whatever your general auth middleware is named
const { getBookingStatus, acceptBooking, getPendingBookings } = bookingController; // Import new controller functions


// POST /api/bookings - Create a booking
router.post("/", verifyUserToken, bookingController.createBooking);
// router.post("/", bookingController.createBooking);

// GET /api/bookings - Get bookings for logged-in user
router.get("/my-bookings", verifyUserToken, bookingController.getUserBookings);
// GET /api/bookings/active - Check if the user has an active booking
router.get("/active", verifyUserToken, bookingController.checkActiveBooking); // 👈 ADD THIS LINE
// DELETE /api/bookings/:bookingId - Cancel a specific booking
router.delete("/:bookingId", verifyUserToken, bookingController.cancelBooking); // 👈 ADD THIS LINE
router.get('/:bookingId/status', verifyUserToken, getBookingStatus); // New endpoint
router.post('/:bookingId/accept', verifyUserToken, acceptBooking); // New endpoint for guide
router.get('/pending', verifyUserToken, getPendingBookings); // New endpoint for guides
router.get("/debug-token", verifyUserToken, (req, res) => {
    res.json({
      message: "Token is valid!",
      userId: req.userId,
    });
  });

module.exports = router;
