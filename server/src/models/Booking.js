const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
  },
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model handles both users and guides
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model handles both users and guides
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  waitingHours: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending', // Set the default status to 'pending'
  },
  // You might want to add a field for the accepted guide's ID specifically
  // acceptedGuide: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  // },
  // You might also want to track the acceptance date/time
  // acceptedAt: {
  //   type: Date,
  // },
});

module.exports = mongoose.model('Booking', BookingSchema);