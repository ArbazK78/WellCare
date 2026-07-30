// server/src/controllers/bookingController.js

const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('../services/dispatchService');
const scheduledBookingService = require('../services/scheduledBookingService');
const fareCalculationService = require('../services/fareCalculationService');
const {
  ACTIVE_ASSIGNED_STATUSES,
  canAssignedGuideTransition,
  getCustomerCancellationResult,
  isAssignedGuide,
} = require('../services/bookingStateMachine');

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

    const normalizedMode = bookingMode === 'schedule' ? 'schedule' : 'now';
    const requiredValues = { name, date, time, pickupLocation, destinationAddress, vehicleType };
    const missingField = Object.entries(requiredValues).find(([, value]) => !value);
    if (missingField) {
      return res.status(400).json({ message: `${missingField[0]} is required` });
    }

    let scheduledAt = null;
    let dispatchAt = null;
    if (normalizedMode === 'schedule') {
      scheduledAt = scheduledBookingService.parseScheduledDateTime(date, time);
      if (!scheduledAt) {
        return res.status(400).json({ message: 'Scheduled date and time are invalid' });
      }
      if (scheduledAt <= new Date()) {
        return res.status(400).json({ message: 'Scheduled pickup must be in the future' });
      }
      dispatchAt = scheduledBookingService.getDispatchAt(scheduledAt);
    }

    // Matching remains intentionally broad until guide capabilities are
    // standardised. Scheduled bookings are matched at release time.
    let eligibleGuideIds = [];
    if (normalizedMode === 'now') {
      const allApproved = await Guide.find({ status: 'approved', isOnline: true }).select('_id');
      eligibleGuideIds = allApproved.map((guide) => guide._id);
    }
    const bookingRefId = generateBookingRefId();
    // Recalculate on the trusted server at booking creation. The customer-facing
    // estimate is informational and is never accepted as the payable amount.
    const fare = await fareCalculationService.calculateFare({
      pickupLocation,
      destinationAddress,
      vehicleType,
      dropBack,
    });

    const newBooking = new Booking({
      vehicleType,
      totalFare: fare.totalFare,
      distanceKm: fare.distanceKm,
      durationMin: fare.durationMin,
      fareBreakdown: fare.fareBreakdown,
      pickupLocation,
      destinationAddress,
      dropBack: dropBack || false,
      bookingMode: normalizedMode,
      scheduledAt,
      dispatchAt,
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
    
    // Immediate requests and scheduled requests already inside the lead window
    // enter the same waterfall now. Future requests are handled by the scheduler.
    if (savedBooking.bookingMode === 'now' || savedBooking.dispatchAt <= new Date()) {
      if (savedBooking.bookingMode === 'schedule') {
        savedBooking.dispatchStartedAt = new Date();
        await savedBooking.save();
      }
      if (eligibleGuideIds.length === 0) {
        const guides = await Guide.find({ status: 'approved', isOnline: true }).select('_id');
        eligibleGuideIds = guides.map((guide) => guide._id);
      }
      await dispatchService.initiateDispatch(savedBooking._id, eligibleGuideIds);
      console.log(`Booking ${savedBooking._id} entered the dispatch window`);
    } else {
      console.log(`Scheduled booking ${savedBooking._id} will dispatch at ${savedBooking.dispatchAt.toISOString()}`);
    }
    res.status(201).json(savedBooking);
  } catch (error) {
    if (error instanceof fareCalculationService.FareCalculationError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    console.error('Booking creation failed:', error);
    return res.status(500).json({ message: 'Server error while creating booking' });
  }
};

// ---------------------------------------------------------------------------
// FARE ESTIMATE
// Provides customer-facing route details. Creation always recalculates them.
// ---------------------------------------------------------------------------
exports.estimateFare = async (req, res) => {
  try {
    const { pickupLocation, destinationAddress, vehicleType, dropBack } = req.body;
    const estimate = await fareCalculationService.calculateFare({
      pickupLocation,
      destinationAddress,
      vehicleType,
      dropBack,
    });
    return res.json(estimate);
  } catch (error) {
    if (error instanceof fareCalculationService.FareCalculationError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    console.error('Fare estimate failed:', error);
    return res.status(500).json({ message: 'Unable to estimate the fare' });
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
      $or: [
        { status: { $in: ['accepted', 'arrived', 'in_progress'] } },
        { status: 'pending', bookingMode: 'now' },
        { status: 'pending', bookingMode: 'schedule', dispatchStartedAt: { $ne: null } },
      ],
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

    const cancellationResult = getCustomerCancellationResult(booking.status);

    if (cancellationResult === 'already_cancelled') {
      return res.status(200).json({
        message: 'Booking was already cancelled',
        booking,
      });
    }

    if (cancellationResult === 'blocked') {
      return res.status(409).json({ message: 'This booking can no longer be cancelled' });
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
    if (!isAssignedGuide(booking, guideId)) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    if (booking.status !== 'arrived') {
      return res.status(409).json({ message: 'The guide must mark arrival before starting the trip' });
    }

    if (!pin || String(booking.customer.safetyPin).trim() !== String(pin).trim()) {
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
    const guideId = req.guide.id;

    if (status === 'accepted') {
      const booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          status: 'pending',
          currentOfferedGuide: guideId,
          offerExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: 'accepted',
            guide: guideId,
            guideQueue: [],
            currentOfferedGuide: null,
            offerExpiresAt: null,
          },
        },
        { new: true, runValidators: true }
      )
        .populate('customer', 'name phone email')
        .populate('guide', 'name image rating phone');

      if (!booking) {
        return res.status(409).json({ message: 'This offer is no longer available to you.' });
      }
      return res.json({ message: 'Booking accepted successfully', booking });
    }

    if (status === 'rejected') {
      const booking = await Booking.findOne({
        _id: bookingId,
        status: 'pending',
        currentOfferedGuide: guideId,
      });
      if (!booking) {
        return res.status(409).json({ message: 'This offer is no longer available to you.' });
      }

      await dispatchService.rotateToNextGuide(bookingId, guideId);
      return res.json({
        message: 'Booking passed to the next available guide',
        booking: await Booking.findById(bookingId),
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!isAssignedGuide(booking, guideId)) {
      return res.status(403).json({ message: 'You are not assigned to this booking' });
    }

    if (status === 'guide_cancelled') {
      if (!ACTIVE_ASSIGNED_STATUSES.has(booking.status)) {
        return res.status(409).json({ message: 'This booking can no longer be cancelled by a guide' });
      }

      const guides = await Guide.find({ status: 'approved', isOnline: true }).select('_id');
      const eligibleGuideIds = guides
        .map((guide) => guide._id)
        .filter((id) => id.toString() !== guideId);

      booking.status = 'pending';
      booking.guide = null;
      booking.currentOfferedGuide = null;
      booking.offerExpiresAt = null;
      booking.cancelReason = req.body.reason || 'Guide cancelled';
      await booking.save();
      await dispatchService.initiateDispatch(bookingId, eligibleGuideIds);
      return res.json({ message: 'Booking returned to the guide queue', booking });
    }

    if (!canAssignedGuideTransition(booking.status, status)) {
      return res.status(409).json({
        message: `Cannot move booking from ${booking.status} to ${status}`,
      });
    }

    booking.status = status;
    if (status === 'completed') booking.completedAt = new Date();
    await booking.save();
    await booking.populate('customer', 'name phone email');
    await booking.populate('guide', 'name image rating phone');

    return res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('Booking status update failed:', error);
    return res.status(500).json({ message: 'Error updating booking status' });
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
