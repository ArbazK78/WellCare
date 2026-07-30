const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('./dispatchService');
const fareCalculationService = require('./fareCalculationService');
const notificationService = require('./notificationService');

const MIN_LEAD_TIME_MS = 30 * 60 * 1000;
const MAX_ADVANCE_TIME_MS = 90 * 24 * 60 * 60 * 1000;
const LONG_LEAD_THRESHOLD_MS = 60 * 60 * 1000;
const READINESS_LEAD_TIME_MS = 45 * 60 * 1000;
const MIN_READINESS_RESPONSE_MS = 3 * 60 * 1000;
const MAX_READINESS_RESPONSE_MS = 10 * 60 * 1000;
const READINESS_RESPONSE_RATIO = 0.25;
const FULFILMENT_LEAD_TIME_MS = 10 * 60 * 1000;
const PICKUP_WINDOW_MS = 10 * 60 * 1000;
const DEPARTURE_SAFETY_BUFFER_MS = 7 * 60 * 1000;
const MIN_ARRIVAL_BUFFER_MS = 2 * 60 * 1000;
const CONFLICT_BUFFER_MS = 30 * 60 * 1000;
const PROCESSING_LEASE_MS = 2 * 60 * 1000;
const ETA_REFRESH_MS = 2 * 60 * 1000;
const MAX_LOCATION_ACCURACY_METERS = 500;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const getReservationTimeline = (scheduledAt, createdAt = new Date()) => {
  const leadTime = scheduledAt.getTime() - createdAt.getTime();
  const readinessRequestedAt = leadTime <= LONG_LEAD_THRESHOLD_MS
    ? new Date(createdAt)
    : new Date(scheduledAt.getTime() - READINESS_LEAD_TIME_MS);
  const remainingAfterRequest = scheduledAt.getTime() - readinessRequestedAt.getTime();
  const responseWindow = clamp(
    remainingAfterRequest * READINESS_RESPONSE_RATIO,
    MIN_READINESS_RESPONSE_MS,
    MAX_READINESS_RESPONSE_MS,
  );
  const fulfilmentDeadline = new Date(scheduledAt.getTime() - FULFILMENT_LEAD_TIME_MS);
  const readinessDeadline = new Date(Math.min(
    readinessRequestedAt.getTime() + responseWindow,
    fulfilmentDeadline.getTime(),
  ));

  return {
    readinessRequestedAt,
    readinessDeadline,
    fallbackDispatchAt: readinessDeadline,
    fulfilmentDeadline,
    pickupWindowStart: new Date(scheduledAt.getTime() - PICKUP_WINDOW_MS),
    pickupWindowEnd: new Date(scheduledAt.getTime() + PICKUP_WINDOW_MS),
  };
};

const validateReservationWindow = (scheduledAt, now = new Date()) => {
  const leadTime = scheduledAt.getTime() - now.getTime();
  if (leadTime < MIN_LEAD_TIME_MS) return 'too_soon';
  if (leadTime > MAX_ADVANCE_TIME_MS) return 'too_far';
  return 'valid';
};

const getEstimatedEndAt = ({ scheduledAt, durationMin = 0, waitingHours = 0 }) => (
  new Date(scheduledAt.getTime() + ((Number(durationMin) + Number(waitingHours) * 60) * 60 * 1000))
);

const getPlannedDepartureAt = (scheduledAt, etaMinutes) => new Date(
  scheduledAt.getTime() - Number(etaMinutes) * 60 * 1000 - DEPARTURE_SAFETY_BUFFER_MS,
);

const canGuideArriveOnTime = (scheduledAt, etaMinutes, now = new Date()) => (
  Number(etaMinutes) * 60 * 1000 + MIN_ARRIVAL_BUFFER_MS <= scheduledAt.getTime() - now.getTime()
);

