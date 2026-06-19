require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const booking = await Booking.findOne({ status: 'arrived' }).populate('customer', 'safetyPin name phone email');
  if (booking) {
    console.log('Found booking:', booking._id);
    console.log('Customer populated:', booking.customer);
    console.log('Safety PIN:', booking.customer?.safetyPin);
  } else {
    const activeBooking = await Booking.findOne({ status: { $in: ['pending', 'accepted'] } }).populate('customer', 'safetyPin name phone email');
    if (activeBooking) {
      console.log('Found active booking:', activeBooking._id);
      console.log('Customer populated:', activeBooking.customer);
      console.log('Safety PIN:', activeBooking.customer?.safetyPin);
    } else {
      console.log('No active booking found to test.');
    }
  }

  mongoose.connection.close();
}

test().catch(console.error);
