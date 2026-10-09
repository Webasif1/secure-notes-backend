// Prints the indexes of every collection and the winning query plan of the
// main queries, to prove each one is served by an index (IXSCAN), not a
// full collection scan (COLLSCAN). Usage: `npm run check:indexes`
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Note } from '../models/Note.js';
import { Post } from '../models/Post.js';

await connectDB();

for (const model of [User, Note, Post]) {
  const indexes = await model.collection.indexes();
  console.log(`\n${model.collection.name}:`, indexes.map((i) => JSON.stringify(i.key)).join('  '));
}

function stages(plan, out = []) {
  if (!plan) return out;
  out.push(plan.stage + (plan.indexName ? `(${plan.indexName})` : ''));
  if (plan.inputStage) stages(plan.inputStage, out);
  (plan.inputStages || []).forEach((p) => stages(p, out));
  return out;
}

function findPlan(explain) {
  if (explain.queryPlanner) return explain.queryPlanner.winningPlan;
  const cursor = explain.stages?.[0]?.$cursor;
  if (cursor) return cursor.queryPlanner.winningPlan;
  return null;
}

const id = new mongoose.Types.ObjectId();
const checks = {
  'login (users by email)': User.find({ email: 'a@b.c' }).explain(),
  'admin list users': User.find().sort({ _id: -1 }).limit(10).explain(),
  'user by id': User.find({ _id: id }).explain(),
  'my notes': Note.find({ owner: id }).sort({ _id: -1 }).limit(10).explain(),
  'admin all notes': Note.find().sort({ _id: -1 }).limit(10).explain(),
  'note by id + owner': Note.find({ _id: id, owner: id }).explain(),
  'posts feed': Post.find().sort({ _id: -1 }).limit(10).explain(),
  'posts of user ($lookup side)': Post.find({ author: id }).sort({ _id: -1 }).limit(10).explain(),
  'interests aggregation $match': User.aggregate([
    { $match: { interests: { $type: 'string' } } },
    { $unwind: '$interests' },
    { $group: { _id: '$interests', n: { $sum: 1 } } },
  ]).explain(),
};

console.log('\nQuery plans:');
for (const [name, promise] of Object.entries(checks)) {
  const plan = findPlan(await promise);
  const s = plan ? stages(plan.queryPlan || plan) : ['(see raw explain)'];
  console.log(`  ${name.padEnd(32)} ${s.join(' <- ')}`);
}

await mongoose.disconnect();
