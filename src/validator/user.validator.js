import { body } from "express-validator";
import { validateRequest } from "./validate.js";

export const validateCreateUser = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("email").trim().toLowerCase().isEmail().withMessage("Invalid email format"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
  body("interests").optional().isArray({ max: 20 }),
  body("interests.*").isString().trim().notEmpty(),
  validateRequest,
];

export const validateUpdateUser = [
  body("name").optional().isString().trim().notEmpty(),
  body("email").optional().trim().toLowerCase().isEmail().withMessage("Invalid email format"),
  body("password")
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
  body("interests").optional().isArray({ max: 20 }),
  body("interests.*").isString().trim().notEmpty(),
  validateRequest,
];
