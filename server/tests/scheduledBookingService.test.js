const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DISPATCH_LEAD_TIME_MS,
  getDispatchAt,
  parseScheduledDateTime,
} = require('../src/services/scheduledBookingService');
const {
  FALLBACK_LEAD_TIME_MS,
  FULFILMENT_LEAD_TIME_MS,
  MAX_ADVANCE_TIME_MS,
  MIN_LEAD_TIME_MS,
  READINESS_LEAD_TIME_MS,
  getEstimatedEndAt,
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

test('reservation readiness, fallback, and fulfilment cutoffs are deterministic', () => {
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const timeline = getReservationTimeline(scheduledAt);
  assert.equal(scheduledAt - timeline.readinessDeadline, READINESS_LEAD_TIME_MS);
  assert.equal(scheduledAt - timeline.fallbackDispatchAt, FALLBACK_LEAD_TIME_MS);
  assert.equal(scheduledAt - timeline.fulfilmentDeadline, FULFILMENT_LEAD_TIME_MS);
});

test('estimated reservation end includes route and waiting assistance', () => {
  const scheduledAt = new Date('2026-08-02T09:15:00.000Z');
  const estimatedEndAt = getEstimatedEndAt({ scheduledAt, durationMin: 40, waitingHours: 2 });
  assert.equal(estimatedEndAt.toISOString(), '2026-08-02T11:55:00.000Z');
});