const hasScheduleConflict = async (guideId, booking, { excludeBookingId } = {}) => {
  const estimatedEndAt = booking.estimatedEndAt || getEstimatedEndAt({
    scheduledAt: booking.scheduledAt,
    durationMin: booking.durationMin,
    waitingHours: booking.waitingHours,
  });
  const start = new Date(booking.scheduledAt.getTime() - CONFLICT_BUFFER_MS);
  const end = new Date(estimatedEndAt.getTime() + CONFLICT_BUFFER_MS);
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
    readinessDeadline: { $gt: now },
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
    readinessDeadline: { $gt: now },
    scheduledAt: { $gt: now },
  });
  if (!candidate) return { code: 'unavailable' };
  if (await hasScheduleConflict(guideId, candidate)) return { code: 'conflict' };

  const readinessIsOpen = Boolean(candidate.readinessRequestedAt && candidate.readinessRequestedAt <= now);
  const auditEvents = [{ event: 'reservation_claimed', at: now, actor: 'guide', guide: guideId }];
  if (readinessIsOpen) auditEvents.push({ event: 'readiness_requested', at: now, actor: 'system', guide: guideId });

  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'pending', reservationStatus: 'open', guide: null, readinessDeadline: { $gt: now } },
    {
      $set: {
        guide: guideId,
        reservationStatus: readinessIsOpen ? 'readiness_pending' : 'claimed',
        reservationAcceptedAt: now,
        assignmentSource: 'reservation',
        guideCommitmentStatus: readinessIsOpen ? 'readiness_required' : 'committed',
      },
      $push: { reservationAudit: { $each: auditEvents } },
    },
    { new: true, runValidators: true },
  )
    .populate('customer', 'name phone email')
    .populate('guide', 'name image rating phone');

  if (booking) {
    await notificationService.enqueue({ booking: booking._id, recipientRole: 'customer', recipient: booking.customer._id || booking.customer, type: 'reservation_claimed', payload: { guideName: booking.guide?.name, scheduledAt: booking.scheduledAt }, dedupeKey: `${booking._id}:reservation_claimed` });
    if (readinessIsOpen) {
      await notificationService.enqueue({ booking: booking._id, recipientRole: 'guide', recipient: guideId, type: 'readiness_required', payload: { scheduledAt: booking.scheduledAt, deadline: booking.readinessDeadline }, dedupeKey: `${booking._id}:readiness_required` });
    }
  }
  return booking ? { code: 'claimed', booking } : { code: 'unavailable' };
};

const confirmReadiness = async (bookingId, guideId, now = new Date()) => Booking.findOneAndUpdate(
  {
    _id: bookingId,
    bookingMode: 'schedule',
    guide: guideId,
    status: 'pending',
    reservationStatus: { $in: ['claimed', 'readiness_pending'] },
    readinessDeadline: { $gt: now },
  },
  {
    $set: { reservationStatus: 'ready', readinessConfirmedAt: now, guideCommitmentStatus: 'ready' },
    $push: { reservationAudit: { event: 'readiness_confirmed', at: now, actor: 'guide', guide: guideId } },
  },
  { new: true, runValidators: true },
);

const beginFallback = async (booking, now, reason) => {
  const priorGuide = booking.guide;
  const guideIds = await dispatchService.findScheduledFallbackGuides(booking, {
    excludeGuideId: priorGuide,
    now,
  });
  const durationMs = Math.max(1, booking.fulfilmentDeadline.getTime() - now.getTime());

  booking.guide = null;
  booking.reservationStatus = 'fallback_dispatching';
  booking.assignmentSource = 'fallback';
  booking.guideCommitmentStatus = 'released';
  booking.dispatchStartedAt = now;
  booking.dispatchExpiresAt = booking.fulfilmentDeadline;
  booking.reservationAudit.push({ event: reason || 'fallback_started', at: now, actor: 'system', guide: priorGuide || undefined });
  await booking.save();
  await notificationService.enqueue({ booking: booking._id, recipientRole: 'customer', recipient: booking.customer, type: 'fallback_started', payload: { reason, scheduledAt: booking.scheduledAt }, dedupeKey: String(booking._id) + ":fallback_started" });
  if (priorGuide) {
    await notificationService.enqueue({ booking: booking._id, recipientRole: 'guide', recipient: priorGuide, type: 'reservation_released_by_system', payload: { reason, scheduledAt: booking.scheduledAt, etaMinutes: booking.guideToPickupEtaMinutes }, dedupeKey: String(booking._id) + ":reservation_released_by_system" });
  }
  await dispatchService.initiateDispatch(booking._id, guideIds, { durationMs, randomize: false });
};

