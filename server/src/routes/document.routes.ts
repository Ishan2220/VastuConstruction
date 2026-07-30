import { Router } from 'express';
import * as ctrl from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';

import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
