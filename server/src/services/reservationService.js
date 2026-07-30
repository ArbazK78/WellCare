const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('./dispatchService');
const fareCalculationService = require('./fareCalculationService');

const MIN_LEAD_TIME_MS = 30 * 60 * 1000;
const MAX_ADVANCE_TIME_MS = 90 * 24 * 60 * 60 * 1000;
const READINESS_LEAD_TIME_MS = 45 * 60 * 1000;
const FALLBACK_LEAD_TIME_MS = 25 * 60 * 1000;
const FULFILMENT_LEAD_TIME_MS = 10 * 60 * 1000;
const CONFLICT_BUFFER_MS = 30 * 60 * 1000;

const getReservationTimeline = (scheduledAt) => ({
  readinessDeadline: new Date(scheduledAt.getTime() - READINESS_LEAD_TIME_MS),
  fallbackDispatchAt: new Date(scheduledAt.getTime() - FALLBACK_LEAD_TIME_MS),
  fulfilmentDeadline: new Date(scheduledAt.getTime() - FULFILMENT_LEAD_TIME_MS),
});

const validateReservationWindow = (scheduledAt, now = new Date()) => {
  const leadTime = scheduledAt.getTime() - now.getTime();
  if (leadTime < MIN_LEAD_TIME_MS) return 'too_soon';
  if (leadTime > MAX_ADVANCE_TIME_MS) return 'too_far';
  return 'valid';
};

const getEstimatedEndAt = ({ scheduledAt, durationMin = 0, waitingHours = 0 }) => (
  new Date(scheduledAt.getTime() + ((Number(durationMin) + Number(waitingHours) * 60) * 60 * 1000))
);

const hasScheduleConflict = async (guideId, booking, { excludeBookingId } = {}) => {
  const start = new Date(booking.scheduledAt.getTime() - CONFLICT_BUFFER_MS);
  const end = new Date(booking.estimatedEndAt.getTime() + CONFLICT_BUFFER_MS);
  const query = {
    guide: guideId,
    bookingMode: 'schedule',
    reservationStatus: { $in: ['claimed', 'readiness_pending', 'ready', 'fallback_dispatching', 'fulfilled'] },
    status: { $nin: ['cancelled', 'completed'] },
    scheduledAt: { $lt: end },
    estimatedEndAt: { $gt: start },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return Boolean(await Booking.exists(query));
};

const listOpportunitiesForGuide = async (guideId, now = new Date()) => {
  const guide = await Guide.findById(guideId).select('status vehicleType');
  if (!guide || guide.status !== 'approved' || !guide.vehicleType?.includes('cab')) return [];

  const candidates = await Booking.find({
    bookingMode: 'schedule',
    vehicleType: 'cab',
    status: 'pending',
    reservationStatus: 'open',
    scheduledAt: { $gt: now },
  })
    .populate('customer', 'name')
    .sort({ scheduledAt: 1 })
    .limit(100);

  const available = [];
  for (const booking of candidates) {
    if (!await hasScheduleConflict(guideId, booking)) available.push(booking);
  }
  return available;
};

const claimReservation = async (bookingId, guideId, now = new Date()) => {
  const guide = await Guide.findOne({ _id: guideId, status: 'approved', vehicleType: 'cab' });
  if (!guide) return { code: 'ineligible' };

  const candidate = await Booking.findOne({
    _id: bookingId,
    bookingMode: 'schedule',
    vehicleType: 'cab',
    status: 'pending',
    reservationStatus: 'open',
    scheduledAt: { $gt: now },
  });
  if (!candidate) return { code: 'unavailable' };
  if (await hasScheduleConflict(guideId, candidate)) return { code: 'conflict' };

  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: 'pending',
      reservationStatus: 'open',
      guide: null,
    },
    {
      $set: {
        guide: guideId,
        reservationStatus: 'claimed',
        reservationAcceptedAt: now,
        assignmentSource: 'reservation',
        guideCommitmentStatus: 'committed',
      },
      $push: {
        reservationAudit: { event: 'reservation_claimed', at: now, actor: 'guide', guide: guideId },
      },
    },
    { new: true, runValidators: true }
  )
    .populate('customer', 'name phone email')
    .populate('guide', 'name image rating phone');

  return booking ? { code: 'claimed', booking } : { code: 'unavailable' };
};

