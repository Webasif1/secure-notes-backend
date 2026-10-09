import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['user', 'admin'];
const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
    },
  },
  { timestamps: true }
);

/*
 * Indexes (only what the queries need):
 *
 * 1. { email: 1 } unique
 *    - Login and register look users up by email.
 *    - Also enforces one account per email.
 *
 * 2. { interests: 1 }  (multikey, because `interests` is an array)
 *    - Supports the "group users by interests" aggregation: its first
 *      $match stage only selects users that have at least one interest,
 *      and that $match runs as an index scan instead of a collection scan.
 *
 * Not needed (covered by the built-in _id index):
 *    - GET a user by id (profile, admin get/update/delete).
 *    - Admin "list all users": paginated and sorted by _id.
 *    - Scenario 2 ($lookup) starts with a $match on _id.
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
