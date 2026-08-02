const RATING_POLICY_VERSION = 1;
const RATING_WINDOW_SIZE = 100;
const MINIMUM_VISIBLE_RATINGS = 5;
const MAX_COMMENT_LENGTH = 500;

const TAGS = Object.freeze({
  customer_to_guide: Object.freeze([
    'caring_reassuring',
    'polite_respectful',
    'helpful_hospital',
    'patient_supportive',
    'punctual',
    'clear_communication',
    'safe_comfortable_journey',
    'arrived_late',
    'communication_issue',
    'assistance_incomplete',
    'unprofessional_behaviour',
    'unsafe_driving',
    'vehicle_cleanliness',
    'other',
  ]),
  guide_to_customer: Object.freeze([
    'ready_on_time',
    'respectful',
    'clear_communication',
    'accurate_booking_details',
    'safe_cooperative',
    'unable_to_contact',
    'incorrect_pickup_information',
    'unreasonable_waiting',
    'disrespectful_behaviour',
    'unsafe_request',
    'booking_details_mismatch',
    'other',
  ]),
});

class RatingValidationError extends Error {
  constructor(message, code = 'RATING_INVALID', statusCode = 422) {
    super(message);
    this.name = 'RatingValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const normalizeComment = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new RatingValidationError('Feedback must be plain text', 'COMMENT_INVALID');
  }

  const normalized = value
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (normalized.length > MAX_COMMENT_LENGTH) {
    throw new RatingValidationError(
      `Feedback cannot exceed ${MAX_COMMENT_LENGTH} characters`,
      'COMMENT_TOO_LONG',
    );
  }
  return normalized;
};

const validateRatingInput = ({ direction, stars, tags, comment }) => {
  if (!Object.prototype.hasOwnProperty.call(TAGS, direction)) {
    throw new RatingValidationError('Unknown rating direction', 'DIRECTION_INVALID');
  }

  const numericStars = Number(stars);
  if (!Number.isInteger(numericStars) || numericStars < 1 || numericStars > 5) {
    throw new RatingValidationError('Choose a rating from 1 to 5 stars', 'STARS_INVALID');
  }

  const rawTags = tags === undefined ? [] : tags;
  if (!Array.isArray(rawTags)) {
    throw new RatingValidationError('Rating labels must be a list', 'TAGS_INVALID');
  }

  const uniqueTags = [...new Set(rawTags.map((tag) => String(tag).trim()).filter(Boolean))];
  if (uniqueTags.length > 6) {
    throw new RatingValidationError('Choose no more than 6 rating labels', 'TOO_MANY_TAGS');
  }

  const allowedTags = new Set(TAGS[direction]);
  if (uniqueTags.some((tag) => !allowedTags.has(tag))) {
    throw new RatingValidationError('One or more rating labels are invalid', 'TAG_NOT_ALLOWED');
  }

  if (numericStars <= 2 && uniqueTags.length === 0) {
    throw new RatingValidationError('Select at least one reason for this rating', 'LOW_RATING_REASON_REQUIRED');
  }

  const normalizedComment = normalizeComment(comment);
  if (uniqueTags.includes('other') && !normalizedComment) {
    throw new RatingValidationError('Tell us a little more when choosing Other', 'OTHER_COMMENT_REQUIRED');
  }

  return { stars: numericStars, tags: uniqueTags, comment: normalizedComment };
};

const calculateRatingSummary = (ratings) => {
  const normalizedRatings = ratings
    .map((value) => Number(typeof value === 'object' ? value.stars : value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5)
    .slice(0, RATING_WINDOW_SIZE);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ratingSum = normalizedRatings.reduce((sum, rating) => {
    distribution[rating] += 1;
    return sum + rating;
  }, 0);
  const count = normalizedRatings.length;

  return {
    average: count ? Math.round((ratingSum / count) * 10) / 10 : null,
    count,
    ratingSum,
    distribution,
    policyVersion: RATING_POLICY_VERSION,
  };
};

const toPublicRating = (summary) => {
  const count = Number(summary?.count || 0);
  return {
    average: count >= MINIMUM_VISIBLE_RATINGS ? summary?.average ?? null : null,
    count,
    isVisible: count >= MINIMUM_VISIBLE_RATINGS,
    minimumRequired: MINIMUM_VISIBLE_RATINGS,
  };
};

module.exports = {
  RATING_POLICY_VERSION,
  RATING_WINDOW_SIZE,
  MINIMUM_VISIBLE_RATINGS,
  MAX_COMMENT_LENGTH,
  TAGS,
  RatingValidationError,
  normalizeComment,
  validateRatingInput,
  calculateRatingSummary,
  toPublicRating,
};
