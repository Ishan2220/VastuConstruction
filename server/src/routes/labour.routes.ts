import { Router } from 'express';
import * as ctrl from '../controllers/labour.controller.js';
import * as vendorAttendanceCtrl from '../controllers/vendorAttendance.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER', { page: 'Labour' }));

router.get('/vendor-attendance', vendorAttendanceCtrl.getVendorAttendance);
router.post('/vendor-attendance', vendorAttendanceCtrl.submitVendorAttendance);

router.get('/', ctrl.list);
router.post('/payments', ctrl.recordPayment);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
