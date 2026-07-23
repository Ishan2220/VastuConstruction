import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// Only ADMIN and ACCOUNTANT get full access. ENGINEER gets limited view.
router.get('/history', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), paymentController.getPaymentHistory);
router.get('/summary', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), paymentController.getPaymentSummary);

export default router;
