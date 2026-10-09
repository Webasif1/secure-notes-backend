import { Router } from "express";
import {
  authMiddleware,
  authenticateAdmin,
} from "../middleware/auth.middleware.js";
import {
  getMyNotes,
  getAllNotes,
  getSingleNote,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js";
import {
  validateCreateNote,
  validateUpdateNote,
  validateOwnerQuery,
} from "../validator/note.validator.js";
import { validateId } from "../validator/validate.js";

const router = Router();

router.use(authMiddleware);

/**
 * @description Get my notes (paginated ?page=&limit=)
 * @route GET /api/notes
 * @access Private
 */
router.get("/", getMyNotes);

/**
 * @description Get everyone's notes, optional ?owner=userId
 * @route GET /api/notes/all
 * @access Admin
 */
router.get("/all", authenticateAdmin, validateOwnerQuery, getAllNotes);

/**
 * @description Create note
 * @route POST /api/notes
 * @access Private
 */
router.post("/", validateCreateNote, createNote);

/**
 * @description Get single note (owner or admin)
 * @route GET /api/notes/:id
 * @access Private
 */
router.get("/:id", validateId(), getSingleNote);

/**
 * @description Update my note
 * @route PATCH /api/notes/:id
 * @access Private
 */
router.patch("/:id", validateId(), validateUpdateNote, updateNote);

/**
 * @description Delete my note
 * @route DELETE /api/notes/:id
 * @access Private
 */
router.delete("/:id", validateId(), deleteNote);

export default router;
