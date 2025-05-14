// server/src/controllers/bookingController.js

const Booking = require('../models/Booking');

exports.createBooking = async (req, res) => {
  try {
    const { service, guide, date, time, location, waitingHours } = req.body;

    const newBooking = new Booking({
      service,
      guide,
      customer: req.userId,
      date,
      time,
      location,
      waitingHours: waitingHours || 0,
      status: 'pending', // ✅ Set initial status to 'pending'
    });

    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  } catch (error) {
    console.error("Booking creation failed:", error);
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

exports.getUserBookings = async (req, res) => {
  console.log("Decoded user from token:", req.user);
  console.log("🔍 Getting bookings for userId:", req.userId);

  try {
    const bookings = await Booking.find({ customer: req.userId, status: 'accepted' }) // ✅ Initially show only accepted bookings
      .populate("guide", "name image rating")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

// A function to check if user has more than one active booking
exports.checkActiveBooking = async (req, res) => {
  try {
    const customerId = req.userId;
    const activeStatuses = ['pending', 'accepted'];

    const activeBooking = await Booking.findOne({
      customer: customerId,
      status: { $in: activeStatuses }
    });

    res.json({ activeBooking: !!activeBooking }); // Send true if active booking exists, false otherwise

  } catch (error) {
    console.error('Error checking active booking:', error);
    res.status(500).json({ message: 'Server error while checking active booking' });
  }
};

// A function to delete the bookings if user choose to delete from frontend and backend
exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
};

// ✅ NEW FUNCTION: Get the status of a specific booking
exports.getBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ status: booking.status });
  } catch (error) {
    console.error('Error fetching booking status:', error);
    res.status(500).json({ message: 'Error fetching booking status' });
  }
};

// ✅ NEW FUNCTION: For a guide to accept a specific booking
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'accepted' /* You might also want to set the guideId here if you haven't already */ },
      { new: true } // Returns the updated document
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking accepted successfully', booking });
  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ message: 'Error accepting booking' });
  }
};

// ✅ NEW FUNCTION: Get all pending bookings (for guides)
exports.getPendingBookings = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({ status: 'pending' })
      .populate("customer", "name") // Optionally populate customer info
      .populate("guide", "name");    // Optionally populate guide info (though might be null initially)
    res.json(pendingBookings);
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    res.status(500).json({ message: 'Error fetching pending bookings' });
  }
};