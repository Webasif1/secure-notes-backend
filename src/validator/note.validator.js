import { body } from "express-validator";
import { validateRequest } from "./validate.js";

export const validateCreateNote = [
  body("title").isString().trim().notEmpty().withMessage("Title is required"),
  body("content").optional().isString(),
  validateRequest,
];

export const validateUpdateNote = [
  body("title")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Title can not be empty"),
  body("content").optional().isString(),
  validateRequest,
];
