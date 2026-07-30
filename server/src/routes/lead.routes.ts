import { Router } from 'express';
import * as ctrl from '../controllers/lead.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'ACCOUNTANT', { page: 'Leads' }));

router.get('/', ctrl.list);
router.get('/export', ctrl.exportLeads);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.post('/:id/convert', ctrl.convertToClient);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.remove);

export default router;
