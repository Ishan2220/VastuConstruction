import { Router } from 'express';
import * as ctrl from '../controllers/materialOrder.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ENGINEER', { page: 'Materials' }));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/receive', ctrl.receive);
router.delete('/:id', ctrl.remove);

export default router;
