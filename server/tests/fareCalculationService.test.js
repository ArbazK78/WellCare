const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateFareFromRoute,
  createFareCalculationService,
} = require('../src/services/fareCalculationService');

const pricingEnv = {
  SCOOTER_BASE_FARE: '50',
  SCOOTER_PER_KM_RATE: '12',
  CAB_BASE_FARE: '150',
  CAB_PER_KM_RATE: '20',
};

test('fare is calculated from road distance using vehicle pricing', () => {
  const result = calculateFareFromRoute({
    distanceMeters: 12500,
    durationSeconds: 1800,
    vehicleType: 'cab',
    env: pricingEnv,
  });

  assert.equal(result.distanceKm, 12.5);
  assert.equal(result.durationMin, 30);
  assert.equal(result.totalFare, 400);
  assert.deepEqual(result.fareBreakdown, {
    baseFare: 150,
    perKmRate: 20,
    distanceFare: 250,
    tripMultiplier: 1,
    currency: 'INR',
  });
});

test('drop-back doubles distance and duration but not the base fare', () => {
  const result = calculateFareFromRoute({
    distanceMeters: 10000,
    durationSeconds: 1200,
    vehicleType: 'scooter',
    dropBack: true,
    env: pricingEnv,
  });

  assert.equal(result.distanceKm, 20);
  assert.equal(result.durationMin, 40);
  assert.equal(result.totalFare, 290);
  assert.equal(result.fareBreakdown.tripMultiplier, 2);
});

test('Routes API response is converted into an authoritative fare', async () => {
  let request;
  const service = createFareCalculationService({
    apiKey: 'test-key',
    env: pricingEnv,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ routes: [{ distanceMeters: 7500, duration: '900s' }] }),
      };
    },
  });

  const result = await service.calculate({
    pickupLocation: JSON.stringify({ name: 'Home', lat: 28.61, lng: 77.2 }),
    destinationAddress: JSON.stringify({ name: 'Hospital', lat: 28.65, lng: 77.25 }),
    vehicleType: 'cab',
  });

  assert.equal(request.url, 'https://routes.googleapis.com/directions/v2:computeRoutes');
  assert.equal(request.options.headers['X-Goog-FieldMask'], 'routes.distanceMeters,routes.duration');
  assert.equal(JSON.parse(request.options.body).travelMode, 'DRIVE');
  assert.equal(result.totalFare, 300);
  assert.equal(result.distanceKm, 7.5);
  assert.equal(result.durationMin, 15);
});

test('service fails closed when the server Routes API key is missing', async () => {
  const service = createFareCalculationService({ apiKey: '', env: pricingEnv });
  await assert.rejects(
    service.calculate({ pickupLocation: 'Home', destinationAddress: 'Hospital', vehicleType: 'cab' }),
    (error) => error.code === 'ROUTES_API_NOT_CONFIGURED' && error.statusCode === 503
  );
});
test('reuses a recent server-side fare quote during booking creation', async () => {
  let requestCount = 0;
  const service = createFareCalculationService({
    apiKey: 'test-key',
    env: { ...pricingEnv, ROUTE_FARE_CACHE_TTL_MS: '300000' },
    fetchImpl: async () => {
      requestCount += 1;
      return {
        ok: true,
        json: async () => ({ routes: [{ distanceMeters: 5000, duration: '600s' }] }),
      };
    },
  });
  const input = {
    pickupLocation: 'Home, Delhi',
    destinationAddress: 'Hospital, Delhi',
    vehicleType: 'cab',
    dropBack: false,
  };

  const estimate = await service.calculate(input);
  const creationFare = await service.calculate(input);

  assert.equal(requestCount, 1);
  assert.deepEqual(creationFare, estimate);
});
