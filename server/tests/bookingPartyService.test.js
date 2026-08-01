const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePhone,
  resolveBookingParty,
} = require('../src/services/bookingPartyService');

test('self bookings use the authenticated customer profile', () => {
  const result = resolveBookingParty({
    bookingFor: 'self',
    passenger: { name: 'Forged Name', phone: '9999999999' },
    customer: { name: 'Rizwan Khan', phone: '635 144 2838' },
  });

  assert.deepEqual(result, {
    bookingFor: 'self',
    name: 'Rizwan Khan',
    contactPhone: '6351442838',
  });
});

test('someone-else bookings use the supplied passenger identity', () => {
  const result = resolveBookingParty({
    bookingFor: 'other',
    passenger: { name: '  Fatima Khan  ', phone: '+91 98765-43210' },
    customer: { name: 'Rizwan Khan', phone: '6351442838' },
  });

  assert.deepEqual(result, {
    bookingFor: 'other',
    name: 'Fatima Khan',
    contactPhone: '+919876543210',
  });
});

test('someone-else bookings require a valid passenger phone', () => {
  assert.throws(
    () => resolveBookingParty({
      bookingFor: 'other',
      passenger: { name: 'Fatima Khan', phone: '123' },
      customer: { name: 'Rizwan Khan', phone: '6351442838' },
    }),
    (error) => error.code === 'PASSENGER_PHONE_INVALID' && error.statusCode === 422
  );
});

test('phone normalization preserves an optional country prefix', () => {
  assert.equal(normalizePhone('(987) 654-3210'), '9876543210');
  assert.equal(normalizePhone('+91 98765 43210'), '+919876543210');
});
