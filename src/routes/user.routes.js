import { Router } from "express";
import {
  authMiddleware,
  authenticateAdmin,
} from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getSingleUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByInterests,
} from "../controllers/user.controller.js";
import {
  validateCreateUser,
  validateUpdateUser,
} from "../validator/user.validator.js";
import { validateId } from "../validator/validate.js";

const router = Router();

router.use(authMiddleware);

/**
 * @description Users grouped by interests (aggregation scenario 1)
 * @route GET /api/users/interests
 * @access Private
 */
router.get("/interests", getUsersByInterests);

// everything below is admin only
router.use(authenticateAdmin);

/**
 * @description Get all users (paginated, optional ?search= on name/email)
 * @route GET /api/users
 * @access Admin
 */
router.get("/", getAllUsers);

/**
 * @description Add user
 * @route POST /api/users
 * @access Admin
 */
router.post("/", validateCreateUser, createUser);

/**
 * @description Get single user
 * @route GET /api/users/:id
 * @access Admin
 */
router.get("/:id", validateId(), getSingleUser);

/**
 * @description Update user
 * @route PATCH /api/users/:id
 * @access Admin
 */
router.patch("/:id", validateId(), validateUpdateUser, updateUser);

/**
 * @description Delete user with his notes and posts
 * @route DELETE /api/users/:id
 * @access Admin
 */
router.delete("/:id", validateId(), deleteUser);

export default router;
