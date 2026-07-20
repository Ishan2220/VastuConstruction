import { Router } from 'express';
import { getCategoriesByType, addCustomCategory } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:type', getCategoriesByType);
router.post('/', addCustomCategory);

export default router;
