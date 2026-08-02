const Booking = require('../models/Booking');
const SafetyReport = require('../models/SafetyReport');
const ratingService = require('../services/ratingService');
const {
  RatingValidationError,
  normalizeComment,
} = require('../services/ratingPolicyService');

const duplicateResponse = (res, message = 'A rating has already been submitted for this booking') => (
  res.status(409).json({ message, code: 'REVIEW_ALREADY_SUBMITTED' })
);

const handleError = (res, error, context) => {
  if (error instanceof RatingValidationError) {
    return res.status(error.statusCode).json({ message: error.message, code: error.code });
  }
  if (error?.code === 11000) return duplicateResponse(res);
  console.error(context, error);
  return res.status(500).json({ message: 'Unable to save this feedback right now' });
};

exports.submitCustomerGuideReview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer?.toString() !== req.userId) {
      return res.status(403).json({ message: 'You cannot rate this booking' });
    }
    if (booking.status !== 'completed' || booking.paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'The guide can be rated after the completed trip is paid' });
    }
    if (!booking.guide) return res.status(409).json({ message: 'This booking has no assigned guide' });

    const result = await ratingService.createServiceReview({
      booking,
      direction: 'customer_to_guide',
      input: req.body,
    });
    return res.status(201).json({
      message: 'Thank you for rating your guide',
      reviewStatus: 'submitted',
      rating: result.publicSummary,
    });
  } catch (error) {
    return handleError(res, error, 'Customer guide rating failed:');
  }
};

exports.submitGuideCustomerReview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.guide || booking.guide.toString() !== req.guide.id) {
      return res.status(403).json({ message: 'You cannot rate this booking' });
    }
    if (booking.status !== 'completed') {
      return res.status(409).json({ message: 'The customer can be rated after the trip is completed' });
    }

    const result = await ratingService.createServiceReview({
      booking,
      direction: 'guide_to_customer',
      input: req.body,
    });
    return res.status(201).json({
      message: 'Thank you for sharing private trip feedback',
      reviewStatus: 'submitted',
      // Customer reputation is deliberately not disclosed to guides.
      ratingUpdated: Boolean(result.summary),
    });
  } catch (error) {
    return handleError(res, error, 'Guide customer rating failed:');
  }
};

exports.dismissCustomerPrompt = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId, customer: req.userId },
      { $set: { customerRatingPromptDismissedAt: new Date() } },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return res.json({ dismissed: true });
  } catch (error) {
    return handleError(res, error, 'Customer rating prompt dismissal failed:');
  }
};

exports.dismissGuidePrompt = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId, guide: req.guide.id },
      { $set: { guideRatingPromptDismissedAt: new Date() } },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return res.json({ dismissed: true });
  } catch (error) {
    return handleError(res, error, 'Guide rating prompt dismissal failed:');
  }
};

exports.submitSafetyReport = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer?.toString() !== req.userId) {
      return res.status(403).json({ message: 'You cannot report this booking' });
    }
    if (booking.status !== 'completed' || !booking.guide) {
      return res.status(409).json({ message: 'A safety report can be attached after this trip is completed' });
    }

    const details = normalizeComment(req.body.details);
    if (!details) {
      return res.status(422).json({ message: 'Describe the concern so it can be reviewed', code: 'DETAILS_REQUIRED' });
    }

    await SafetyReport.create({
      booking: booking._id,
      reportedByCustomer: booking.customer,
      subjectGuide: booking.guide,
      details,
    });
    return res.status(201).json({
      message: 'Thank you for reporting your concern. It has been recorded for review.',
      reportStatus: 'new',
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'A safety concern is already recorded for this booking' });
    }
    return handleError(res, error, 'Safety report submission failed:');
  }
};
