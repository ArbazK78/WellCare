const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

class FareCalculationError extends Error {
  constructor(message, statusCode = 502, code = 'FARE_CALCULATION_FAILED') {
    super(message);
    this.name = 'FareCalculationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const readPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getPricing = (vehicleType, env = process.env) => {
  const pricing = {
    scooter: {
      baseFare: readPositiveNumber(env.SCOOTER_BASE_FARE, 50),
      perKmRate: readPositiveNumber(env.SCOOTER_PER_KM_RATE, 12),
    },
    cab: {
      baseFare: readPositiveNumber(env.CAB_BASE_FARE, 150),
      perKmRate: readPositiveNumber(env.CAB_PER_KM_RATE, 20),
    },
  };

  if (!pricing[vehicleType]) {
    throw new FareCalculationError('Unsupported vehicle type', 400, 'INVALID_VEHICLE_TYPE');
  }
  return pricing[vehicleType];
};

const parseLocationInput = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : { address: trimmed };
  } catch {
    return { address: trimmed };
  }
};

const toWaypoint = (value) => {
  const location = parseLocationInput(value);
  if (!location) {
    throw new FareCalculationError('Pickup and destination are required', 400, 'INVALID_LOCATION');
  }

  const latitude = Number(location.lat);
  const longitude = Number(location.lng);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { location: { latLng: { latitude, longitude } } };
  }

  if (typeof location.placeId === 'string' && location.placeId.trim()) {
    return { placeId: location.placeId.trim() };
  }

  const address = [location.name, location.address]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(', ');
  if (!address) {
    throw new FareCalculationError('Select valid pickup and destination locations', 400, 'INVALID_LOCATION');
  }
  return { address };
};

const parseDurationSeconds = (duration) => {
  if (typeof duration !== 'string' || !duration.endsWith('s')) return NaN;
  return Number.parseFloat(duration.slice(0, -1));
};

const calculateFareFromRoute = ({ distanceMeters, durationSeconds, vehicleType, dropBack = false, env = process.env }) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new FareCalculationError('Google Maps did not return a usable driving route', 422, 'ROUTE_NOT_FOUND');
  }

  const { baseFare, perKmRate } = getPricing(vehicleType, env);
  const tripMultiplier = dropBack ? 2 : 1;
  const outboundDistanceKm = distanceMeters / 1000;
  const outboundDurationMin = durationSeconds / 60;
  const billableDistanceKm = outboundDistanceKm * tripMultiplier;
  const totalDurationMin = outboundDurationMin * tripMultiplier;
  const distanceFare = billableDistanceKm * perKmRate;
  const totalFare = Math.round(baseFare + distanceFare);

  return {
    distanceKm: Number(billableDistanceKm.toFixed(2)),
    durationMin: Math.ceil(totalDurationMin),
    outboundDistanceKm: Number(outboundDistanceKm.toFixed(2)),
    outboundDurationMin: Math.ceil(outboundDurationMin),
    totalFare,
    fareBreakdown: {
      baseFare,
      perKmRate,
      distanceFare: Number(distanceFare.toFixed(2)),
      tripMultiplier,
      currency: 'INR',
    },
  };
};

const createFareCalculationService = ({
  fetchImpl = global.fetch,
  apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY,
  env = process.env,
  now = () => Date.now(),
  cache = new Map(),
} = {}) => ({
  async calculate({ pickupLocation, destinationAddress, vehicleType, dropBack = false }) {
    if (!apiKey) {
      throw new FareCalculationError(
        'Distance pricing is temporarily unavailable because the Routes API is not configured',
        503,
        'ROUTES_API_NOT_CONFIGURED'
      );
    }
    if (typeof fetchImpl !== 'function') {
      throw new FareCalculationError('Route provider is unavailable', 503, 'ROUTE_PROVIDER_UNAVAILABLE');
    }

    const origin = toWaypoint(pickupLocation);
    const destination = toWaypoint(destinationAddress);
    const cacheKey = JSON.stringify({ origin, destination, vehicleType, dropBack: Boolean(dropBack) });
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.value;
    if (cached) cache.delete(cacheKey);

    let response;
    try {
      response = await fetchImpl(ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({
          origin,
          destination,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          computeAlternativeRoutes: false,
          languageCode: 'en-IN',
          units: 'METRIC',
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      if (error instanceof FareCalculationError) throw error;
      throw new FareCalculationError('Unable to reach the route provider. Please try again.', 502, 'ROUTE_PROVIDER_UNAVAILABLE');
    }

    if (!response.ok) {
      let providerStatus = response.status;
      try {
        const body = await response.json();
        providerStatus = body?.error?.status || providerStatus;
      } catch {
        // Provider returned a non-JSON error response.
      }
      console.error(`Routes API request failed: ${providerStatus}`);
      throw new FareCalculationError('Unable to calculate this route right now. Please try again.', 502, 'ROUTE_PROVIDER_ERROR');
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    const result = calculateFareFromRoute({
      distanceMeters: Number(route?.distanceMeters),
      durationSeconds: parseDurationSeconds(route?.duration),
      vehicleType,
      dropBack: Boolean(dropBack),
      env,
    });
    const cacheTtlMs = readPositiveNumber(env.ROUTE_FARE_CACHE_TTL_MS, 5 * 60 * 1000);
    cache.set(cacheKey, { value: result, expiresAt: now() + cacheTtlMs });
    return result;
  },
});

const defaultService = createFareCalculationService();

module.exports = {
  FareCalculationError,
  calculateFareFromRoute,
  createFareCalculationService,
  getPricing,
  parseLocationInput,
  calculateFare: defaultService.calculate,
};
