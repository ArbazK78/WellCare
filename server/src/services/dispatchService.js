const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const fareCalculationService = require('./fareCalculationService');

// Fisher-Yates Shuffle for randomization
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const OFFER_DURATION_MS = 30 * 1000; // Per-guide response window
const DISPATCH_DURATION_MS = 90 * 1000; // Total matching window

const findScheduledFallbackGuides = async (booking, { excludeGuideId, now = new Date() } = {}) => {
  const freshSince = new Date(now.getTime() - 5 * 60 * 1000);
  const guides = await Guide.find({
    status: 'approved',
    isOnline: true,
    vehicleType: 'cab',
    'currentLocation.updatedAt': { $gte: freshSince },
    'currentLocation.accuracy': { $lte: 500 },
    ...(excludeGuideId ? { _id: { $ne: excludeGuideId } } : {}),
  }).select('_id currentLocation');

  const ranked = [];
  for (const guide of guides) {
    const conflict = await Booking.exists({
      _id: { $ne: booking._id },
      guide: guide._id,
      bookingMode: 'schedule',
      reservationStatus: { $in: ['claimed', 'readiness_pending', 'ready', 'fulfilled'] },
      status: { $nin: ['cancelled', 'completed'] },
      scheduledAt: { $lt: new Date(booking.estimatedEndAt.getTime() + 30 * 60 * 1000) },
      estimatedEndAt: { $gt: new Date(booking.scheduledAt.getTime() - 30 * 60 * 1000) },
    });
    if (conflict) continue;
    try {
      const route = await fareCalculationService.calculateFare({
        pickupLocation: JSON.stringify({ lat: guide.currentLocation.lat, lng: guide.currentLocation.lng }),
        destinationAddress: booking.pickupLocation,
        vehicleType: 'cab',
        dropBack: false,
      });
      const remainingMinutes = (booking.scheduledAt.getTime() - now.getTime()) / 60000;
      if (route.durationMin + 2 <= remainingMinutes) ranked.push({ id: guide._id, eta: route.durationMin });
    } catch (error) {
      console.error(`Fallback ETA failed for guide ${guide._id}:`, error.message);
    }
  }
  return ranked.sort((a, b) => a.eta - b.eta).map((candidate) => candidate.id);
};
/**
 * Initializes the dispatch sequence for a newly created booking.
 */
exports.initiateDispatch = async (bookingId, matchedGuideIds, { durationMs = DISPATCH_DURATION_MS, randomize = true } = {}) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  booking.dispatchStartedAt = booking.dispatchStartedAt || new Date();
  booking.dispatchExpiresAt = booking.dispatchExpiresAt
    || new Date(booking.dispatchStartedAt.getTime() + durationMs);

  // Zero supply is not an immediate failure. Keep the request open so a guide
  // who comes online during the matching window can still receive it.
  if (matchedGuideIds.length === 0) {
    await booking.save();
    return;
  }

  // Randomize the queue for fair dispatching
  const queue = randomize ? shuffleArray([...matchedGuideIds]) : [...matchedGuideIds];
  
  // Pop the first guide to offer
  const firstGuide = queue.shift();

  booking.guideQueue = queue;
  booking.currentOfferedGuide = firstGuide;
  booking.offerExpiresAt = new Date(Date.now() + OFFER_DURATION_MS);
  
  // Keep eligibleGuides populated just in case legacy logic relies on it
  booking.eligibleGuides = [...new Set([...(booking.eligibleGuides || []).map((id) => id.toString()), ...matchedGuideIds.map((id) => id.toString())])];

  await booking.save();
  console.log(`🚀 Dispatch initiated for Booking ${booking.bookingRefId}. Offered to: ${firstGuide}`);
};

/**
 * Force rotates a booking to the next guide in the queue (e.g. when rejected).
 */
