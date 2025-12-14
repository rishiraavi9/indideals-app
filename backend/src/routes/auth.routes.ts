import { Router } from 'express';
import { signup, login, getMe, refreshAccessToken, logout, logoutAll } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);

export default router;
