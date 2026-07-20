import { Router } from 'express';
import * as ctrl from '../controllers/bankAccount.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', { page: 'Accounts' }));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
