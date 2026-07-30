const mongoose = require('mongoose');

const NotificationEventSchema = new mongoose.Schema({
  dedupeKey: { type: String, required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  recipientRole: { type: String, enum: ['customer', 'guide'], required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  channelStatus: {
    inApp: { type: String, enum: ['pending', 'delivered'], default: 'pending' },
    push: { type: String, enum: ['pending', 'delivered', 'not_configured'], default: 'not_configured' },
    sms: { type: String, enum: ['pending', 'delivered', 'not_configured'], default: 'not_configured' },
  },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
});

NotificationEventSchema.index({ recipientRole: 1, recipient: 1, createdAt: -1 });
module.exports = mongoose.model('NotificationEvent', NotificationEventSchema);