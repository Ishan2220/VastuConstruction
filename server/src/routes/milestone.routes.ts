import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getMilestones, createMilestone, updateMilestone, deleteMilestone } from '../controllers/milestone.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getMilestones));
router.post('/', authorize('ADMIN', 'ENGINEER'), asyncHandler(createMilestone));
router.put('/:id', authorize('ADMIN', 'ENGINEER'), asyncHandler(updateMilestone));
router.delete('/:id', authorize('ADMIN'), asyncHandler(deleteMilestone));

export default router;
