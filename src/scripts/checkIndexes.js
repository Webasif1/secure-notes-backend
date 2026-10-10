// prints all indexes and the query plan of every main query
// IXSCAN = index used, COLLSCAN = full collection scan (bad)
// run: npm run check:indexes
import mongoose from "mongoose";
import connectToDB from "../config/database.js";
import userModel from "../models/user.models.js";
import noteModel from "../models/note.models.js";
import postModel from "../models/post.models.js";

await connectToDB();

for (const model of [userModel, noteModel, postModel]) {
  const indexes = await model.collection.indexes();
  console.log(
    `${model.collection.name}:`,
    indexes.map((index) => JSON.stringify(index.key)).join("  "),
  );
}

function getStages(plan, stages = []) {
  if (!plan) return stages;
  stages.push(plan.stage + (plan.indexName ? `(${plan.indexName})` : ""));
  if (plan.inputStage) getStages(plan.inputStage, stages);
  (plan.inputStages || []).forEach((p) => getStages(p, stages));
  return stages;
}

function getWinningPlan(explain) {
  if (explain.queryPlanner) return explain.queryPlanner.winningPlan;
  return explain.stages[0].$cursor.queryPlanner.winningPlan;
}

const id = new mongoose.Types.ObjectId();
const queries = {
  "login (user by email)": userModel.find({ email: "a@b.com" }).explain(),
  "admin all users": userModel.find().sort({ _id: -1 }).limit(10).explain(),
  "user by id": userModel.find({ _id: id }).explain(),
  "my notes": noteModel.find({ owner: id }).sort({ _id: -1 }).limit(10).explain(),
  "admin all notes": noteModel.find().sort({ _id: -1 }).limit(10).explain(),
  "single note": noteModel.find({ _id: id, owner: id }).explain(),
  "all posts": postModel.find().sort({ _id: -1 }).limit(10).explain(),
  "posts of user ($lookup)": postModel
    .find({ author: id })
    .sort({ _id: -1 })
    .limit(10)
    .explain(),
  "interests aggregation": userModel
    .aggregate([
      { $match: { interests: { $type: "string" } } },
      { $unwind: "$interests" },
      { $group: { _id: "$interests", count: { $sum: 1 } } },
    ])
    .explain(),
};

console.log("\nQuery plans:");
for (const [name, explainPromise] of Object.entries(queries)) {
  const plan = getWinningPlan(await explainPromise);
  console.log(`  ${name.padEnd(28)} ${getStages(plan.queryPlan || plan).join(" <- ")}`);
}

await mongoose.disconnect();
