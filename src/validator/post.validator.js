import { body } from "express-validator";
import { validateRequest } from "./validate.js";

export const validateCreatePost = [
  body("title").isString().trim().notEmpty().withMessage("Title is required"),
  body("body").isString().trim().notEmpty().withMessage("Body is required"),
  validateRequest,
];