const getGuidePickupEta = async (guide, booking, now = new Date()) => {
  const location = guide.currentLocation;
  if (!location?.updatedAt || now.getTime() - new Date(location.updatedAt).getTime() > 5 * 60 * 1000) return null;
  if (!Number.isFinite(location.accuracy) || location.accuracy > MAX_LOCATION_ACCURACY_METERS) return null;
  const route = await fareCalculationService.calculateFare({
    pickupLocation: JSON.stringify({ lat: location.lat, lng: location.lng }),
    destinationAddress: booking.pickupLocation,
    vehicleType: 'cab',
    dropBack: false,
  });
  return route.durationMin;
};

const activateReservation = async (booking, guideId, etaMinutes, plannedDepartureAt, now) => {
  const activated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'pending', reservationStatus: 'ready', guide: guideId },
    {
      $set: { status: 'accepted', reservationStatus: 'fulfilled', guideCommitmentStatus: 'active', activationAt: now, plannedDepartureAt, guideToPickupEtaMinutes: etaMinutes, lastEtaCheckedAt: now },
      $push: { reservationAudit: { event: 'reservation_activated', at: now, actor: 'system', guide: guideId } },
    },
    { new: true, runValidators: true },
  );
  if (!activated) return null;
  await Promise.all([
    notificationService.enqueue({ booking: activated._id, recipientRole: 'guide', recipient: guideId, type: 'departure_required', payload: { scheduledAt: activated.scheduledAt, etaMinutes, plannedDepartureAt }, dedupeKey: `${activated._id}:departure_required` }),
    notificationService.enqueue({ booking: activated._id, recipientRole: 'customer', recipient: activated.customer, type: 'guide_en_route', payload: { scheduledAt: activated.scheduledAt, etaMinutes }, dedupeKey: `${activated._id}:guide_en_route` }),
  ]);
  return activated;
};

const processOneReservation = async (booking, now) => {
  if (booking.fulfilmentDeadline <= now) {
    booking.status = 'cancelled';
    booking.reservationStatus = 'unfulfilled';
    booking.cancelledBy = 'system';
    booking.cancelledAt = now;
    booking.cancelReason = 'We could not secure a Cab guide before the scheduled fulfilment cutoff. No charge was made.';
    booking.reservationAudit.push({ event: 'reservation_unfulfilled', at: now, actor: 'system' });
    await booking.save();
    await notificationService.enqueue({ booking: booking._id, recipientRole: 'customer', recipient: booking.customer, type: 'reservation_unfulfilled', payload: { scheduledAt: booking.scheduledAt }, dedupeKey: String(booking._id) + ":reservation_unfulfilled" });
    return;
  }

  if (booking.guide && booking.readinessRequestedAt <= now && booking.reservationStatus === 'claimed') {
    booking.reservationStatus = 'readiness_pending';
    booking.guideCommitmentStatus = 'readiness_required';
    booking.reservationAudit.push({ event: 'readiness_requested', at: now, actor: 'system', guide: booking.guide });
    await booking.save();
    await notificationService.enqueue({ booking: booking._id, recipientRole: 'guide', recipient: booking.guide, type: 'readiness_required', payload: { scheduledAt: booking.scheduledAt, deadline: booking.readinessDeadline }, dedupeKey: String(booking._id) + ":readiness_required" });
  }

  if (booking.reservationStatus === 'open' && booking.readinessDeadline <= now) {
    await beginFallback(booking, now, 'marketplace_unfilled');
    return;
  }

  if (['claimed', 'readiness_pending'].includes(booking.reservationStatus) && booking.readinessDeadline <= now) {
    await beginFallback(booking, now, 'readiness_missed');
    return;
  }

  if (booking.reservationStatus !== 'ready' || !booking.guide) return;

  const guide = await Guide.findOne({ _id: booking.guide, status: 'approved', isOnline: true, vehicleType: 'cab' });
  if (!guide) {
    if (booking.readinessDeadline <= now) await beginFallback(booking, now, 'guide_unavailable');
    return;
  }

  const canReuseEta = booking.lastEtaCheckedAt
    && now.getTime() - booking.lastEtaCheckedAt.getTime() < ETA_REFRESH_MS
    && booking.plannedDepartureAt
    && booking.plannedDepartureAt.getTime() > now.getTime() + ETA_REFRESH_MS;
  if (canReuseEta) return;

  let etaMinutes;
  try {
    etaMinutes = await getGuidePickupEta(guide, booking, now);
  } catch (error) {
    console.error(`ETA check failed for reservation ${booking._id}:`, error.message);
    if (booking.readinessDeadline <= now) await beginFallback(booking, now, 'eta_unavailable');
    return;
  }
  if (etaMinutes === null) {
    if (booking.readinessDeadline <= now) await beginFallback(booking, now, 'location_stale');
    return;
  }

  const plannedDepartureAt = getPlannedDepartureAt(booking.scheduledAt, etaMinutes);
  booking.guideToPickupEtaMinutes = etaMinutes;
  booking.plannedDepartureAt = plannedDepartureAt;
  booking.lastEtaCheckedAt = now;

  if (!canGuideArriveOnTime(booking.scheduledAt, etaMinutes, now)) {
    // A browser's first geolocation sample—especially on a desktop—can be
    // coarse or temporarily wrong. Keep refreshing ETA until the published
    // readiness checkpoint instead of releasing a committed guide on one
    // potentially inaccurate sample.
    if (booking.readinessDeadline <= now) {
      await beginFallback(booking, now, 'guide_cannot_arrive_on_time');
      return;
    }
    await booking.save();
    return;
  }

  if (plannedDepartureAt <= new Date(now.getTime() + 30 * 1000)) {
    await activateReservation(booking, guide._id, etaMinutes, plannedDepartureAt, now);
    return;
  }
  await booking.save();
};

