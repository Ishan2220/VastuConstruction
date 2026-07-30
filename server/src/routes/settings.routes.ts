import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT'), ctrl.getSettings);
router.put('/', authorize('ADMIN'), ctrl.updateSettings);

export default router;
