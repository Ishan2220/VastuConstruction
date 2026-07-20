import { Router } from 'express';
import * as ctrl from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// List and get by ID allowed for Admin and Engineer
router.get('/', authorize('ADMIN', 'ENGINEER', { page: 'Projects' }), ctrl.list);
router.get('/:id', authorize('ADMIN', 'ENGINEER', { page: 'Projects' }), ctrl.getById);

// Add progress (Engineers and Admins)
router.post('/:id/progress', authorize('ADMIN', 'ENGINEER', { page: 'Projects' }), ctrl.addProgress);

// Admin only actions
router.post('/', authorize('ADMIN', { page: 'Projects' }), ctrl.create);
router.put('/:id', authorize('ADMIN', { page: 'Projects' }), ctrl.update);
router.delete('/:id', authorize('ADMIN', { page: 'Projects' }), ctrl.remove);

export default router;
