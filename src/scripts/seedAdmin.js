// Creates the first admin account (or promotes an existing user to admin).
// Usage: set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in .env, then `npm run seed:admin`.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const { ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  process.exit(1);
}

await connectDB();

const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
if (existing) {
  existing.role = 'admin';
  await existing.save();
  console.log(`Promoted ${existing.email} to admin`);
} else {
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`Created admin ${ADMIN_EMAIL}`);
}

await mongoose.disconnect();
