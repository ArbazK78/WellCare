require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const users = await User.find({ safetyPin: { $exists: false } });
  console.log(`Found ${users.length} users without a Safety PIN.`);

  for (const user of users) {
    user.safetyPin = Math.floor(1000 + Math.random() * 9000).toString();
    await user.save();
    console.log(`Assigned PIN ${user.safetyPin} to user ${user.name}`);
  }

  // Also check users where safetyPin might exist but is empty or null
  const emptyUsers = await User.find({ $or: [{ safetyPin: "" }, { safetyPin: null }] });
  for (const user of emptyUsers) {
    user.safetyPin = Math.floor(1000 + Math.random() * 9000).toString();
    await user.save();
    console.log(`Assigned PIN ${user.safetyPin} to user ${user.name} (was empty)`);
  }

  console.log('Done populating Safety PINs.');
  mongoose.connection.close();
}

run().catch(console.error);
