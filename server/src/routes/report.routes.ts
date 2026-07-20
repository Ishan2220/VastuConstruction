import { Router } from 'express';
import * as ctrl from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', { page: 'Reports' }));

router.get('/financial', ctrl.getFinancialSummary);
router.get('/projects', ctrl.getProjectReport);

export default router;
