import { Router } from 'express';
import { listPosts, getPost, createPost, deletePost, postsByUser } from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Posts are visible to everyone.
router.get('/', listPosts);
router.get('/user/:userId', postsByUser);
router.get('/:id', getPost);

router.post('/', authenticate, createPost);
router.delete('/:id', authenticate, deletePost);

export default router;
