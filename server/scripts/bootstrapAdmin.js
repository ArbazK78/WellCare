require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../src/models/Admin');
const { isValidEmail, normalizeEmail, validatePassword } = require('../src/services/adminSecurityService');

const run = async () => {
  const email = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  if (!isValidEmail(email)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email.');
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(`ADMIN_BOOTSTRAP_PASSWORD: ${passwordError}`);

  await mongoose.connect(process.env.MONGO_URI);
  if (await Admin.exists({ role: 'owner' })) throw new Error('An owner account already exists. Bootstrap is intentionally one-time only.');
  if (await Admin.exists({ email })) throw new Error('An administrator already exists with this email.');

  await Admin.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'owner',
    status: 'active',
    emailVerifiedAt: new Date(),
    passwordChangedAt: new Date(),
  });
  console.log(`WellCare owner created for ${email}. Remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from the environment now.`);
};

run()
  .catch((error) => {
    console.error(`Admin bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
