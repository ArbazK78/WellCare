const mongoose = require('mongoose');

const safetyReportSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  reportedByCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectGuide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true, index: true },
  details: { type: String, required: true, maxlength: 500, select: false },
  status: {
    type: String,
    enum: ['new', 'reviewing', 'resolved', 'dismissed'],
    default: 'new',
    index: true,
  },
}, { timestamps: true });

safetyReportSchema.index(
  { booking: 1, reportedByCustomer: 1 },
  { unique: true, name: 'one_customer_safety_report_per_booking' },
);

module.exports = mongoose.model('SafetyReport', safetyReportSchema);
