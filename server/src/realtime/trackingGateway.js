const Guide = require('../models/Guide');
const {
  getBookingGuideAccess,
  getBookingLocation,
  getGuideLocation,
  setBookingGuideAccess,
  setBookingLocation,
  setGuideLocation,
} = require('../services/liveLocationStore');
const {
  LocationValidationError,
  normalizeLocationPayload,
  validateMovement,
} = require('../services/locationValidationService');
const {
  TrackingAuthorizationError,
  authorizeGuideLocation,
  authorizeTrackingJoin,
} = require('./trackingAuthorization');
const {
  emitGuideLocation,
  roomForActor,
  roomForBooking,
} = require('./realtimeHub');

const MIN_EVENT_INTERVAL_MS = Math.max(500, Number(process.env.TRACKING_MIN_INTERVAL_MS) || 1500);
const MONGO_CHECKPOINT_INTERVAL_MS = Math.max(10000, Number(process.env.TRACKING_MONGO_CHECKPOINT_MS) || 30000);
const MAX_OPERATIONAL_ACCURACY_METERS = Math.max(50, Number(process.env.TRACKING_MAX_ACCURACY_METERS) || 500);
const GUIDE_ELIGIBILITY_RECHECK_MS = Math.max(10000, Number(process.env.TRACKING_GUIDE_RECHECK_MS) || 30000);
const lastMongoCheckpoint = new Map();

const acknowledgeError = (ack, error) => {
  const code = error.code || 'TRACKING_ERROR';
  if (typeof ack === 'function') ack({ ok: false, code, message: error.message });
};

const checkpointGuideLocation = async (guideId, location) => {
  const now = Date.now();
  if (now - (lastMongoCheckpoint.get(guideId) || 0) < MONGO_CHECKPOINT_INTERVAL_MS) return;
  lastMongoCheckpoint.set(guideId, now);
  await Guide.updateOne(
    { _id: guideId, status: 'approved', isOnline: true },
    { $set: { currentLocation: {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      updatedAt: new Date(location.serverReceivedAt),
    } } }
  );
};

const registerTrackingGateway = (io) => {
  io.on('connection', (socket) => {
    const actor = socket.data.actor;
    socket.join(roomForActor(actor.role, actor.id));

    socket.on('tracking:join', async ({ bookingId } = {}, ack) => {
      try {
        await authorizeTrackingJoin(bookingId, actor);
        const room = roomForBooking(bookingId);
        await socket.join(room);
        const snapshot = await getBookingLocation(bookingId);
        if (snapshot) socket.emit('tracking:snapshot', snapshot);
        if (typeof ack === 'function') ack({ ok: true, snapshot: snapshot || null });
      } catch (error) {
        acknowledgeError(ack, error);
      }
    });

    socket.on('tracking:leave', async ({ bookingId } = {}) => {
      if (bookingId) await socket.leave(roomForBooking(bookingId));
    });

    socket.on('guide:location:update', async (payload = {}, ack) => {
      try {
        if (actor.role !== 'guide') {
          throw new TrackingAuthorizationError('Only guides can publish location updates.');
        }
        const now = Date.now();
        if (now - (socket.data.lastLocationEventAt || 0) < MIN_EVENT_INTERVAL_MS) {
          throw new LocationValidationError('Location updates are arriving too quickly.', 'RATE_LIMITED');
        }

        if (!socket.data.guideEligibleUntil || socket.data.guideEligibleUntil <= now) {
          const guide = await Guide.findOne({ _id: actor.id, status: 'approved', isOnline: true }).select('_id').lean();
          if (!guide) throw new TrackingAuthorizationError('Go online before sharing location.', 'GUIDE_NOT_ONLINE');
          socket.data.guideEligibleUntil = now + GUIDE_ELIGIBILITY_RECHECK_MS;
        }

        const normalized = normalizeLocationPayload(payload, now);
        let previousGuideLocation = await getGuideLocation(actor.id);
        if (!previousGuideLocation) {
          const persistedGuide = await Guide.findById(actor.id).select('currentLocation').lean();
          const persisted = persistedGuide?.currentLocation;
          if (persisted?.updatedAt && Number.isFinite(persisted.lat) && Number.isFinite(persisted.lng)) {
            previousGuideLocation = {
              lat: persisted.lat,
              lng: persisted.lng,
              accuracy: persisted.accuracy,
              capturedAt: new Date(persisted.updatedAt).getTime(),
              sequence: -1,
            };
          }
        }
        validateMovement(previousGuideLocation, normalized);
        // Only a valid sample consumes the rate-limit window. Sensor overrides and
        // mobile GPS can briefly emit an intermediate coordinate while changing.
        socket.data.lastLocationEventAt = now;

        const location = {
          ...normalized,
          guideId: actor.id,
          serverReceivedAt: now,
          quality: normalized.accuracy <= MAX_OPERATIONAL_ACCURACY_METERS ? 'good' : 'degraded',
        };
        await setGuideLocation(actor.id, location);
        await checkpointGuideLocation(actor.id, location);

        let trackingActive = false;
        if (payload.bookingId) {
          const cachedGuideId = await getBookingGuideAccess(payload.bookingId);
          if (cachedGuideId !== actor.id) {
            await authorizeGuideLocation(payload.bookingId, actor.id);
            await setBookingGuideAccess(payload.bookingId, actor.id);
          }
          const bookingLocation = { ...location, bookingId: String(payload.bookingId) };
          await setBookingLocation(payload.bookingId, bookingLocation);
          emitGuideLocation(payload.bookingId, bookingLocation);
          trackingActive = true;
        }

        if (typeof ack === 'function') {
          ack({ ok: true, sequence: normalized.sequence, serverReceivedAt: now, trackingActive });
        }
      } catch (error) {
        if (!(error instanceof LocationValidationError) && !(error instanceof TrackingAuthorizationError)) {
          console.error('Realtime guide location failed:', error);
        }
        acknowledgeError(ack, error);
      }
    });
  });
};

module.exports = { registerTrackingGateway };