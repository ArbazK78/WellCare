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
exports.rotateToNextGuide = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  // If the booking is already accepted or cancelled, do nothing.
  if (!booking || booking.status !== 'pending') return;

  if (booking.guideQueue && booking.guideQueue.length > 0) {
    const nextGuide = booking.guideQueue.shift();
    booking.currentOfferedGuide = nextGuide;
    booking.offerExpiresAt = new Date(Date.now() + OFFER_DURATION_MS);
    await booking.save();
    console.log(`🔄 Booking ${booking.bookingRefId} rotated to guide: ${nextGuide}`);
  } else {
    // Queue is empty, auto-cancel
    booking.currentOfferedGuide = null;
    booking.offerExpiresAt = null;
    booking.status = 'cancelled';
    booking.cancelReason = 'All matched guides rejected or timed out';
    booking.cancelledBy = 'system';
    await booking.save();
    console.log(`❌ Booking ${booking.bookingRefId} auto-cancelled. No guides left in queue.`);
  }
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
      await exports.rotateToNextGuide(booking._id);
    }
  } catch (err) {
    console.error('Error auto-rotating expired offers:', err);
  }
};
