const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  LocationValidationError,
  distanceMeters,
  normalizeLocationPayload,
  validateMovement,
} = require('../src/services/locationValidationService');
const {
  clearMemoryStoreForTests,
  deleteBookingGuideAccess,
  deleteBookingLocation,
  deleteGuideLocation,
  getBookingGuideAccess,
  getBookingLocation,
  getGuideLocation,
  setBookingGuideAccess,
  setBookingLocation,
  setGuideLocation,
} = require('../src/services/liveLocationStore');
const {
  resetRedisClientForTests,
  setRedisClientForTests,
} = require('../src/services/redisClient');
const { authenticateSocket } = require('../src/realtime/socketAuth');

test.beforeEach(() => {
  setRedisClientForTests(null);
  clearMemoryStoreForTests();
});

test.afterEach(() => {
  clearMemoryStoreForTests();
  resetRedisClientForTests();
});

test('normalizes a fresh GPS sample and rejects invalid coordinates', () => {
  const now = Date.now();
  const sample = normalizeLocationPayload({
    lat: 23.0225,
    lng: 72.5714,
    accuracy: 12,
    speed: 4.5,
    heading: 90,
    capturedAt: now,
    sequence: now,
  }, now);

  assert.equal(sample.lat, 23.0225);
  assert.equal(sample.accuracy, 12);
  assert.throws(
    () => normalizeLocationPayload({ lat: 100, lng: 72, accuracy: 10, capturedAt: now, sequence: 1 }, now),
    (error) => error instanceof LocationValidationError && error.code === 'INVALID_COORDINATES',
  );
});

test('rejects out-of-order and implausible movement samples', () => {
  const capturedAt = Date.now();
  const previous = { lat: 23.0225, lng: 72.5714, accuracy: 5, capturedAt, sequence: 10 };

  assert.throws(
    () => validateMovement(previous, { ...previous, sequence: 9 }),
    (error) => error.code === 'OUT_OF_ORDER',
  );
  assert.throws(
    () => validateMovement(previous, {
      lat: 24.0225,
      lng: 73.5714,
      accuracy: 5,
      capturedAt: capturedAt + 1000,
      sequence: 11,
    }),
    (error) => error.code === 'IMPLAUSIBLE_MOVEMENT',
  );
  assert.ok(distanceMeters(previous, { lat: 23.0235, lng: 72.5714 }) > 100);
});

test('memory fallback isolates guide and booking snapshots', async () => {
  const sample = {
    lat: 23.0225,
    lng: 72.5714,
    accuracy: 10,
    capturedAt: Date.now(),
    serverReceivedAt: Date.now(),
    sequence: 1,
  };

  await setGuideLocation('guide-1', sample);
  await setBookingLocation('booking-1', { ...sample, bookingId: 'booking-1' });
  await setBookingGuideAccess('booking-1', 'guide-1');
  assert.deepEqual(await getGuideLocation('guide-1'), sample);
  assert.equal((await getBookingLocation('booking-1')).bookingId, 'booking-1');
  assert.equal(await getBookingGuideAccess('booking-1'), 'guide-1');

  await deleteBookingLocation('booking-1');
  await deleteBookingGuideAccess('booking-1');
  assert.equal(await getBookingLocation('booking-1'), null);
  assert.equal(await getBookingGuideAccess('booking-1'), null);
  assert.deepEqual(await getGuideLocation('guide-1'), sample);

  await deleteGuideLocation('guide-1');
  assert.equal(await getGuideLocation('guide-1'), null);
});

test('socket authentication accepts only exact customer and guide roles', async () => {
  const priorSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'realtime-test-secret';

  try {
    const customerToken = jwt.sign({ userId: 'customer-1', role: 'customer' }, process.env.JWT_SECRET);
    const guideToken = jwt.sign({ id: 'guide-1', role: 'guide' }, process.env.JWT_SECRET);
    const invalidToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, process.env.JWT_SECRET);

    const authenticate = (token) => new Promise((resolve) => {
      const socket = { handshake: { auth: { token } }, data: {} };
      authenticateSocket(socket, (error) => resolve({ error, actor: socket.data.actor }));
    });

    const customer = await authenticate(customerToken);
    const guide = await authenticate(guideToken);
    const invalid = await authenticate(invalidToken);

    assert.equal(customer.error, undefined);
    assert.deepEqual(customer.actor, { role: 'customer', id: 'customer-1' });
    assert.deepEqual(guide.actor, { role: 'guide', id: 'guide-1' });
    assert.match(invalid.error.message, /role/i);
  } finally {
    if (priorSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorSecret;
  }
});
