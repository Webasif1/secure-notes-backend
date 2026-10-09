// create the first admin (or make an existing user admin)
// set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in .env then run: npm run seed:admin
import mongoose from "mongoose";
import connectToDB from "../config/database.js";
import userModel from "../models/user.models.js";

const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  process.exit(1);
}

await connectToDB();

const user = await userModel.findOne({ email: ADMIN_EMAIL.toLowerCase() });

if (user) {
  user.role = "admin";
  await user.save();
  console.log(`${user.email} is now admin`);
} else {
  await userModel.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });
  console.log(`Admin created: ${ADMIN_EMAIL}`);
}

await mongoose.disconnect();
