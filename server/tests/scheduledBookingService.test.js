const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DISPATCH_LEAD_TIME_MS,
  getDispatchAt,
  parseScheduledDateTime,
} = require('../src/services/scheduledBookingService');

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
