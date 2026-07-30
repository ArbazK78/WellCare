require('dotenv').config();
const mongoose = require('mongoose');
const Guide = require('../src/models/Guide');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI);

  const approvedBefore = await Guide.countDocuments({ status: 'approved' });
  const alreadyCab = await Guide.countDocuments({ status: 'approved', vehicleType: 'cab' });
  const result = await Guide.updateMany(
    { status: 'approved', vehicleType: { $ne: 'cab' } },
    { $addToSet: { vehicleType: 'cab' } }
  );
  const approvedAfter = await Guide.countDocuments({ status: 'approved' });
  const cabAfter = await Guide.countDocuments({ status: 'approved', vehicleType: 'cab' });

  console.log(JSON.stringify({ approvedBefore, alreadyCab, matched: result.matchedCount, modified: result.modifiedCount, approvedAfter, cabAfter }));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
