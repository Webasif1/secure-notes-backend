import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Slow down password guessing on login / sign-up.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

export default router;
