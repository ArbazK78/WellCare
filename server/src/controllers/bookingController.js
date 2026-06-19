// server/src/controllers/bookingController.js

const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('../services/dispatchService');

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
      name,
      date,
      time,
      pickupLocation,
      destinationAddress,
      vehicleType,
      dropBack,
      waitingHours,
      bookingMode,
      metadata,
    } = req.body;

    console.log("📥 Received booking payload:", req.body);

    // ALPHA: All approved guides are eligible for every booking.
    // Specialty-based filtering was silently excluding guides whose profile
    // specialties didn't exactly match the booked service string.
    // TODO (post-Alpha): Re-introduce specialty + vehicleType matching once
    // guide profiles are standardised and tested end-to-end.
    const allApproved = await Guide.find({ status: 'approved', isOnline: true }).select('_id');
    const eligibleGuideIds = allApproved.map(g => g._id);

    if (eligibleGuideIds.length === 0) {
      return res.status(400).json({ message: 'No approved guides available at the moment. Please try again later.' });
    }

    console.log(`📋 Booking request → ${eligibleGuideIds.length} eligible guide(s)`);

    const bookingRefId = generateBookingRefId();

    const newBooking = new Booking({
      vehicleType,
      pickupLocation,
      destinationAddress,
      dropBack: dropBack || false,
      bookingMode: bookingMode || 'now',
      metadata: metadata || {},
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
    
    // Only start immediate waterfall dispatch if booking is for 'now'
    if (savedBooking.bookingMode === 'now') {
      await dispatchService.initiateDispatch(savedBooking._id, eligibleGuideIds);
      console.log(`✅ Booking ${savedBooking._id} created and dispatched — vehicleType: ${vehicleType}`);
    } else {
      console.log(`✅ Scheduled Booking ${savedBooking._id} created (no instant dispatch).`);
    }

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
    const activeBookings = await Booking.find({
      customer: req.userId,
      status: { $in: ['pending', 'accepted'] },
    });

    res.json({ activeBookings });
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
  const { reason } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    booking.cancelReason = reason || 'No reason provided';
    booking.cancelledBy = 'customer';
    booking.cancelledAt = new Date();
    await booking.save();

    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
};

// ---------------------------------------------------------------------------
// GET RECENT CANCELLATIONS FOR GUIDE (Polled by Guide Dashboard)
// ---------------------------------------------------------------------------
exports.getGuideRecentCancellations = async (req, res) => {
  try {
    const guideId = req.guide.id;
    // Look for bookings assigned to this guide that were cancelled in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const cancelledBookings = await Booking.find({
      guide: guideId,
      status: 'cancelled',
      cancelledBy: 'customer',
      cancelledAt: { $gte: twoMinutesAgo },
    })
      .populate('customer', 'name phone')
      .sort({ cancelledAt: -1 });

    res.json(cancelledBookings);
  } catch (error) {
    console.error('❌ Error fetching recent cancellations for guide:', error);
    res.status(500).json({ message: 'Server error while fetching recent cancellations' });
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
          // eligibleGuides: [], // keep legacy queue for re-dispatch if cancelled
          guideQueue: [],     // clear waterfall queue
          currentOfferedGuide: null,
          offerExpiresAt: null,
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
      // Force rotation to the next guide instantly!
      await dispatchService.rotateToNextGuide(bookingId);
      
      const updatedBooking = await Booking.findById(bookingId);

      return res.json({ message: 'Booking passed — removed from your queue', booking: updatedBooking });
    }

    // --- GUIDE CANCEL (guide cancels AFTER accepting) ---
    if (status === 'guide_cancelled' && guideId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      
      const Guide = require('../models/Guide');
      const onlineGuides = await Guide.find({ status: 'approved', isOnline: true });
      const onlineGuideIds = onlineGuides.map(g => g._id.toString()).filter(id => id !== guideId);

      booking.status = 'pending';
      booking.guide = null; 
      booking.cancelReason = req.body.reason || 'Guide cancelled';
      await booking.save();

      await dispatchService.initiateDispatch(bookingId, onlineGuideIds);

      return res.json({ message: 'Booking cancelled and passed to queue', booking });
    }

    // --- COMPLETE / ARRIVED ---
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
// Uses Waterfall Dispatch — queries for bookings currently offered to this guide
// ---------------------------------------------------------------------------
exports.getGuidePendingBookings = async (req, res) => {
  try {
    const guideId = req.guide.id;
    
    // Check and rotate any expired offers across the system before querying
    await dispatchService.autoRotateExpiredOffers();

    console.log('🔍 Fetching pending bookings for guide:', guideId);

    const pendingBookings = await Booking.find({
      currentOfferedGuide: guideId,
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