const processReservations = async ({ now = new Date() } = {}) => {
  const legacyReservations = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    readinessRequestedAt: null,
    scheduledAt: { $ne: null },
  }).select('_id scheduledAt createdAt');
  for (const legacy of legacyReservations) {
    await Booking.updateOne({ _id: legacy._id, readinessRequestedAt: null }, {
      $set: getReservationTimeline(legacy.scheduledAt, legacy.createdAt || now),
    });
  }

  const candidateIds = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    reservationStatus: { $in: ['open', 'claimed', 'readiness_pending', 'ready'] },
    readinessRequestedAt: { $lte: now },
  }).select('_id').limit(100).lean();

  let processed = 0;
  for (const candidate of candidateIds) {
    const leaseExpiredAt = new Date(now.getTime() - PROCESSING_LEASE_MS);
    const booking = await Booking.findOneAndUpdate(
      {
        _id: candidate._id,
        $or: [
          { reservationProcessingAt: null },
          { reservationProcessingAt: { $lte: leaseExpiredAt } },
        ],
      },
      { $set: { reservationProcessingAt: now } },
      { new: true, select: '+reservationProcessingAt' },
    );
    if (!booking) continue;
    try {
      await processOneReservation(booking, now);
      processed += 1;
    } catch (error) {
      console.error(`Reservation processing failed for ${booking._id}:`, error);
    } finally {
      await Booking.updateOne({ _id: booking._id, reservationProcessingAt: now }, { $set: { reservationProcessingAt: null } });
    }
  }
  return processed;
};

module.exports = {
  CONFLICT_BUFFER_MS,
  DEPARTURE_SAFETY_BUFFER_MS,
  FULFILMENT_LEAD_TIME_MS,
  LONG_LEAD_THRESHOLD_MS,
  MAX_ADVANCE_TIME_MS,
  MAX_LOCATION_ACCURACY_METERS,
  MAX_READINESS_RESPONSE_MS,
  MIN_LEAD_TIME_MS,
  MIN_READINESS_RESPONSE_MS,
  READINESS_LEAD_TIME_MS,
  canGuideArriveOnTime,
  claimReservation,
  confirmReadiness,
  getPlannedDepartureAt,
  getEstimatedEndAt,
  getReservationTimeline,
  hasScheduleConflict,
  listOpportunitiesForGuide,
  processReservations,
  validateReservationWindow,
};
