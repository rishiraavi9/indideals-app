import { Router } from 'express';
import { fetchImageFromUrl } from '../controllers/scraper.controller.js';

const router = Router();

router.post('/fetch-image', fetchImageFromUrl);

export default router;
