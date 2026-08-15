import { Router } from 'express';
import * as supportController from '../controllers/support.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { Role } from '@prisma/client';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// SUPER_ADMIN creates a presentation session
router.post(
  '/start',
  authLimiter,
  authenticate,
  authorize(Role.SUPER_ADMIN),
  supportController.startPresentationSession
);

// Exchange code for cookie (Public endpoint, but requires valid exchange code)
router.post('/exchange', authLimiter, supportController.exchangePresentationCode);

// Revoke session
router.post(
  '/revoke',
  authenticate,
  authorize(Role.SUPER_ADMIN),
  supportController.revokePresentationSession
);

// Optional: Super Admin dedicated login endpoint
router.post('/login', authLimiter, supportController.superAdminLogin);

export default router;
