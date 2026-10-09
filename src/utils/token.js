import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

export function sendTokenResponse(user, res, statusCode, message) {
  const token = jwt.sign({ id: user._id, role: user.role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    message,
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
    },
  });
}