const confirmReadiness = async (bookingId, guideId, now = new Date()) => {
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      bookingMode: 'schedule',
      guide: guideId,
      status: 'pending',
      reservationStatus: { $in: ['claimed', 'readiness_pending'] },
    },
    {
      $set: {
        reservationStatus: 'ready',
        readinessConfirmedAt: now,
        guideCommitmentStatus: 'ready',
      },
      $push: {
        reservationAudit: { event: 'readiness_confirmed', at: now, actor: 'guide', guide: guideId },
      },
    },
    { new: true, runValidators: true }
  );
  return booking;
};

const beginFallback = async (booking, now) => {
  const guides = await Guide.find({
    status: 'approved',
    isOnline: true,
    vehicleType: 'cab',
    _id: booking.guide ? { $ne: booking.guide } : { $exists: true },
  }).select('_id');
  const guideIds = guides.map((guide) => guide._id);
  const durationMs = Math.max(1, booking.fulfilmentDeadline.getTime() - now.getTime());

  booking.guide = null;
  booking.reservationStatus = 'fallback_dispatching';
  booking.assignmentSource = 'fallback';
  booking.guideCommitmentStatus = 'released';
  booking.dispatchStartedAt = now;
  booking.dispatchExpiresAt = booking.fulfilmentDeadline;
  booking.reservationAudit.push({ event: 'fallback_started', at: now, actor: 'system' });
  await booking.save();
  await dispatchService.initiateDispatch(booking._id, guideIds, { durationMs });
};

const canReachPickupOnTime = async (guide, booking, now) => {
  const location = guide.currentLocation;
  if (!location?.updatedAt || now.getTime() - new Date(location.updatedAt).getTime() > 5 * 60 * 1000) return false;
  try {
    const route = await fareCalculationService.calculateFare({
      pickupLocation: JSON.stringify({ lat: location.lat, lng: location.lng }),
      destinationAddress: booking.pickupLocation,
      vehicleType: 'cab',
      dropBack: false,
    });
    const availableMinutes = Math.max(0, (booking.scheduledAt.getTime() - now.getTime()) / 60000 - 5);
    return route.durationMin <= availableMinutes;
  } catch (error) {
    console.error(`Readiness ETA check failed for reservation ${booking._id}:`, error.message);
    return false;
  }
};
const processReservations = async ({ now = new Date() } = {}) => {
  const expired = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    reservationStatus: { $in: ['open', 'claimed', 'readiness_pending', 'ready', 'fallback_dispatching'] },
    fulfilmentDeadline: { $lte: now },
  });
  for (const booking of expired) {
    booking.status = 'cancelled';
    booking.reservationStatus = 'unfulfilled';
    booking.cancelledBy = 'system';
    booking.cancelledAt = now;
    booking.cancelReason = 'We could not secure a Cab guide before the scheduled fulfilment cutoff. No charge was made.';
    booking.reservationAudit.push({ event: 'reservation_unfulfilled', at: now, actor: 'system' });
    await booking.save();
  }
  const reservations = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    reservationStatus: { $in: ['open', 'claimed', 'readiness_pending', 'ready'] },
    fulfilmentDeadline: { $gt: now },
  }).limit(100);

  let processed = 0;
  for (const booking of reservations) {
    if (
      booking.guide
      && booking.readinessDeadline <= now
      && booking.reservationStatus === 'claimed'
    ) {
      booking.reservationStatus = 'readiness_pending';
      booking.reservationAudit.push({ event: 'readiness_requested', at: now, actor: 'system' });
      await booking.save();
      processed += 1;
    }

    if (booking.fallbackDispatchAt > now) continue;

    if (booking.reservationStatus === 'ready' && booking.guide) {
      const guide = await Guide.findOne({ _id: booking.guide, status: 'approved', isOnline: true, vehicleType: 'cab' });
      if (guide && await canReachPickupOnTime(guide, booking, now)) {
        booking.status = 'accepted';
        booking.reservationStatus = 'fulfilled';
        booking.guideCommitmentStatus = 'active';
        booking.reservationAudit.push({ event: 'reservation_fulfilled', at: now, actor: 'system', guide: booking.guide });
        await booking.save();
        processed += 1;
        continue;
      }
    }

    await beginFallback(booking, now);
    processed += 1;
  }
  return processed;
};

module.exports = {
  CONFLICT_BUFFER_MS,
  FALLBACK_LEAD_TIME_MS,
  FULFILMENT_LEAD_TIME_MS,
  MAX_ADVANCE_TIME_MS,
  MIN_LEAD_TIME_MS,
  READINESS_LEAD_TIME_MS,
  claimReservation,
  confirmReadiness,
  getEstimatedEndAt,
  getReservationTimeline,
  hasScheduleConflict,
  listOpportunitiesForGuide,
  processReservations,
  validateReservationWindow,
};
