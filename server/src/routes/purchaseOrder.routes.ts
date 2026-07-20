import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrderStatus, archivePurchaseOrder } from '../controllers/purchaseOrder.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getPurchaseOrders));
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getPurchaseOrderById));
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(createPurchaseOrder));
router.patch('/:id/status', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(updatePurchaseOrderStatus));
router.delete('/:id/archive', authorize('ADMIN'), asyncHandler(archivePurchaseOrder));

export default router;
