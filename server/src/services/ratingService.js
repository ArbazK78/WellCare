const mongoose = require('mongoose');
const ServiceReview = require('../models/ServiceReview');
const Guide = require('../models/Guide');
const User = require('../models/User');
const {
  RATING_POLICY_VERSION,
  RATING_WINDOW_SIZE,
  validateRatingInput,
  calculateRatingSummary,
  toPublicRating,
} = require('./ratingPolicyService');

const getTargetConfiguration = (direction) => {
  if (direction === 'customer_to_guide') {
    return {
      model: Guide,
      targetField: 'guide',
      reviewQuery: 'guide',
      includeLegacyRating: true,
    };
  }
  return {
    model: User,
    targetField: 'customer',
    reviewQuery: 'customer',
    includeLegacyRating: false,
  };
};

const recomputeRatingSummary = async ({ direction, targetId, session }) => {
  const config = getTargetConfiguration(direction);
  const reviews = await ServiceReview.find({
    [config.reviewQuery]: targetId,
    direction,
    status: 'active',
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(RATING_WINDOW_SIZE)
    .select('stars')
    .session(session)
    .lean();

  const summary = calculateRatingSummary(reviews);
  const publicSummary = toPublicRating(summary);
  const set = {
    'ratingSummary.average': publicSummary.average,
    'ratingSummary.rawAverage': summary.average,
    'ratingSummary.count': summary.count,
    'ratingSummary.ratingSum': summary.ratingSum,
    'ratingSummary.distribution': summary.distribution,
    'ratingSummary.policyVersion': summary.policyVersion,
    'ratingSummary.updatedAt': new Date(),
  };
  if (config.includeLegacyRating) set.rating = publicSummary.average || 0;

  await config.model.updateOne({ _id: targetId }, { $set: set }, { session });
  return summary;
};

const createServiceReview = async ({ booking, direction, input }) => {
  const normalized = validateRatingInput({ direction, ...input });
  const targetId = direction === 'customer_to_guide' ? booking.guide : booking.customer;
  const session = await mongoose.startSession();
  let summary;

  try {
    await session.withTransaction(async () => {
      await ServiceReview.create([{
        booking: booking._id,
        customer: booking.customer,
        guide: booking.guide,
        direction,
        stars: normalized.stars,
        tags: normalized.tags,
        comment: normalized.comment,
        bookingFor: booking.bookingFor || 'self',
        recipientNameSnapshot: booking.name || '',
        adminFlag: normalized.stars <= 2,
        flagReasons: normalized.stars <= 2 ? ['low_rating'] : [],
        policyVersion: RATING_POLICY_VERSION,
      }], { session });

      summary = await recomputeRatingSummary({
        direction,
        targetId,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return {
    summary,
    publicSummary: toPublicRating(summary),
  };
};

const getReviewedBookingIds = async (bookingIds, direction) => {
  if (!bookingIds.length) return new Set();
  const reviews = await ServiceReview.find({
    booking: { $in: bookingIds },
    direction,
  }).select('booking').lean();
  return new Set(reviews.map((review) => review.booking.toString()));
};

module.exports = {
  createServiceReview,
  recomputeRatingSummary,
  getReviewedBookingIds,
};
