import { Router } from 'express';
import * as ctrl from '../controllers/material.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ENGINEER', { page: 'Materials' }));

router.get('/', ctrl.list);
router.get('/stock', ctrl.getStock);
router.put('/stock/:id', ctrl.updateStock);
router.delete('/stock/:id', ctrl.removeStock);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
