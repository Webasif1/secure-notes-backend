import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import userModel from "../models/user.models.js";

/**
 * token can come from the cookie or from "Authorization: Bearer <token>"
 * user is loaded again from db (by _id), so if admin deletes the user
 * or changes the role it works right away
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token =
    req.cookies.token ||
    (header && header.startsWith("Bearer ") ? header.split(" ")[1] : null);

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
      error: "Unauthorized",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        success: false,
        error: "Unauthorized",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export function authenticateAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Forbidden",
      success: false,
      error: "Only admin can do this",
    });
  }
  next();
}
