import { Router } from "express";
import { validateRegister, validateLogin } from "../validator/auth.validator.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  registerController,
  loginController,
  logoutController,
  getMeController,
} from "../controllers/auth.controller.js";

const authRouter = Router();

/**
 * @description Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
authRouter.post("/register", validateRegister, registerController);

/**
 * @description Login user
 * @route POST /api/auth/login
 * @access Public
 */
authRouter.post("/login", validateLogin, loginController);

/**
 * @description Logout user (clears the cookie)
 * @route POST /api/auth/logout
 * @access Public
 */
authRouter.post("/logout", logoutController);

/**
 * @description Get logged in user
 * @route GET /api/auth/get-me
 * @access Private
 */
authRouter.get("/get-me", authMiddleware, getMeController);

export default authRouter;