exports.rotateToNextGuide = async (bookingId, expectedGuideId = null) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== 'pending') return false;

  const currentGuideId = booking.currentOfferedGuide?.toString();
  if (expectedGuideId && currentGuideId !== expectedGuideId.toString()) return false;

  const remainingQueue = [...(booking.guideQueue || [])];
  const nextGuide = remainingQueue.shift();
  const filter = {
    _id: bookingId,
    status: 'pending',
    currentOfferedGuide: booking.currentOfferedGuide,
  };

  if (nextGuide) {
    const rotated = await Booking.findOneAndUpdate(
      filter,
      {
        $set: {
          guideQueue: remainingQueue,
          currentOfferedGuide: nextGuide,
          offerExpiresAt: new Date(Date.now() + OFFER_DURATION_MS),
        },
      },
      { new: true, runValidators: true }
    );
    if (!rotated) return false;
    console.log(`Booking ${booking.bookingRefId} rotated to guide ${nextGuide}`);
    return true;
  }

  // Keep the booking open until the overall 90-second deadline. A newly-online
  // guide may still become eligible during the remaining matching window.
  const waiting = await Booking.findOneAndUpdate(
    filter,
    { $set: { currentOfferedGuide: null, offerExpiresAt: null, guideQueue: [] } },
    { new: true, runValidators: true }
  );
  return Boolean(waiting);
};
/**
 * Finds all pending bookings with an expired offer and rotates them.
 * This is called automatically when any guide polls for bookings.
 */
exports.autoRotateExpiredOffers = async () => {
  try {
    const now = new Date();

    const expiredDispatches = await Booking.find({
      status: 'pending',
      dispatchExpiresAt: { $ne: null, $lte: now },
    });
    for (const booking of expiredDispatches) {
      booking.currentOfferedGuide = null;
      booking.offerExpiresAt = null;
      booking.status = 'cancelled';
      booking.cancelReason = booking.bookingMode === 'schedule'
        ? 'We could not secure a cab guide before the scheduled fulfilment cutoff. No charge was made.'
        : 'We could not find an available guide within 90 seconds. No charge was made.';
      booking.cancelledBy = 'system';
      booking.cancelledAt = now;
      if (booking.bookingMode === 'schedule') {
        booking.reservationStatus = 'unfulfilled';
        booking.reservationAudit.push({ event: 'reservation_unfulfilled', at: now, actor: 'system' });
      }
      await booking.save();
    }

    // A guide polling after coming online can claim requests that began with no supply.
    const waitingBookings = await Booking.find({
      status: 'pending',
      dispatchExpiresAt: { $gt: now },
      currentOfferedGuide: null,
      offerExpiresAt: null,
    });
    if (waitingBookings.length > 0) {
      for (const booking of waitingBookings) {
        const attempted = new Set((booking.eligibleGuides || []).map((id) => id.toString()));
        const candidateIds = booking.bookingMode === 'schedule'
          ? await findScheduledFallbackGuides(booking, { now })
          : (await Guide.find({ status: 'approved', isOnline: true }).select('_id')).map((guide) => guide._id);
        const newGuideIds = candidateIds.filter((id) => !attempted.has(id.toString()));
        if (newGuideIds.length > 0) {
          booking.eligibleGuides = [...(booking.eligibleGuides || []), ...newGuideIds];
          await booking.save();
          await exports.initiateDispatch(booking._id, newGuideIds, { randomize: booking.bookingMode !== 'schedule' });
        }
      }
    }

    const expiredBookings = await Booking.find({
      status: 'pending',
      offerExpiresAt: { $ne: null, $lt: now },
      dispatchExpiresAt: { $gt: now }
    });

    for (const booking of expiredBookings) {
      console.log(`⏰ Offer expired for Booking ${booking.bookingRefId}. Rotating...`);
      await exports.rotateToNextGuide(booking._id, booking.currentOfferedGuide);
    }
  } catch (err) {
    console.error('Error auto-rotating expired offers:', err);
  }
};

exports.DISPATCH_DURATION_MS = DISPATCH_DURATION_MS;
exports.findScheduledFallbackGuides = findScheduledFallbackGuides;
