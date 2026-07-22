import { Router } from 'express';
import * as ctrl from '../controllers/vendor.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER', { page: 'Vendors' }));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/payments', ctrl.recordPayment);
router.delete('/:id', ctrl.remove);

export default router;
