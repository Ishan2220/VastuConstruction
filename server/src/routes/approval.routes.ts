import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getApprovalRequests, createApprovalRequest, actionApprovalStep } from '../controllers/approval.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getApprovalRequests));
router.post('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(createApprovalRequest));
router.post('/step/:stepId/action', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(actionApprovalStep));

export default router;
