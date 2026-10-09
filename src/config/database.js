import mongoose from "mongoose";
import { config } from "./config.js";

// block NoSQL injection like { "email": { "$ne": null } } in query filters
mongoose.set("sanitizeFilter", true);

const connectToDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    // create the indexes defined with schema.index() before taking requests
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.syncIndexes()),
    );
    console.log("Connected to db");
  } catch (err) {
    console.log("database connection error:" + err);
    process.exit(1);
  }
};

export default connectToDB;
