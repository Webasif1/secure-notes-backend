import { body } from "express-validator";
import { validateRequest } from "./validate.js";

export const validateRegister = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("email").trim().toLowerCase().isEmail().withMessage("Invalid email format"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("interests")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Interests must be an array"),
  body("interests.*").isString().trim().notEmpty(),
  validateRequest,
];

export const validateLogin = [
  body("email").trim().toLowerCase().isEmail().withMessage("Invalid email format"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  validateRequest,
];

export const validateUpdateMe = [
  body("name").optional().isString().trim().notEmpty(),
  body("password")
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("interests")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Interests must be an array"),
  body("interests.*").isString().trim().notEmpty(),
  validateRequest,
];
