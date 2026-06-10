const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Human-readable booking reference ID (e.g., 'B1758076781238')
  bookingRefId: {
    type: String,
    required: true,
    unique: true,
  },
  service: {
    type: String,
    required: true,
  },

  // ── Phase 2: Vehicle Type ────────────────────────────────────────────────
  // Customer selects Scooter or Cab at booking time.
  // TODO (PENDING): Backend guide-matching by vehicleType is not yet implemented.
  //   When ready, update createBooking() to filter eligibleGuides by vehicleType.
  vehicleType: {
    type: String,
    enum: ['scooter', 'cab'],
    required: true,
  },

  // ── Phase 2: Location Fields ─────────────────────────────────────────────
  // Split from the original single 'location' field into pickup + destination.
  pickupLocation: {
    type: String,
    required: true,
  },
  destinationAddress: {
    type: String,
    required: true,
  },
  // Legacy field — kept for backward compat with existing DB documents.
  // New bookings do not populate this field.
  location: {
    type: String,
    required: false,
  },

  // ── Phase 2: Drop-back home ──────────────────────────────────────────────
  // If true, the guide returns the customer to pickupLocation after the visit.
  dropBack: {
    type: Boolean,
    default: false,
  },

  // Set to null initially; populated only when a guide accepts
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
    default: null,
    required: false,
  },
  // All approved guides whose specialties match the service.
  // Cleared once any guide accepts.
  eligibleGuides: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
  }],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name:         { type: String, required: true },
  date:         { type: Date,   required: true },
  time:         { type: String, required: true },
  waitingHours: { type: Number, default: 0 },
  createdAt:    { type: Date,   default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
  },
  cancelReason: {
    type: String,
    required: false,
  },
  cancelledBy: {
    type: String,
    enum: ['customer', 'guide', 'system'],
    required: false,
  },
  cancelledAt: {
    type: Date,
    required: false,
  },
});

module.exports = mongoose.model('Booking', BookingSchema);