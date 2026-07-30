import { Router } from 'express';
import * as siteMaterialController from '../controllers/siteMaterial.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', siteMaterialController.getSiteMaterialsSummary);
router.post('/receive', siteMaterialController.receiveMaterial);
router.post('/consume', siteMaterialController.consumeMaterial);
router.get('/:materialId/history', siteMaterialController.getMaterialHistory);

export default router;
