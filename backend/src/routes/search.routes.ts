import { Router } from 'express';
import { search, autocomplete, aggregations } from '../controllers/search.controller.js';

const router = Router();

// Search deals with advanced filters
router.get('/deals', search);

// Autocomplete suggestions
router.get('/autocomplete', autocomplete);

// Get search aggregations (facets)
router.get('/aggregations', aggregations);

export default router;
