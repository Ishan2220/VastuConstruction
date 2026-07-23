import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', { page: 'Settings' }));

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'ENGINEER']),
    isActive: z.boolean().optional(),
  }),
});

const updateEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

router.get('/', userController.listUsers);
const tempAdminSchema = z.object({
  body: z.object({
    pages: z.array(z.string()),
    durationHours: z.number().min(1).max(72),
  }),
});

router.post('/', validate(createUserSchema), userController.createUser);
router.put('/:id/email', validate(updateEmailSchema), userController.updateUserEmail);
router.put('/:id/reset-password', validate(resetPasswordSchema), userController.resetUserPassword);
router.put('/:id/temp-admin', validate(tempAdminSchema), userController.grantTempAdmin);
router.delete('/:id', userController.deleteUser);

export default router;
