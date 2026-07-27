const ACTIVE_ASSIGNED_STATUSES = new Set(['accepted', 'arrived']);

const canAssignedGuideTransition = (currentStatus, nextStatus) => {
  const transitions = {
    accepted: new Set(['arrived']),
    in_progress: new Set(['completed']),
  };
  return transitions[currentStatus]?.has(nextStatus) || false;
};

const getCustomerCancellationResult = (status) => {
  if (status === 'cancelled') return 'already_cancelled';
  if (['pending', 'accepted', 'arrived'].includes(status)) return 'allowed';
  return 'blocked';
};
const isAssignedGuide = (booking, guideId) => (
  Boolean(booking?.guide) && booking.guide.toString() === guideId
);

module.exports = {
  ACTIVE_ASSIGNED_STATUSES,
  canAssignedGuideTransition,
  getCustomerCancellationResult,
  isAssignedGuide,
};
