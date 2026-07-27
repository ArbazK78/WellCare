const Booking = require('../models/Booking');

// Fisher-Yates Shuffle for randomization
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const OFFER_DURATION_MS = 30 * 1000; // 30 seconds

/**
 * Initializes the dispatch sequence for a newly created booking.
 */
exports.initiateDispatch = async (bookingId, matchedGuideIds) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || matchedGuideIds.length === 0) {
    if (booking) {
      booking.status = 'cancelled';
      booking.cancelReason = 'No eligible guides found';
      booking.cancelledBy = 'system';
    booking.cancelledAt = new Date();
      await booking.save();
    }
    return;
  }

  // Randomize the queue for fair dispatching
  const queue = shuffleArray([...matchedGuideIds]);
  
  // Pop the first guide to offer
  const firstGuide = queue.shift();

  booking.guideQueue = queue;
  booking.currentOfferedGuide = firstGuide;
  booking.offerExpiresAt = new Date(Date.now() + OFFER_DURATION_MS);
  
  // Keep eligibleGuides populated just in case legacy logic relies on it
  booking.eligibleGuides = matchedGuideIds; 

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

  const cancelled = await Booking.findOneAndUpdate(
    filter,
    {
      $set: {
        currentOfferedGuide: null,
        offerExpiresAt: null,
        status: 'cancelled',
        cancelReason: 'All matched guides rejected or timed out',
        cancelledBy: 'system',
        cancelledAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
  if (!cancelled) return false;
  console.log(`Booking ${booking.bookingRefId} auto-cancelled: no guides remain`);
  return true;
};
/**
 * Finds all pending bookings with an expired offer and rotates them.
 * This is called automatically when any guide polls for bookings.
 */
exports.autoRotateExpiredOffers = async () => {
  try {
    const expiredBookings = await Booking.find({
      status: 'pending',
      offerExpiresAt: { $ne: null, $lt: new Date() }
    });

    for (const booking of expiredBookings) {
      console.log(`⏰ Offer expired for Booking ${booking.bookingRefId}. Rotating...`);
      await exports.rotateToNextGuide(booking._id, booking.currentOfferedGuide);
    }
  } catch (err) {
    console.error('Error auto-rotating expired offers:', err);
  }
};
