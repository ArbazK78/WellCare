class LocationValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LocationValidationError';
    this.code = code;
  }
}

const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;
const MAX_FUTURE_DRIFT_MS = 30 * 1000;
const MAX_PLAUSIBLE_SPEED_MPS = Number(process.env.TRACKING_MAX_SPEED_MPS) || 75;

const toRadians = (degrees) => degrees * Math.PI / 180;

const distanceMeters = (a, b) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const normalizeLocationPayload = (payload, now = Date.now()) => {
  const lat = Number(payload?.lat);
  const lng = Number(payload?.lng);
  const accuracy = Number(payload?.accuracy);
  const speed = payload?.speed == null ? null : Number(payload.speed);
  const heading = payload?.heading == null ? null : Number(payload.heading);
  const capturedAt = Number(payload?.capturedAt || now);
  const sequence = Number(payload?.sequence);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new LocationValidationError('Valid latitude and longitude are required.', 'INVALID_COORDINATES');
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) {
    throw new LocationValidationError('A valid accuracy value is required.', 'INVALID_ACCURACY');
  }
  if (!Number.isFinite(capturedAt) || capturedAt < now - MAX_LOCATION_AGE_MS || capturedAt > now + MAX_FUTURE_DRIFT_MS) {
    throw new LocationValidationError('The location sample is stale or has an invalid timestamp.', 'INVALID_TIMESTAMP');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new LocationValidationError('A monotonically increasing sequence is required.', 'INVALID_SEQUENCE');
  }

  return {
    lat,
    lng,
    accuracy,
    speed: Number.isFinite(speed) && speed >= 0 ? speed : null,
    heading: Number.isFinite(heading) && heading >= 0 && heading <= 360 ? heading : null,
    capturedAt,
    sequence,
  };
};

const validateMovement = (previous, next) => {
  if (!previous) return;
  if (next.sequence <= Number(previous.sequence ?? -1)) {
    throw new LocationValidationError('An older location sample was ignored.', 'OUT_OF_ORDER');
  }

  const elapsedSeconds = Math.max(0.001, (next.capturedAt - previous.capturedAt) / 1000);
  if (elapsedSeconds <= 0) {
    throw new LocationValidationError('An older location sample was ignored.', 'OUT_OF_ORDER');
  }

  const distance = distanceMeters(previous, next);
  const uncertainty = Number(previous.accuracy || 0) + Number(next.accuracy || 0);
  const effectiveDistance = Math.max(0, distance - uncertainty);
  if (effectiveDistance / elapsedSeconds > MAX_PLAUSIBLE_SPEED_MPS) {
    throw new LocationValidationError('The location jump was not physically plausible.', 'IMPLAUSIBLE_MOVEMENT');
  }
};

module.exports = {
  LocationValidationError,
  distanceMeters,
  normalizeLocationPayload,
  validateMovement,
};