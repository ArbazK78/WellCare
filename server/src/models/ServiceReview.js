const mongoose = require('mongoose');

const serviceReviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true, index: true },
  direction: { type: String, enum: ['customer_to_guide', 'guide_to_customer'], required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  tags: { type: [String], default: [] },
  // Written feedback is private and excluded from normal customer/guide queries.
  comment: { type: String, maxlength: 500, default: '', select: false },
  bookingFor: { type: String, enum: ['self', 'other'], default: 'self' },
  // Retains enough context to revisit the someone-else policy later.
  recipientNameSnapshot: { type: String, default: '', select: false },
  status: { type: String, enum: ['active', 'excluded'], default: 'active', index: true },
  adminFlag: { type: Boolean, default: false, index: true },
  flagReasons: { type: [String], default: [] },
  exclusionReason: { type: String, default: '', select: false },
  policyVersion: { type: Number, default: 1 },
}, { timestamps: true });

serviceReviewSchema.index(
  { booking: 1, direction: 1 },
  { unique: true, name: 'one_review_per_direction_per_booking' },
);
serviceReviewSchema.index(
  { guide: 1, direction: 1, status: 1, createdAt: -1 },
  { name: 'guide_rating_window' },
);
serviceReviewSchema.index(
  { customer: 1, direction: 1, status: 1, createdAt: -1 },
  { name: 'customer_rating_window' },
);


module.exports = mongoose.model('ServiceReview', serviceReviewSchema);
