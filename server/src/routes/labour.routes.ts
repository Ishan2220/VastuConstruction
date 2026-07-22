import { Router } from 'express';
import * as ctrl from '../controllers/labour.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER', { page: 'Labour' }));

router.get('/', ctrl.list);
router.get('/attendance', ctrl.getAttendanceByDate);
router.post('/attendance', ctrl.recordAttendance);
router.post('/payments', ctrl.recordPayment);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
