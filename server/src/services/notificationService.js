const NotificationEvent = require('../models/NotificationEvent');

const enqueue = async ({ booking, recipientRole, recipient, type, payload = {}, dedupeKey }) => {
  if (!booking || !recipient || !dedupeKey) return null;
  try {
    return await NotificationEvent.findOneAndUpdate(
      { dedupeKey },
      {
        $setOnInsert: {
          booking,
          recipientRole,
          recipient,
          type,
          payload,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    console.error(`Notification outbox enqueue failed (${type}):`, error.message);
    return null;
  }
};

module.exports = { enqueue };