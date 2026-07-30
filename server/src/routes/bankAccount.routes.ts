import { Router } from 'express';
import * as ctrl from '../controllers/bankAccount.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Publicly readable (for dropdowns when logging expenses/incomes)
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

// Restricted to Admin/Accountant
router.post('/', authorize('ADMIN', 'ACCOUNTANT', { page: 'Accounts' }), ctrl.create);
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT', { page: 'Accounts' }), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT', { page: 'Accounts' }), ctrl.remove);
router.post('/:id/reconcile', authorize('ADMIN', 'ACCOUNTANT', { page: 'Accounts' }), ctrl.reconcile);

export default router;
