import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getAllPosts,
  getSinglePost,
  createPost,
  deletePost,
  getPostsByUser,
} from "../controllers/post.controller.js";
import { validateCreatePost } from "../validator/post.validator.js";
import { validateId } from "../validator/validate.js";

const router = Router();

/**
 * @description Get all posts (paginated)
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
 * @description Get single post
 * @route GET /api/posts/:id
 * @access Public
 */
router.get("/:id", validateId(), getSinglePost);

/**
 * @description Create post
 * @route POST /api/posts
 * @access Private
 */
router.post("/", authMiddleware, validateCreatePost, createPost);

/**
 * @description Delete post (author or admin)
 * @route DELETE /api/posts/:id
 * @access Private
 */
router.delete("/:id", authMiddleware, validateId(), deletePost);

export default router;
