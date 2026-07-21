import { Router } from 'express';
import * as ctrl from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Daily reports and leaves
router.get('/reports/daily', ctrl.listDailyReports);
router.post('/reports/daily', ctrl.createDailyReport);
router.post('/leaves', ctrl.requestLeave);

// Salary Routes
router.get('/salaries/all', authorize('ADMIN', 'ACCOUNTANT', { page: 'Employees' }), ctrl.listSalaries);
router.post('/salaries/pay', authorize('ADMIN', 'ACCOUNTANT', { page: 'Employees' }), ctrl.paySalary);

// Admin/Accountant employee management
router.get('/', authorize('ADMIN', 'ACCOUNTANT', { page: 'Employees' }), ctrl.list);
router.post('/', authorize('ADMIN', { page: 'Employees' }), ctrl.create);
router.post('/temp-admin', authorize('ADMIN', { page: 'Employees' }), ctrl.grantTempAdmin);

// ID-based routes (MUST BE LAST)
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', { page: 'Employees' }), ctrl.getById);
router.put('/:id', authorize('ADMIN', { page: 'Employees' }), ctrl.update);
router.patch('/leaves/:id/status', authorize('ADMIN', { page: 'Employees' }), ctrl.updateLeaveStatus);
router.get('/:id/attendance', authorize('ADMIN', 'ACCOUNTANT', { page: 'Employees' }), ctrl.getAttendance);

export default router;
