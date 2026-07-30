import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import * as payrollController from '../controllers/payroll.controller.js';

const router = Router();

router.use(authenticate);

// Settings
router.get('/settings', authorize('ADMIN', 'ACCOUNTANT'), payrollController.getSettings);
router.put('/settings', authorize('ADMIN'), payrollController.updateSettings);

// Engine
router.get('/', authorize('ADMIN', 'ACCOUNTANT'), payrollController.listPayrolls);
router.get('/logs', authorize('ADMIN', 'ACCOUNTANT'), payrollController.getDailyLogs);
router.post('/generate', authorize('ADMIN', 'ACCOUNTANT'), payrollController.generatePayroll);
router.post('/:id/approve', authorize('ADMIN', 'ACCOUNTANT'), payrollController.approvePayroll);
router.post('/:id/pay', authorize('ADMIN', 'ACCOUNTANT'), payrollController.payPayroll);
router.post('/:id/freeze', authorize('ADMIN'), payrollController.freezePayroll);
router.post('/:id/reopen', authorize('ADMIN'), payrollController.reopenPayroll);
router.post('/:id/adjust', authorize('ADMIN', 'ACCOUNTANT'), payrollController.addAdjustment);
router.delete('/:id', authorize('ADMIN'), payrollController.deletePayroll);

export default router;
