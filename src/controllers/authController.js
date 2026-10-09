import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { parse } from '../utils/validate.js';
import { signToken } from '../utils/token.js';

const interests = z.array(z.string().trim().min(1).max(40)).max(20);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password,
  interests: interests.optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    interests: interests.optional(),
    password: password.optional(),
  })
  .strict();

const sendAuth = (res, status, user) =>
  res.status(status).json({ success: true, data: { token: signToken(user), user } });

// POST /api/auth/register  (public sign-up always creates a normal "user")
export async function register(req, res) {
  const data = parse(registerSchema, req.body);
  const user = await User.create({ ...data, role: 'user' });
  sendAuth(res, 201, user);
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body);
  // Uses the { email: 1 } unique index.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid email or password');
  }
  sendAuth(res, 200, user);
}

// GET /api/auth/me
export async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  res.json({ success: true, data: user });
}

// PATCH /api/auth/me  (update own name / interests / password)
export async function updateMe(req, res) {
  const data = parse(updateMeSchema, req.body);
  const user = await User.findById(req.user.id);
  Object.assign(user, data);
  await user.save(); // save() so the password hook runs
  res.json({ success: true, data: user });
}
