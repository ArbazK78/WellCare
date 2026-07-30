const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DISPATCH_LEAD_TIME_MS,
  getDispatchAt,
  parseScheduledDateTime,
} = require('../src/services/scheduledBookingService');
const {
  DEPARTURE_SAFETY_BUFFER_MS,
  FULFILMENT_LEAD_TIME_MS,
  MAX_ADVANCE_TIME_MS,
  MIN_LEAD_TIME_MS,
  READINESS_LEAD_TIME_MS,
  canGuideArriveOnTime,
  getEstimatedEndAt,
  getPlannedDepartureAt,
  getReservationTimeline,
  validateReservationWindow,
} = require('../src/services/reservationService');

test('scheduled datetime is interpreted in India Standard Time', () => {
  const scheduledAt = parseScheduledDateTime('2026-08-02', '14:45');
  assert.equal(scheduledAt.toISOString(), '2026-08-02T09:15:00.000Z');
});

test('dispatch begins exactly thirty minutes before pickup', () => {
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  assert.equal(
    scheduledAt.getTime() - getDispatchAt(scheduledAt).getTime(),
    DISPATCH_LEAD_TIME_MS
  );
});

test('invalid date or time input is rejected', () => {
  assert.equal(parseScheduledDateTime('02/08/2026', '14:45'), null);
  assert.equal(parseScheduledDateTime('2026-08-02', '2:45 PM'), null);
});

test('reservation window accepts 30 minutes through 90 days', () => {
  const now = new Date('2026-08-01T10:00:00.000Z');
  assert.equal(validateReservationWindow(new Date(now.getTime() + MIN_LEAD_TIME_MS), now), 'valid');
  assert.equal(validateReservationWindow(new Date(now.getTime() + MIN_LEAD_TIME_MS - 1), now), 'too_soon');
  assert.equal(validateReservationWindow(new Date(now.getTime() + MAX_ADVANCE_TIME_MS), now), 'valid');
  assert.equal(validateReservationWindow(new Date(now.getTime() + MAX_ADVANCE_TIME_MS + 1), now), 'too_far');
});

test('near-term reservations open readiness immediately and compress the response window', () => {
  const createdAt = new Date('2026-08-02T08:45:00.000Z');
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const timeline = getReservationTimeline(scheduledAt, createdAt);
  assert.equal(timeline.readinessRequestedAt.toISOString(), createdAt.toISOString());
  assert.equal(timeline.readinessDeadline.toISOString(), '2026-08-02T08:52:30.000Z');
  assert.equal(scheduledAt - timeline.fulfilmentDeadline, FULFILMENT_LEAD_TIME_MS);
});

test('long-lead reservations use the operational 45-to-35 minute readiness window', () => {
  const createdAt = new Date('2026-08-01T09:15:00.000Z');
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const timeline = getReservationTimeline(scheduledAt, createdAt);
  assert.equal(scheduledAt - timeline.readinessRequestedAt, READINESS_LEAD_TIME_MS);
  assert.equal(scheduledAt - timeline.readinessDeadline, 35 * 60 * 1000);
  assert.equal(timeline.fallbackDispatchAt.toISOString(), timeline.readinessDeadline.toISOString());
});

test('departure planning is ETA-driven and tolerates scheduler latency', () => {
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const departure = getPlannedDepartureAt(scheduledAt, 18);
  assert.equal(scheduledAt - departure, 18 * 60 * 1000 + DEPARTURE_SAFETY_BUFFER_MS);
  assert.equal(canGuideArriveOnTime(scheduledAt, 18, new Date('2026-08-02T08:54:00.000Z')), true);
  assert.equal(canGuideArriveOnTime(scheduledAt, 18, new Date('2026-08-02T08:56:00.001Z')), false);
});
test('estimated reservation end includes route and waiting assistance', () => {
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const estimatedEndAt = getEstimatedEndAt({ scheduledAt, durationMin: 40, waitingHours: 2 });
  assert.equal(estimatedEndAt.toISOString(), '2026-08-02T11:55:00.000Z');
});
test('scheduled activation converges on the existing protected ride lifecycle', () => {
  const { canAssignedGuideTransition } = require('../src/services/bookingStateMachine');
  assert.equal(canAssignedGuideTransition('accepted', 'arrived'), true);
  // arrived -> in_progress is intentionally excluded here; only the Safety PIN endpoint may perform it.
  assert.equal(canAssignedGuideTransition('arrived', 'in_progress'), false);
  assert.equal(canAssignedGuideTransition('in_progress', 'completed'), true);
  assert.equal(canAssignedGuideTransition('accepted', 'in_progress'), false);
});

test('reservation scheduler has a durable processing lease index', () => {
  const Booking = require('../src/models/Booking');
  const names = Booking.schema.indexes().map(([, options]) => options.name);
  assert.equal(names.includes('reservation_scheduler_lock'), true);
});

test('notification outbox dedupe keys are unique', () => {
  const NotificationEvent = require('../src/models/NotificationEvent');
  assert.equal(NotificationEvent.schema.path('dedupeKey').options.unique, true);
});