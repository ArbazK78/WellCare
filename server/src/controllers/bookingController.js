// server/src/controllers/bookingController.js

const Booking = require('../models/Booking');
const Guide = require('../models/Guide');

// Helper: generate a unique human-readable booking reference ID
const generateBookingRefId = () => `B${Date.now()}`;

// ---------------------------------------------------------------------------
// CREATE BOOKING
// Finds all approved guides whose specialties match the booked service and
// stores them in eligibleGuides so every matched guide sees the request.
// ---------------------------------------------------------------------------
exports.createBooking = async (req, res) => {
  try {
    const {
      service,
      name,
      date,
      time,
      pickupLocation,
      destinationAddress,
      vehicleType,
      dropBack,
      waitingHours,
    } = req.body;

    // Find all approved guides whose specialties include the requested service
    const eligibleGuides = await Guide.find({
      status: 'approved',
      specialties: { $regex: new RegExp(service, 'i') },
    }).select('_id');

    let eligibleGuideIds = eligibleGuides.map(g => g._id);

    // Fallback: broadcast to ALL approved guides if no specialty match found
    if (eligibleGuideIds.length === 0) {
      console.warn(`⚠️ No guides found with specialty matching "${service}". Falling back to all approved guides.`);
      const allApproved = await Guide.find({ status: 'approved' }).select('_id');
      eligibleGuideIds = allApproved.map(g => g._id);
    }

    // TODO (PENDING): Filter eligibleGuides further by vehicleType once
    // guides have a vehicleType field on their profile.

    console.log(`📋 Booking service: "${service}" → ${eligibleGuideIds.length} eligible guide(s)`);

    const bookingRefId = generateBookingRefId();

    const newBooking = new Booking({
      service,
      vehicleType,
      pickupLocation,
      destinationAddress,
      dropBack: dropBack || false,
      eligibleGuides: eligibleGuideIds,
      customer: req.userId,
      name,
      date,
      time,
      waitingHours: waitingHours || 0,
      status: 'pending',
      bookingRefId,
    });

    const savedBooking = await newBooking.save();
    console.log(`✅ Booking ${savedBooking._id} created — vehicleType: ${vehicleType}, dropBack: ${dropBack}`);

    res.status(201).json(savedBooking);
  } catch (error) {
    console.error('❌ Booking creation failed:', error);
    res.status(500).json({ message: 'Server error while creating booking' });
  }
};

// ---------------------------------------------------------------------------
// GET USER BOOKINGS
// ---------------------------------------------------------------------------
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.userId })
      .populate('guide', 'name image rating phone') // phone included for Contact Guide
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('❌ Failed to fetch bookings:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
};

// ---------------------------------------------------------------------------
// CHECK ACTIVE BOOKING (prevent duplicate active bookings per user)
// ---------------------------------------------------------------------------
exports.checkActiveBooking = async (req, res) => {
  try {
    const activeBooking = await Booking.findOne({
      customer: req.userId,
      status: { $in: ['pending', 'accepted'] },
    });

    res.json({ activeBooking: !!activeBooking });
  } catch (error) {
    console.error('❌ Error checking active booking:', error);
    res.status(500).json({ message: 'Server error while checking active booking' });
  }
};

// ---------------------------------------------------------------------------
// CANCEL BOOKING (user-initiated deletion)
// ---------------------------------------------------------------------------
exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
};

// ---------------------------------------------------------------------------
// GET BOOKING STATUS (polled by user's confirmation page)
// ---------------------------------------------------------------------------
exports.getBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guide', 'name image rating');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ status: booking.status, guide: booking.guide });
  } catch (error) {
    console.error('❌ Error fetching booking status:', error);
    res.status(500).json({ message: 'Error fetching booking status' });
  }
};

