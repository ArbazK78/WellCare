class BookingPartyError extends Error {
  constructor(message, code = 'INVALID_BOOKING_PARTY') {
    super(message);
    this.name = 'BookingPartyError';
    this.statusCode = 422;
    this.code = code;
  }
}

const normalizePhone = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const hasCountryPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasCountryPrefix ? `+${digits}` : digits;
};

const isValidPhone = (phone) => /^\+?\d{10,15}$/.test(phone);

const resolveBookingParty = ({ bookingFor, passenger, customer }) => {
  const normalizedBookingFor = bookingFor === 'other' ? 'other' : 'self';

  if (normalizedBookingFor === 'self') {
    const name = typeof customer?.name === 'string' ? customer.name.trim() : '';
    const contactPhone = normalizePhone(customer?.phone);
    if (!name || !isValidPhone(contactPhone)) {
      throw new BookingPartyError(
        'Your profile needs a valid name and mobile number before booking.',
        'CUSTOMER_PROFILE_INCOMPLETE'
      );
    }
    return { bookingFor: 'self', name, contactPhone };
  }

  const name = typeof passenger?.name === 'string' ? passenger.name.trim() : '';
  const contactPhone = normalizePhone(passenger?.phone);
  if (name.length < 2 || name.length > 80) {
    throw new BookingPartyError(
      'Enter the full name of the person receiving assistance.',
      'PASSENGER_NAME_INVALID'
    );
  }
  if (!isValidPhone(contactPhone)) {
    throw new BookingPartyError(
      'Enter a valid mobile number for the person receiving assistance.',
      'PASSENGER_PHONE_INVALID'
    );
  }

  return { bookingFor: 'other', name, contactPhone };
};

module.exports = {
  BookingPartyError,
  isValidPhone,
  normalizePhone,
  resolveBookingParty,
};
