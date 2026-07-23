import { Router } from 'express';
import * as ctrl from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', { page: 'Audit Logs' }));

router.get('/', ctrl.list);

export default router;
