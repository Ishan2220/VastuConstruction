import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import * as attendanceController from '../controllers/attendance.controller.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'ACCOUNTANT'), attendanceController.listAttendance);
router.post('/mark', authenticate, authorize('ADMIN', 'ACCOUNTANT'), attendanceController.markAttendance);

export default router;
