import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getActivities } from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getActivities));

export default router;
