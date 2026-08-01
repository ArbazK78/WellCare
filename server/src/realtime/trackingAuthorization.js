const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const ACTIVE_TRACKING_STATUSES = new Set(['accepted', 'arrived', 'in_progress']);

class TrackingAuthorizationError extends Error {
  constructor(message, code = 'TRACKING_FORBIDDEN') {
    super(message);
    this.name = 'TrackingAuthorizationError';
    this.code = code;
  }
}

const loadBookingAccess = async (bookingId, actor) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new TrackingAuthorizationError('Invalid booking identifier.', 'INVALID_BOOKING_ID');
  }
  const booking = await Booking.findById(bookingId)
    .select('_id customer guide status bookingMode reservationStatus')
    .lean();
  if (!booking) throw new TrackingAuthorizationError('Booking not found.', 'BOOKING_NOT_FOUND');

  const actorId = String(actor.id);
  const isOwner = actor.role === 'customer' && String(booking.customer) === actorId;
  const isAssignedGuide = actor.role === 'guide' && booking.guide && String(booking.guide) === actorId;
  if (!isOwner && !isAssignedGuide) {
    throw new TrackingAuthorizationError('You are not authorized to track this booking.');
  }
  return booking;
};

const authorizeTrackingJoin = async (bookingId, actor) => loadBookingAccess(bookingId, actor);

const authorizeGuideLocation = async (bookingId, guideId) => {
  const booking = await loadBookingAccess(bookingId, { role: 'guide', id: guideId });
  if (!ACTIVE_TRACKING_STATUSES.has(booking.status)) {
    throw new TrackingAuthorizationError('This booking is not in a live tracking state.', 'TRACKING_NOT_ACTIVE');
  }
  return booking;
};

module.exports = {
  ACTIVE_TRACKING_STATUSES,
  TrackingAuthorizationError,
  authorizeGuideLocation,
  authorizeTrackingJoin,
};