// ---------------------------------------------------------------------------
// UPDATE BOOKING STATUS (guide accepts / rejects / completes)
//
// ACCEPT:
//   Uses findOneAndUpdate with { status: 'pending' } filter to prevent race
//   conditions — only one guide can win even with simultaneous requests.
//   Sets guide = acceptingGuideId, clears eligibleGuides.
//
// REJECT (pass):
//   Does NOT change booking status. Instead, $pull removes only the rejecting
//   guide from eligibleGuides, keeping the booking visible to remaining guides.
//   If eligibleGuides becomes empty, booking is auto-cancelled (no guide left).
//
// COMPLETE:
//   Standard status update to 'completed'.
// ---------------------------------------------------------------------------
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const guideId = req.guide?.id;

    // --- ACCEPT ---
    if (status === 'accepted' && guideId) {
      // Atomic check-and-set: only succeeds if booking is still pending
      const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, status: 'pending' }, // guard — prevents double acceptance
        {
          status: 'accepted',
          guide: guideId,
          eligibleGuides: [], // clear queue — no other guide sees this anymore
        },
        { new: true }
      )
        .populate('customer', 'name phone email')
        .populate('guide', 'name image rating phone');

      if (!booking) {
        // Either not found, or another guide already accepted it
        return res.status(409).json({
          message: 'Booking is no longer available — it may have already been accepted by another guide.',
        });
      }

      return res.json({ message: 'Booking accepted successfully', booking });
    }

    // --- REJECT (guide passes on booking) ---
    if (status === 'rejected' && guideId) {
      // Remove this guide from eligibleGuides, but keep booking alive for others
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { $pull: { eligibleGuides: guideId } },
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // If no guides are left to claim this booking, auto-cancel it
      if (booking.eligibleGuides.length === 0 && booking.status === 'pending') {
        await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' });
        return res.json({ message: 'Booking cancelled — no guides available', booking });
      }

      return res.json({ message: 'Booking passed — removed from your queue', booking });
    }

    // --- COMPLETE ---
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    )
      .populate('customer', 'name phone email')
      .populate('guide', 'name image rating phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

// ---------------------------------------------------------------------------
// GET GUIDE'S PENDING BOOKINGS
// Queries the eligibleGuides array — all matched guides see the same requests
// ---------------------------------------------------------------------------
exports.getGuidePendingBookings = async (req, res) => {
  try {
    const guideId = req.guide.id;
    console.log('🔍 Fetching pending bookings for guide:', guideId);

    const pendingBookings = await Booking.find({
      eligibleGuides: guideId,   // Guide is in the eligible list
      status: 'pending',
    })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${pendingBookings.length} pending booking(s) for guide ${guideId}`);
    res.json(pendingBookings);
  } catch (error) {
    console.error('❌ Error fetching guide pending bookings:', error);
    res.status(500).json({ message: 'Error fetching pending bookings' });
  }
};

// ---------------------------------------------------------------------------
// GET GUIDE'S ACCEPTED BOOKINGS
// ---------------------------------------------------------------------------
exports.getGuideAcceptedBookings = async (req, res) => {
  try {
    const guideId = req.guide.id;
    console.log('🔍 Fetching accepted bookings for guide:', guideId);

    const acceptedBookings = await Booking.find({
      guide: guideId,
      status: 'accepted',
    })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${acceptedBookings.length} accepted booking(s) for guide ${guideId}`);
    res.json(acceptedBookings);
  } catch (error) {
    console.error('❌ Error fetching guide accepted bookings:', error);
    res.status(500).json({ message: 'Error fetching accepted bookings' });
  }
};

// ---------------------------------------------------------------------------
// GET GUIDE'S COMPLETED BOOKINGS
// ---------------------------------------------------------------------------
exports.getGuideCompletedBookings = async (req, res) => {
  try {
    const guideId = req.guide.id;
    console.log('🔍 Fetching completed bookings for guide:', guideId);

    const completedBookings = await Booking.find({
      guide: guideId,
      status: 'completed',
    })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${completedBookings.length} completed booking(s) for guide ${guideId}`);
    res.json(completedBookings);
  } catch (error) {
    console.error('❌ Error fetching guide completed bookings:', error);
    res.status(500).json({ message: 'Error fetching completed bookings' });
  }
};

// ---------------------------------------------------------------------------
// LEGACY: Accept booking (kept for backwards compat with old route)
// ---------------------------------------------------------------------------
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'accepted' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking accepted successfully', booking });
  } catch (error) {
    console.error('❌ Error accepting booking:', error);
    res.status(500).json({ message: 'Error accepting booking' });
  }
};

// ---------------------------------------------------------------------------
// LEGACY: Get all pending bookings regardless of guide (kept for old routes)
// ---------------------------------------------------------------------------
exports.getPendingBookings = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({ status: 'pending' })
      .populate('customer', 'name')
      .populate('guide', 'name');
    res.json(pendingBookings);
  } catch (error) {
    console.error('❌ Error fetching pending bookings:', error);
    res.status(500).json({ message: 'Error fetching pending bookings' });
  }
};

// ---------------------------------------------------------------------------
// GET BOOKING BY ID — used by BookingConfirmationPage
// ---------------------------------------------------------------------------
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guide', 'name image rating phone')
      .populate('customer', 'name phone email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ownership check: only the customer who made the booking can fetch it
    if (booking.customer._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(booking);
  } catch (error) {
    console.error('❌ Error fetching booking by ID:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
};
