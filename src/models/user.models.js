import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    interests: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  { timestamps: true },
);

/**
 * Indexes
 *
 * { email: 1 } unique
 *  - login and register find the user by email
 *  - also makes sure one email = one account
 *
 * { interests: 1 }  (multikey index because interests is an array)
 *  - used by the "group users by interests" aggregation.
 *    the first $match stage only picks users that have interests,
 *    with this index mongo reads only those users (IXSCAN, no COLLSCAN)
 *
 * No other index needed:
 *  - get user by id, admin user list (sorted by _id) and the
 *    $lookup aggregation ($match by _id) all use the default _id index
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const userModel = mongoose.model("user", userSchema);

export default userModel;
