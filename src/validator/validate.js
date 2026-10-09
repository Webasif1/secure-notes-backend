import { param, validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      success: false,
      errors: errors.array(),
    });
  }
  next();
}

export const validateId = (name = "id") => [
  param(name).isMongoId().withMessage("Invalid id"),
  validateRequest,
];
