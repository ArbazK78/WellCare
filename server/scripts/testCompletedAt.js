require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const booking = await Booking.findOne({ status: 'completed' }).sort({ _id: -1 });
  if (booking) {
    console.log('Found completed booking:', booking._id);
    console.log('Time:', booking.time);
    console.log('CompletedAt:', booking.completedAt);
  } else {
    console.log('No completed booking found.');
  }

  mongoose.connection.close();
}

test().catch(console.error);
