import { Router } from 'express';
import { getComments, createComment, voteComment } from '../controllers/comments.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/deals/:dealId/comments', optionalAuth, getComments);
router.post('/deals/:dealId/comments', authenticate, createComment);
router.post('/comments/:commentId/vote', authenticate, voteComment);

export default router;
