import { Router } from 'express';
import * as ctrl from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'ENGINEER', 'ACCOUNTANT', { page: 'Attendance' }), ctrl.getByDate);
router.put('/', authorize('ADMIN', 'ENGINEER', { page: 'Attendance' }), ctrl.upsertOne);
router.put('/bulk', authorize('ADMIN', 'ENGINEER', { page: 'Attendance' }), ctrl.bulkUpdate);
router.get('/calendar-summary', authorize('ADMIN', 'ENGINEER', 'ACCOUNTANT', { page: 'Attendance' }), ctrl.calendarSummary);

export default router;
