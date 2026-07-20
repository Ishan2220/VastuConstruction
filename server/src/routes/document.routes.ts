import { Router } from 'express';
import * as ctrl from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

export default router;
