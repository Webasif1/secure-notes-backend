import mongoose from 'mongoose';
import { env } from './env.js';

// Reject query objects that contain `$` operators coming from user input
// (e.g. { email: { $ne: null } }), which blocks NoSQL injection.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

export async function connectDB() {
  await mongoose.connect(env.mongoUri);
  // Make sure the indexes declared with schema.index() exist before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
