import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.patch('/mark-all-read', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

export default router;
