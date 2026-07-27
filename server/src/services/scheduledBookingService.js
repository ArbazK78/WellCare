const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const dispatchService = require('./dispatchService');

const DISPATCH_LEAD_TIME_MS = 30 * 60 * 1000;
const DEFAULT_TIME_ZONE_OFFSET = '+05:30';

const parseScheduledDateTime = (date, time, timeZoneOffset = DEFAULT_TIME_ZONE_OFFSET) => {
  const datePart = typeof date === 'string'
    ? date.slice(0, 10)
    : date instanceof Date
      ? date.toISOString().slice(0, 10)
      : '';
  const timePart = typeof time === 'string' ? time.trim() : '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !/^\d{2}:\d{2}$/.test(timePart)) {
    return null;
  }

  const scheduledAt = new Date(`${datePart}T${timePart}:00${timeZoneOffset}`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
};

const getDispatchAt = (scheduledAt) => (
  new Date(scheduledAt.getTime() - DISPATCH_LEAD_TIME_MS)
);

const backfillScheduledBookingTimes = async () => {
  const legacyBookings = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $exists: false } },
      { dispatchAt: null },
      { dispatchAt: { $exists: false } },
    ],
  }).select('_id date time');

  let updated = 0;
  for (const booking of legacyBookings) {
    const scheduledAt = parseScheduledDateTime(booking.date, booking.time);
    if (!scheduledAt) continue;
    await Booking.updateOne(
      { _id: booking._id, status: 'pending' },
      { $set: { scheduledAt, dispatchAt: getDispatchAt(scheduledAt) } }
    );
    updated += 1;
  }
  return updated;
};

/**
 * Atomically claims and releases every due scheduled booking into the existing
 * waterfall. Guides see the same pending offer shape as an immediate booking.
 *
 * `dispatchStartedAt` is the durable lock: after a restart or on multiple app
 * instances, only one worker can claim a booking.
 */
const activateDueBookings = async ({ now = new Date() } = {}) => {
  let activated = 0;
  const dueBookings = await Booking.find({
    bookingMode: 'schedule',
    status: 'pending',
    dispatchStartedAt: null,
    dispatchAt: { $lte: now },
  })
    .select('_id')
    .sort({ dispatchAt: 1 })
    .limit(100);

  for (const candidate of dueBookings) {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: candidate._id,
        status: 'pending',
        dispatchStartedAt: null,
        dispatchAt: { $lte: now },
      },
      { $set: { dispatchStartedAt: now } },
      { new: true, runValidators: true }
    );
    if (!booking) continue;

    try {
      const guides = await Guide.find({ status: 'approved', isOnline: true }).select('_id');
      const guideIds = guides.map((guide) => guide._id);

      if (guideIds.length === 0 && booking.scheduledAt > now) {
        // Supply can change during the lead window. Release the claim and try
        // again on the next scheduler tick instead of cancelling too early.
        await Booking.updateOne(
          { _id: booking._id, status: 'pending', currentOfferedGuide: null },
          { $set: { dispatchStartedAt: null } }
        );
        continue;
      }

      await dispatchService.initiateDispatch(booking._id, guideIds);
      activated += 1;
    } catch (error) {
      await Booking.updateOne(
        { _id: booking._id, status: 'pending', currentOfferedGuide: null },
        { $set: { dispatchStartedAt: null } }
      );
      throw error;
    }
  }

  return activated;
};
module.exports = {
  DEFAULT_TIME_ZONE_OFFSET,
  DISPATCH_LEAD_TIME_MS,
  activateDueBookings,
  backfillScheduledBookingTimes,
  getDispatchAt,
  parseScheduledDateTime,
};
