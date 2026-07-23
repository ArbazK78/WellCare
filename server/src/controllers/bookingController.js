// server/src/controllers/bookingController.js

const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('../services/dispatchService');

// Helper: generate a unique human-readable booking reference ID
const crypto = require('crypto');
const generateBookingRefId = () => `B${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

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
    // BM-6 fix: Replaced non-deterministic Math.random() to prevent fare gaming.
    // Fare is now deterministically calculated based on vehicle type and location string lengths.
    const baseFare = vehicleType === 'cab' ? 150 : 50;
    const distanceProxy = (pickupLocation?.length || 0) + (destinationAddress?.length || 0);
    const calculatedFare = baseFare + (distanceProxy * 2);

    const newBooking = new Booking({
      vehicleType,
      totalFare: calculatedFare,
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
      status: { $in: ['pending', 'accepted', 'arrived', 'in_progress'] },
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

    // BC-3 fix: Only the customer who created the booking can cancel it
    if (!booking.customer || booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this booking' });
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
// PAY BOOKING (mark payment as completed)
// ---------------------------------------------------------------------------
// BC-4 / BC-8 fix: This legacy direct-pay endpoint is DISABLED.
// All payments must go through Razorpay via POST /api/payments/create-order
// and POST /api/payments/verify. Direct payment marking is not allowed.
exports.payBooking = async (req, res) => {
  return res.status(410).json({
    message: 'Direct payment is no longer supported. Please use the Razorpay payment flow.',
  });
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

    // BC-6 fix: Only the customer who owns this booking can poll its status
    if (!booking.customer || booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this booking' });
    }

    res.json({ status: booking.status, guide: booking.guide });
  } catch (error) {
    console.error('❌ Error fetching booking status:', error);
    res.status(500).json({ message: 'Error fetching booking status' });
  }
};

// ---------------------------------------------------------------------------
// START TRIP (Verify Safety PIN)
// ---------------------------------------------------------------------------
exports.startTrip = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { pin } = req.body;
    const guideId = req.guide?.id;

    const booking = await Booking.findById(bookingId).populate('customer', 'safetyPin name phone email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Ensure only the assigned guide can start the trip
    if (booking.guide.toString() !== guideId) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    if (String(booking.customer.safetyPin).trim() !== String(pin).trim()) {
      // BC-10 fix: Never log the actual PIN value
      console.log(`❌ PIN mismatch for booking ${bookingId}`);
      return res.status(400).json({ message: 'Invalid Safety PIN' });
    }

    booking.status = 'in_progress';
    await booking.save();

    // Re-populate to match standard return shape if needed
    await booking.populate('guide', 'name image rating phone');

    res.json({ message: 'Trip started successfully', booking });
  } catch (error) {
    console.error('❌ Error starting trip:', error);
    res.status(500).json({ message: 'Server error while starting trip' });
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
      
      // BH-8 fix: Removed redundant Guide require inside hot function
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
    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
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
    
    // BH-2 fix: autoRotateExpiredOffers was moved to a background cron in server.js
    // to prevent DB thrashing on every poll.
    
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
      status: { $in: ['accepted', 'arrived', 'in_progress'] },
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
// LEGACY: acceptBooking — BC-7 fix: DISABLED. Was using user token on a guide
// action with no guide ownership check. Use PUT /:id/status with guide token.
// ---------------------------------------------------------------------------
exports.acceptBooking = async (req, res) => {
  return res.status(410).json({
    message: 'This endpoint is deprecated. Use PUT /api/bookings/:id/status with a guide token.',
  });
};

// ---------------------------------------------------------------------------
// LEGACY: getPendingBookings — BC-8 fix: DISABLED. Exposed all system bookings
// to any authenticated user. Guide-specific pending bookings are at
// GET /api/bookings/guide/pending (protected by verifyGuideToken).
// ---------------------------------------------------------------------------
exports.getPendingBookings = async (req, res) => {
  return res.status(410).json({
    message: 'This endpoint is deprecated. Guides should use GET /api/bookings/guide/pending.',
  });
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
