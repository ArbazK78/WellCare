const { deleteBookingGuideAccess, deleteBookingLocation } = require('../services/liveLocationStore');

let ioInstance = null;

const setRealtimeServer = (io) => {
  ioInstance = io;
};

const getRealtimeServer = () => ioInstance;

const roomForBooking = (bookingId) => `booking:${bookingId}`;
const roomForActor = (role, actorId) => `${role}:${actorId}`;

const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value);
};

const emitBookingUpdated = (booking, event = 'booking_updated') => {
  if (!ioInstance || !booking?._id) return;
  const payload = {
    bookingId: String(booking._id),
    event,
    status: booking.status,
    reservationStatus: booking.reservationStatus,
    guideId: idOf(booking.guide),
    occurredAt: Date.now(),
  };
  ioInstance.to(roomForBooking(booking._id)).emit('booking:updated', payload);
  const customerId = idOf(booking.customer);
  const guideId = idOf(booking.guide);
  if (customerId) ioInstance.to(roomForActor('customer', customerId)).emit('booking:updated', payload);
  if (guideId) ioInstance.to(roomForActor('guide', guideId)).emit('booking:updated', payload);
};

const emitGuideLocation = (bookingId, payload) => {
  ioInstance?.to(roomForBooking(bookingId)).emit('tracking:location', payload);
};

const endBookingTracking = async (bookingId, reason = 'tracking_ended') => {
  await Promise.all([
    deleteBookingLocation(bookingId),
    deleteBookingGuideAccess(bookingId),
  ]);
  ioInstance?.to(roomForBooking(bookingId)).emit('tracking:ended', {
    bookingId: String(bookingId),
    reason,
    occurredAt: Date.now(),
  });
};

module.exports = {
  emitBookingUpdated,
  emitGuideLocation,
  endBookingTracking,
  getRealtimeServer,
  roomForActor,
  roomForBooking,
  setRealtimeServer,
};