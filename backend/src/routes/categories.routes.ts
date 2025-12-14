import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/categories.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, createCategory); // In production, add admin middleware

export default router;
