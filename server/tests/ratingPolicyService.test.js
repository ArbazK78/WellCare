const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateRatingInput,
  calculateRatingSummary,
  toPublicRating,
  RatingValidationError,
} = require('../src/services/ratingPolicyService');

test('accepts a valid healthcare-service rating', () => {
  const value = validateRatingInput({
    direction: 'customer_to_guide',
    stars: 5,
    tags: ['caring_reassuring', 'helpful_hospital'],
    comment: 'Made the hospital visit feel manageable.',
  });
  assert.equal(value.stars, 5);
  assert.deepEqual(value.tags, ['caring_reassuring', 'helpful_hospital']);
});

test('requires a reason for a low rating', () => {
  assert.throws(
    () => validateRatingInput({ direction: 'guide_to_customer', stars: 2, tags: [] }),
    (error) => error instanceof RatingValidationError && error.code === 'LOW_RATING_REASON_REQUIRED',
  );
});

test('rejects labels from the other rating direction', () => {
  assert.throws(
    () => validateRatingInput({
      direction: 'guide_to_customer',
      stars: 4,
      tags: ['unsafe_driving'],
    }),
    (error) => error instanceof RatingValidationError && error.code === 'TAG_NOT_ALLOWED',
  );
});

test('keeps an aggregate private until five eligible ratings', () => {
  const early = calculateRatingSummary([5, 4, 5, 4]);
  assert.deepEqual(toPublicRating(early), {
    average: null,
    count: 4,
    isVisible: false,
    minimumRequired: 5,
  });

  const visible = toPublicRating(calculateRatingSummary([5, 4, 5, 4, 5]));
  assert.equal(visible.average, 4.6);
  assert.equal(visible.isVisible, true);
});

test('uses only the first one hundred values supplied to the summary', () => {
  const summary = calculateRatingSummary([...Array(100).fill(5), ...Array(10).fill(1)]);
  assert.equal(summary.count, 100);
  assert.equal(summary.average, 5);
});
