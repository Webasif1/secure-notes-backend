import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getAllPosts,
  createPost,
  getPostsByUser,
} from "../controllers/post.controller.js";
import { validateCreatePost } from "../validator/post.validator.js";
import { validateId } from "../validator/validate.js";

const router = Router();

/**
 * @description Get all posts (paginated), posts are visible to everyone
 * @route GET /api/posts
 * @access Public
 */
router.get("/", getAllPosts);

/**
 * @description Get all posts of one user ($lookup, aggregation scenario 2)
 * @route GET /api/posts/user/:userId
 * @access Public
 */
router.get("/user/:userId", validateId("userId"), getPostsByUser);

/**
 * @description Create post
 * @route POST /api/posts
 * @access Private
 */
router.post("/", authMiddleware, validateCreatePost, createPost);

export default router;
