import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/token.js';

/**
 * Requires a valid "Authorization: Bearer <jwt>" header.
 * The user is re-loaded from the database (by _id, using the default index)
 * so a deleted user or a changed role takes effect immediately.
 */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) throw new AppError(401, 'User no longer exists');

  req.user = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  next();
}

/** Allows the request only if the logged-in user has one of the given roles. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };
