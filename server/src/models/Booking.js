const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Human-readable booking reference ID (e.g., 'B1758076781238')
  bookingRefId: {
    type: String,
    required: true,
    unique: true,
  },

  bookingMode: {
    type: String,
    enum: ['now', 'schedule'],
    default: 'now',
  },

  // Canonical pickup and dispatch timestamps for scheduled bookings.
  // dispatchStartedAt also acts as a durable scheduler claim/lock.
  scheduledAt: { type: Date, default: null },
  dispatchAt: { type: Date, default: null },
  dispatchStartedAt: { type: Date, default: null },
  // Hard product-level deadline for finding a guide once dispatch begins.
  dispatchExpiresAt: { type: Date, default: null },

  // Scheduled reservation lifecycle. Live bookings leave these fields unset.
  reservationStatus: {
    type: String,
    enum: ['open', 'claimed', 'readiness_pending', 'ready', 'fallback_dispatching', 'fulfilled', 'unfulfilled'],
    default: undefined,
  },
  assignmentSource: { type: String, enum: ['instant', 'reservation', 'fallback'], default: undefined },
  reservationAcceptedAt: { type: Date, default: null },
  readinessRequestedAt: { type: Date, default: null },
  readinessDeadline: { type: Date, default: null },
  readinessConfirmedAt: { type: Date, default: null },
  fallbackDispatchAt: { type: Date, default: null },
  fulfilmentDeadline: { type: Date, default: null },
  activationAt: { type: Date, default: null },
  plannedDepartureAt: { type: Date, default: null },
  guideToPickupEtaMinutes: { type: Number, min: 0, default: null },
  lastEtaCheckedAt: { type: Date, default: null },
  pickupWindowStart: { type: Date, default: null },
  pickupWindowEnd: { type: Date, default: null },
  reservationProcessingAt: { type: Date, default: null, select: false },
  estimatedEndAt: { type: Date, default: null },
  guideCommitmentStatus: {
    type: String,
    enum: ['committed', 'readiness_required', 'ready', 'active', 'released', 'cancelled'],
    default: undefined,
  },
  reservationAudit: [{
    event: { type: String, required: true },
    at: { type: Date, default: Date.now },
    actor: { type: String, enum: ['customer', 'guide', 'system'], required: true },
    guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide' },
  }],

  // Free-form metadata for future use (e.g. visitReason)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
  // Authoritative Google Places classification captured when the booking is created.
  destinationPlaceId: { type: String },
  destinationPlaceTypes: [{ type: String }],
  destinationPrimaryType: { type: String },
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
  // ── Waterfall Dispatch Fields ────────────────────────────────────────────
  // Randomized queue of all matched guides
  guideQueue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
  }],
  // The single guide currently reviewing the offer
  currentOfferedGuide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
    default: null,
  },
  // When the 30-second window closes for the current guide
  offerExpiresAt: {
    type: Date,
    default: null,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // The authenticated customer owns the booking; these fields identify the
  // actual person receiving assistance and the number the guide should call.
  bookingFor: { type: String, enum: ['self', 'other'], default: 'self' },
  name:         { type: String, required: true },
  contactPhone: { type: String },
  date:         { type: Date,   required: true },
  time:         { type: String, required: true },
  waitingHours: { type: Number, default: 0 },
  // Gateway Fields
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  
  // Timestamps
  createdAt:    { type: Date,   default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'arrived', 'in_progress', 'rejected', 'cancelled', 'completed'],
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
  completedAt: {
    type: Date,
    required: false,
  },
  // Authoritative road-route pricing snapshot captured at creation time.
  distanceKm: { type: Number, min: 0 },
  durationMin: { type: Number, min: 0 },
  totalFare: {
    type: Number,
    min: 0,
    default: 0,
  },
  fareBreakdown: {
    baseFare: { type: Number, min: 0 },
    perKmRate: { type: Number, min: 0 },
    distanceFare: { type: Number, min: 0 },
    tripMultiplier: { type: Number, enum: [1, 2] },
    currency: { type: String, default: 'INR' },
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  customerRatingPromptDismissedAt: { type: Date, default: null },
  guideRatingPromptDismissedAt: { type: Date, default: null },
});

BookingSchema.index(
  { bookingMode: 1, status: 1, dispatchStartedAt: 1, dispatchAt: 1 },
  { name: 'scheduled_booking_activation' }
);

BookingSchema.index(
  { bookingMode: 1, reservationStatus: 1, scheduledAt: 1 },
  { name: 'reservation_marketplace' }
);
BookingSchema.index(
  { bookingMode: 1, status: 1, reservationProcessingAt: 1, readinessRequestedAt: 1 },
  { name: 'reservation_scheduler_lock' }
);
BookingSchema.index(
  { guide: 1, scheduledAt: 1, estimatedEndAt: 1, reservationStatus: 1 },
  { name: 'guide_reservation_conflicts' }
);
module.exports = mongoose.model('Booking', BookingSchema);