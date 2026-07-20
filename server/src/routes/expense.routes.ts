import { Router } from 'express';
import * as ctrl from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Engineer can create site expenses, but only Admin/Accountant can view full list or delete
router.get('/', authorize('ADMIN', 'ACCOUNTANT', { page: 'Expenses' }), ctrl.list);
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', { page: 'Expenses' }), ctrl.getById);
router.post('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER', { page: 'Expenses' }), ctrl.create);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT', { page: 'Expenses' }), ctrl.remove);

export default router;
